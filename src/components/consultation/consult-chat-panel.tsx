"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { formatJalaliTime } from "@/lib/jalali";
import { faNum } from "@/lib/data";
import { trackEvent } from "@/lib/analytics";
import { ConsultationClient } from "@/components/consultation-client";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

/**
 * پنل گفتگوی متنی موکل ↔ وکیل — بدون WebSocket (HTTP polling روی دیتابیس، سازگار با Vercel).
 *
 * - نقش client: موکل از فهرست وکلا وکیل را انتخاب کرده و گفتگو را شروع می‌کند.
 *   پیام‌ها حتی وقتی وکیل آفلاین است ذخیره می‌شوند و در پنل وکیل خوانده می‌شوند.
 * - نقش lawyer: وکیل از صندوق پیام‌های پنل خود (/consultation/live) گفتگو را باز می‌کند.
 *
 * تاریخچه و پیام‌های تازه با GET ?roomId&since و ارسال با POST انجام می‌شود.
 *
 * تماس صوتی/تصویری (همان پنل، هر دو نقش):
 *  دعوت (call_invite) روی اتاق مشاوره → زنگ → پذیرش/رد (call_accept/call_reject)
 *  → WebRTC روی اتاق جداگانهٔ call-xxxx (ConsultationClient) → پایان (call_end روی هر دو اتاق).
 *  سیگنالینگ از همان /api/consultations/signal است (poll هر ۲ ثانیه) — سازگار با Vercel.
 */

export interface ChatLawyerInfo {
  slug: string;
  name: string;
  avatarColor: string;
  photoUrl?: string | null;
  city?: string;
}

interface ChatMsg {
  id: number;
  sender: string;
  name: string;
  body: string;
  createdAt: string;
}

const NAME_KEY = "dadban:consult:name";
const ROOM_KEY_PREFIX = "dadban:consult:room:";
const POLL_MS = 2_000;
const SIGNAL_POLL_MS = 2_000;
const CALL_TIMEOUT_MS = 60_000; // بی‌پاسخی تماس‌گیرنده
const RING_AUTO_DISMISS_MS = 60_000; // زنگ بی‌پاسخ سمت گیرنده
const NOTE_TTL_MS = 8_000;

type CallMode = "voice" | "video";
type CallPhase = "idle" | "waiting" | "active";

/** بار سیگنال‌های call_* روی اتاق مشاوره */
interface CallPayload {
  callRoom: string;
  mode?: CallMode;
  from?: "client" | "lawyer";
  name?: string;
  duration?: number;
  reason?: string;
}

interface SignalRow {
  id: number;
  clientId: string;
  sender: string;
  kind: string;
  payload: unknown;
  at: string;
}

function newRoomId(slug: string) {
  // entropy بالا (رمزنگارانه) — roomId قابل حدس نباشد چون polling اتاق برای موکل عمومی است
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes).map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12);
  return `consult-${slug}-${rand}`.slice(0, 60);
}

/** شناسهٔ اتاق تماس — call- + ۱۲ کاراکتر base36 (رمزنگارانه) */
function newCallRoom() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `call-${Array.from(bytes).map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12)}`.slice(0, 60);
}

/** mm:ss با ارقام فارسی */
function fmtDur(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return faNum(`${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`);
}

/** آیکن قطع تماس — در مجموعهٔ آیکن‌های برند موجود نیست (همان مسیر گوشیِ رو‌به‌پایین) */
function HangupIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden focusable="false">
      <path d="M12 9c-1.6 0-3.15.25-4.6.7v3.42c0 .4-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9V9.7C15.15 9.25 13.6 9 12 9z" />
    </svg>
  );
}

export function ConsultChatPanel({
  lawyer,
  role,
  /** فقط برای نقش وکیل — اتاقی که از صندوق پیام باز شده */
  initialRoomId,
  clientDisplayName,
  onClose,
}: {
  lawyer: ChatLawyerInfo;
  role: "client" | "lawyer";
  initialRoomId?: string;
  clientDisplayName?: string;
  onClose: () => void;
}) {
  const t = useT();
  const tf = templateT(t);
  const isClient = role === "client";
  const [name, setName] = useState<string>(() => {
    /* پنل فقط پس از کلیک کاربر mount می‌شود؛ پس خواندن localStorage در init امن است */
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(NAME_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [roomId, setRoomId] = useState<string | null>(initialRoomId ?? null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lawyerOnline, setLawyerOnline] = useState<boolean | null>(null);
  const lastIdRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /* ─── تماس صوتی/تصویری ─── */
  const [callPhase, setCallPhaseState] = useState<CallPhase>("idle");
  const [callMode, setCallMode] = useState<CallMode>("video");
  const [callRoom, setCallRoomState] = useState<string | null>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [ringing, setRinging] = useState<(CallPayload & { at: string }) | null>(null);
  const [callNote, setCallNote] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<CallMode | null>(null);
  const [callPeerLabel, setCallPeerLabel] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const phaseRef = useRef<CallPhase>("idle");
  const callRoomRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastSignalIdRef = useRef(0);
  const clientIdRef = useRef("");
  const myNameRef = useRef(isClient ? name.trim() || "کاربر" : lawyer.name);
  const roomIdRef = useRef<string | null>(initialRoomId ?? null);
  const callTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myName = isClient ? name.trim() || "کاربر" : lawyer.name;
  const headerTitle = isClient ? lawyer.name : clientDisplayName ?? t("گفتگو با موکل");

  const setPhase = useCallback((p: CallPhase) => {
    phaseRef.current = p;
    setCallPhaseState(p);
  }, []);
  const setCallRoomBoth = useCallback((r: string | null) => {
    callRoomRef.current = r;
    setCallRoomState(r);
  }, []);

  /* آینه‌های ref برای cleanup و callbackهای پایدار */
  useEffect(() => {
    myNameRef.current = myName;
  }, [myName]);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const showCallNote = useCallback((msg: string) => {
    setCallNote(msg);
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(() => setCallNote(null), NOTE_TTL_MS);
  }, []);

  const clearCallTimers = useCallback(() => {
    for (const t of callTimersRef.current) clearTimeout(t);
    callTimersRef.current = [];
  }, []);

  const sendSignal = useCallback((room: string, kind: string, payload: unknown) => {
    if (!room) return;
    fetch("/api/consultations/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, clientId: clientIdRef.current, sender: myNameRef.current, kind, payload }),
      keepalive: kind === "call_end",
    }).catch(() => {});
  }, []);

  /* فوکوس‌مدیریتی مودال (الگوی Intopia): فوکوس اولیه + Escape + بازگشت فوکوس */
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  /* وضعیت آنلاین بودن وکیل — poll هر ۲۰ ثانیه */
  useEffect(() => {
    let alive = true;
    const check = () => {
      fetch("/api/lawyers/presence")
        .then((r) => r.json())
        .then((d) => {
          if (alive && d.ok) setLawyerOnline((d.online as string[]).includes(lawyer.slug));
        })
        .catch(() => {});
    };
    check();
    const t = setInterval(check, 20_000);
    return () => { alive = false; clearInterval(t); };
  }, [lawyer.slug]);

  const poll = useCallback(() => {
    if (!roomId) return;
    fetch(`/api/consultation/chat?roomId=${encodeURIComponent(roomId)}&since=${lastIdRef.current}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok || !Array.isArray(d.messages) || d.messages.length === 0) return;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const fresh = (d.messages as ChatMsg[]).filter((m) => !seen.has(m.id));
          if (fresh.length === 0) return prev;
          lastIdRef.current = Math.max(lastIdRef.current, ...fresh.map((m) => m.id));
          return [...prev, ...fresh];
        });
      })
      .catch(() => {});
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [roomId, poll]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  /* ─── سیگنال‌های تماس روی اتاق مشاوره — poll هر ۲ ثانیه (هر دو نقش) ─── */
  const handleCallSignal = useCallback(
    (s: SignalRow) => {
      if (s.kind !== "call_invite" && s.kind !== "call_accept" && s.kind !== "call_reject" && s.kind !== "call_end") return;
      const p = (s.payload && typeof s.payload === "object" ? s.payload : null) as CallPayload | null;
      const from = p?.from === "lawyer" ? "lawyer" : p?.from === "client" ? "client" : null;
      const pRoom = typeof p?.callRoom === "string" ? p.callRoom : "";
      const atMs = Date.parse(s.at);
      const fresh = Number.isFinite(atMs) ? Date.now() - atMs < 70_000 : false;

      if (s.kind === "call_invite") {
        if (!p || !pRoom || !from || from === role) return; // ناقص یا اکوی خودم
        if (!fresh) return; // دعوت کهنه هنگام بازگشایی پنل — زنگ نمی‌خورد
        if (phaseRef.current !== "idle" || callRoomRef.current) {
          // مشغول — رد خودکار تا طرف مقابل ۶۰ ثانیه منتظر نماند
          if (pRoom !== callRoomRef.current) {
            sendSignal(roomId ?? "", "call_reject", { callRoom: pRoom, mode: p.mode ?? "voice", from: role, name: myNameRef.current, reason: "busy" });
          }
          return;
        }
        setRinging({ callRoom: pRoom, mode: p.mode === "video" ? "video" : "voice", from, name: String(p.name ?? "").slice(0, 60) || "کاربر", at: s.at });
        return;
      }

      if (s.kind === "call_accept") {
        if (phaseRef.current === "waiting" && from !== role && pRoom && pRoom === callRoomRef.current) {
          clearCallTimers();
          setRinging(null);
          setPhase("active");
          startedAtRef.current = Date.now();
          elapsedRef.current = 0;
          setElapsed(0);
        }
        return;
      }

      if (s.kind === "call_reject") {
        if (phaseRef.current === "waiting" && from !== role && pRoom && pRoom === callRoomRef.current) {
          clearCallTimers();
          setPhase("idle");
          setCallRoomBoth(null);
          showCallNote(t("تماس رد شد"));
        }
        return;
      }

      /* call_end — پایان/لغو از طرف مقابل (هر فاز) */
      if (from === role) return;
      if (pRoom && callRoomRef.current && pRoom !== callRoomRef.current) return; // تماس دیگری است
      const wasActive = phaseRef.current === "active";
      const dur = wasActive ? elapsedRef.current : 0;
      clearCallTimers();
      setRinging(null);
      setPhase("idle");
      setCallRoomBoth(null);
      if (wasActive) showCallNote(tf("تماس پایان یافت — مدت: {dur}", { dur: fmtDur(dur) }));
    },
    [role, roomId, sendSignal, setPhase, setCallRoomBoth, showCallNote, clearCallTimers, t, tf],
  );

  useEffect(() => {
    if (!roomId) return;
    if (!clientIdRef.current) {
      clientIdRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `pc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    let alive = true;
    const pollSignals = async () => {
      try {
        const res = await fetch(`/api/consultations/signal?room=${encodeURIComponent(roomId)}&since=${lastSignalIdRef.current}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const d = (await res.json()) as { ok?: boolean; signals?: SignalRow[] };
        if (!d.ok || !Array.isArray(d.signals)) return;
        for (const s of d.signals) {
          if (s.id > lastSignalIdRef.current) lastSignalIdRef.current = s.id;
          if (alive) handleCallSignal(s);
        }
      } catch {
        /* خطای شبکه — چرخهٔ بعدی */
      }
    };
    void pollSignals();
    const t = setInterval(() => void pollSignals(), SIGNAL_POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [roomId, handleCallSignal]);

  /* ─── اقدامات تماس ─── */
  const doInvite = useCallback(
    (mode: CallMode) => {
      if (!roomId) return;
      const room = newCallRoom();
      setIsCaller(true);
      setCallMode(mode);
      setCallPeerLabel(headerTitle);
      setCallRoomBoth(room);
      setPhase("waiting");
      startedAtRef.current = 0;
      elapsedRef.current = 0;
      setElapsed(0);
      setRinging(null);
      sendSignal(roomId, "call_invite", { callRoom: room, mode, from: role, name: myNameRef.current });
      const timer = setTimeout(() => {
        if (phaseRef.current === "waiting" && callRoomRef.current === room) {
          sendSignal(roomId, "call_end", { callRoom: room, mode, from: role, name: myNameRef.current });
          sendSignal(room, "call_end", { callRoom: room, mode, from: role, name: myNameRef.current });
          setPhase("idle");
          setCallRoomBoth(null);
          showCallNote(t("پاسخی نبود"));
        }
      }, CALL_TIMEOUT_MS);
      callTimersRef.current.push(timer);
    },
    [roomId, role, headerTitle, sendSignal, setCallRoomBoth, setPhase, showCallNote, t],
  );

  const startCallInvite = useCallback(
    (mode: CallMode) => {
      if (!roomId) return;
      if (phaseRef.current !== "idle" || ringing) {
        setConfirmMode(mode); // تماس فعلی در جریان است → تأیید
        return;
      }
      doInvite(mode);
    },
    [roomId, ringing, doInvite],
  );

  /** پایان تماس جاری (در صورت وجود) + شروع تماس جدید */
  const acceptNewCall = useCallback(
    (mode: CallMode) => {
      setConfirmMode(null);
      if (ringing) {
        // زنگ ورودی را هم رد کن تا تماس‌گیرنده منتظر نماند
        sendSignal(roomId ?? "", "call_reject", { callRoom: ringing.callRoom, mode: ringing.mode ?? "voice", from: role, name: myNameRef.current, reason: "busy" });
      }
      if (phaseRef.current !== "idle" && roomId && callRoomRef.current) {
        const cr = callRoomRef.current;
        const dur = phaseRef.current === "active" ? elapsedRef.current : 0;
        sendSignal(roomId, "call_end", { callRoom: cr, mode: callMode, from: role, name: myNameRef.current, duration: dur });
        sendSignal(cr, "call_end", { callRoom: cr, mode: callMode, from: role, name: myNameRef.current, duration: dur });
      }
      clearCallTimers();
      setRinging(null);
      setPhase("idle");
      setCallRoomBoth(null);
      doInvite(mode);
    },
    [ringing, roomId, callMode, role, sendSignal, clearCallTimers, setPhase, setCallRoomBoth, doInvite],
  );

  const acceptCall = useCallback(() => {
    const r = ringing;
    if (!r) return;
    setRinging(null);
    clearCallTimers();
    setIsCaller(false);
    setCallMode(r.mode ?? "voice");
    setCallPeerLabel(r.name || headerTitle);
    setCallRoomBoth(r.callRoom);
    setPhase("active");
    startedAtRef.current = Date.now();
    elapsedRef.current = 0;
    setElapsed(0);
    sendSignal(roomId ?? "", "call_accept", { callRoom: r.callRoom, mode: r.mode ?? "voice", from: role, name: myNameRef.current });
  }, [ringing, roomId, role, headerTitle, sendSignal, setCallRoomBoth, setPhase, clearCallTimers]);

  const rejectCall = useCallback(() => {
    const r = ringing;
    if (!r) return;
    setRinging(null);
    sendSignal(roomId ?? "", "call_reject", { callRoom: r.callRoom, mode: r.mode ?? "voice", from: role, name: myNameRef.current, reason: "rejected" });
  }, [ringing, roomId, role, sendSignal]);

  /** پایان تماس از دکمهٔ خودم (فاز waiting = لغو، فاز active = قطع) */
  const endActiveCall = useCallback(() => {
    const wasActive = phaseRef.current === "active";
    const dur = wasActive ? elapsedRef.current : 0;
    const cr = callRoomRef.current;
    clearCallTimers();
    if (roomId && cr) {
      sendSignal(roomId, "call_end", { callRoom: cr, mode: callMode, from: role, name: myNameRef.current, duration: dur });
      sendSignal(cr, "call_end", { callRoom: cr, mode: callMode, from: role, name: myNameRef.current, duration: dur });
    }
    setRinging(null);
    setPhase("idle");
    setCallRoomBoth(null);
    showCallNote(wasActive ? tf("تماس پایان یافت — مدت: {dur}", { dur: fmtDur(dur) }) : t("تماس لغو شد"));
  }, [roomId, callMode, role, sendSignal, setCallRoomBoth, setPhase, showCallNote, clearCallTimers, t, tf]);

  /* زنگ بی‌پاسخ — ۶۰ ثانیه بعد خودکار جمع می‌شود (تماس‌گیرنده خودش timeout دارد) */
  useEffect(() => {
    if (!ringing) return;
    const timer = setTimeout(() => {
      setRinging(null);
      showCallNote(t("پاسخی داده نشد"));
    }, RING_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [ringing, showCallNote, t]);

  /* تایمر تماس فعال */
  useEffect(() => {
    if (callPhase !== "active") return;
    const t = setInterval(() => {
      const sec = startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : 0;
      elapsedRef.current = sec;
      setElapsed(sec);
    }, 1000);
    return () => clearInterval(t);
  }, [callPhase]);

  /* پاک‌سازی هنگام بستن پنل — اگر تماس در جریان بود، به طرف مقابل خبر بده */
  useEffect(() => {
    return () => {
      for (const t of callTimersRef.current) clearTimeout(t);
      callTimersRef.current = [];
      if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
      if (phaseRef.current !== "idle" && roomIdRef.current) {
        const cr = callRoomRef.current;
        try {
          void fetch("/api/consultations/signal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              room: roomIdRef.current,
              clientId: clientIdRef.current,
              sender: myNameRef.current,
              kind: "call_end",
              payload: { callRoom: cr, from: role, name: myNameRef.current },
            }),
            keepalive: true,
          });
        } catch {
          /* best-effort */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startChat = () => {
    const clean = name.trim();
    if (!clean) {
      setError(t("برای شروع گفتگو نام خود را وارد کنید."));
      return;
    }
    setError(null);
    try { localStorage.setItem(NAME_KEY, clean); } catch { /* private mode */ }
    if (isClient) trackEvent("consult_chat_started");
    /* ادامه‌ی گفتگوی قبلی با همین وکیل (اگر وجود داشته باشد) — نه اتاق جدید */
    let rid: string | null = null;
    try { rid = localStorage.getItem(ROOM_KEY_PREFIX + lawyer.slug); } catch { /* private mode */ }
    if (!rid) {
      rid = newRoomId(lawyer.slug);
      try { localStorage.setItem(ROOM_KEY_PREFIX + lawyer.slug, rid); } catch { /* private mode */ }
    }
    setRoomId(rid);
  };

  const send = async () => {
    const body = input.trim();
    if (!body || !roomId || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/consultation/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          lawyerSlug: lawyer.slug,
          sender: isClient ? "client" : "lawyer",
          name: isClient ? name.trim() : lawyer.name,
          body,
        }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error ?? "ارسال پیام انجام نشد.");
      const msg = d.message as ChatMsg;
      setInput("");
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      lastIdRef.current = Math.max(lastIdRef.current, msg.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارسال پیام انجام نشد.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tf("گفتگو با {name}", { name: headerTitle })}
        className="relative flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-2xl sm:h-auto sm:max-h-[80vh] sm:max-w-lg sm:rounded-3xl"
      >
        {/* هدر */}
        <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
          {lawyer.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lawyer.photoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <Avatar name={lawyer.name} color={lawyer.avatarColor} size="sm" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{headerTitle}</p>
            {isClient && (
              <p className="text-[11px] text-muted">
                {lawyerOnline == null
                  ? t("در حال بررسی وضعیت…")
                  : lawyerOnline
                    ? t("وکیل آنلاین است — معمولاً بلافاصله پاسخ می‌دهد")
                    : t("وکیل فعلاً آفلاین است — پیام شما ذخیره می‌شود")}
              </p>
            )}
            {!isClient && <p className="text-[11px] text-muted">{t("پاسخ به موکل")}</p>}
          </div>
          {lawyerOnline != null && isClient && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                lawyerOnline
                  ? "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-success"
                  : "bg-surface-2 text-muted"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${lawyerOnline ? "bg-success" : "bg-border-strong"}`} />
              {lawyerOnline ? t("آنلاین") : t("آفلاین")}
            </span>
          )}
          {roomId && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                data-testid="call-voice-btn"
                onClick={() => startCallInvite("voice")}
                disabled={!!confirmMode}
                aria-label={t("تماس صوتی")}
                title={t("تماس صوتی")}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
              >
                <Icon name="phone" className="h-5 w-5" />
              </button>
              <button
                type="button"
                data-testid="call-video-btn"
                onClick={() => startCallInvite("video")}
                disabled={!!confirmMode}
                aria-label={t("تماس تصویری")}
                title={t("تماس تصویری")}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
              >
                <Icon name="video" className="h-5 w-5" />
              </button>
            </div>
          )}
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label={t("بستن گفتگو")}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {/* بدنه */}
        {!roomId ? (
          /* گام نام — شروع گفتگو بدون ثبت‌نام */
          <div className="flex flex-1 flex-col justify-center gap-4 p-6">
            <div className="text-center">
              <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Icon name="chat" className="h-7 w-7" />
              </span>
              <h3 className="text-base font-bold text-foreground">{tf("گفتگوی متنی با {name}", { name: lawyer.name })}</h3>
              <p className="mt-1.5 text-xs leading-6 text-muted">
                {t("نام خود را وارد کنید و سؤال حقوقی‌تان را بنویسید؛ پیام‌ها محرمانه می‌مانند و")}
                {lawyerOnline === false ? t(" پس از آنلاین شدن وکیل") : ""}
                {t(" در همین گفتگو پاسخ می‌گیرید.")}
              </p>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">{t("نام شما")}</span>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") startChat(); }}
                placeholder="مثلاً: علی رضایی"
                className="h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                maxLength={60}
              />
            </label>
            {error && (
              <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                {t(error)}
              </p>
            )}
            <Button onClick={startChat} icon="chat" className="w-full">
              {t("شروع گفتگو")}
            </Button>
            <p className="text-center text-[11px] leading-5 text-muted">
              {t("گفتگو مخصوص همین مشاوره است؛ طبق سیاست حریم خصوصی، اطلاعات شما در اختیار هیچ شخص ثالثی قرار نمی‌گیرد.")}
            </p>
          </div>
        ) : callPhase !== "idle" ? (
          /* ─── نمای تماس (انتظار یا فعال) ─── */
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* هدر تماس */}
            <div className="flex items-center justify-between gap-2 border-b border-border bg-surface px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    callPhase === "active" ? "bg-success/15 text-success" : "bg-primary-soft text-primary"
                  }`}
                >
                  <Icon name={callMode === "video" ? "video" : "phone"} className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{callPeerLabel || headerTitle}</p>
                  <p className="text-[11px] text-muted">
                    {callPhase === "waiting" ? t("در حال زنگ زدن…") : callMode === "video" ? t("تماس تصویری") : t("تماس صوتی")}
                  </p>
                </div>
              </div>
              {callPhase === "active" && (
                <span
                  data-testid="call-timer"
                  dir="ltr"
                  className="tnum shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-foreground"
                >
                  {fmtDur(elapsed)}
                </span>
              )}
              <button
                type="button"
                data-testid="call-end"
                onClick={endActiveCall}
                aria-label={t("پایان تماس")}
                className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-danger px-3.5 text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
              >
                <HangupIcon />
                {t("پایان تماس")}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {callPhase === "waiting" ? (
                <div className="flex h-full min-h-56 flex-col items-center justify-center gap-4 p-6 text-center">
                  <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" aria-hidden />
                    <Icon name={callMode === "video" ? "video" : "phone"} className="h-7 w-7" />
                  </span>
                  <p className="text-sm font-bold text-foreground">{t("در حال زنگ زدن…")}</p>
                  <p className="max-w-64 text-xs leading-6 text-muted">
                    {tf("تا {n} ثانیه منتظر پاسخ می‌مانیم؛ اگر پاسخی نبود، تماس خودکار پایان می‌یابد.", { n: faNum(60) })}
                  </p>
                </div>
              ) : callRoom ? (
                <div className="p-3">
                  <ConsultationClient
                    roomId={callRoom}
                    role={role}
                    name={myName}
                    autoOffer={isCaller}
                    voiceOnly={callMode === "voice"}
                    onHangup={endActiveCall}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            {/* پیام‌ها */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-surface-2/40 px-4 py-4" aria-live="polite">
              {messages.length === 0 && (
                <div className="mt-6 text-center">
                  <p className="text-xs leading-6 text-muted">
                    {t("گفتگو آغاز شد.")}
                    {isClient
                      ? t(" سؤال حقوقی‌تان را به‌طور خلاصه بنویسید تا وکیل پاسخ دهد.")
                      : t(" پیام موکل را ببینید و پاسخ دهید.")}
                  </p>
                </div>
              )}
              {messages.map((m) => {
                const own = isClient ? m.sender === "client" : m.sender === "lawyer";
                return (
                  <div key={m.id} className={`flex ${own ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm ${
                        own
                          ? "rounded-bl-md bg-primary text-primary-foreground"
                          : "rounded-br-md border border-border bg-surface text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${own ? "text-primary-foreground/70" : "text-muted"}`}>
                        {isClient && !own && m.name ? `${m.name} · ` : ""}
                        {formatJalaliTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {/* یادداشت تماس — «تماس رد شد» / «پاسخی نبود» / «تماس پایان یافت — مدت: mm:ss» */}
            {callNote && (
              <p
                role="status"
                data-testid="call-note"
                className="mx-4 mb-2 flex items-center gap-1.5 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs font-medium text-foreground-soft"
              >
                <Icon name="phone" className="h-3.5 w-3.5 shrink-0 text-primary" />
                {callNote}
              </p>
            )}

            {/* خطا */}
            {error && (
              <p role="alert" className="mx-4 mb-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                {t(error)}
              </p>
            )}

            {/* ورودی */}
            <div className="border-t border-border bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  placeholder={t("پیام خود را بنویسید…")}
                  className="h-11 flex-1 rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  maxLength={1000}
                  aria-label={t("متن پیام")}
                />
                <Button onClick={() => void send()} disabled={sending || !input.trim()} icon="send" aria-label={t("ارسال پیام")} className="shrink-0 px-4">
                  {t("ارسال")}
                </Button>
              </div>
              {isClient && lawyerOnline === false && (
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  <Icon name="clock" className="ml-0.5 inline h-3.5 w-3.5" /> {t("وکیل آفلاین است؛ پیام ذخیره می‌شود و به‌محض ورود وکیل به پنل، پاسخ می‌گیرید.")}
                </p>
              )}
            </div>
          </>
        )}

        {/* زنگ تماس ورودی — موبایل: باتم‌شیت، دسکتاپ: مودال مرکزی */}
        {ringing && (
          <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/60 backdrop-blur-[2px] sm:items-center sm:p-4">
            <div
              data-testid="call-ringing"
              role="alertdialog"
              aria-modal="true"
              aria-label={ringing.mode === "video" ? t("تماس تصویری ورودی") : t("تماس صوتی ورودی")}
              className="w-full rounded-t-3xl border border-border bg-surface p-5 shadow-2xl sm:max-w-sm sm:rounded-3xl"
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/15" aria-hidden />
                  <Icon name={ringing.mode === "video" ? "video" : "phone"} className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{ringing.name}</p>
                  <p className="text-xs text-muted">
                    {ringing.mode === "video" ? t("تماس تصویری ورودی…") : t("تماس صوتی ورودی…")}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="call-accept"
                  onClick={acceptCall}
                  aria-label={t("پذیرش تماس")}
                  className="inline-flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-success text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success"
                >
                  <Icon name="phone" className="h-4 w-4" />
                  {t("پذیرش")}
                </button>
                <button
                  type="button"
                  data-testid="call-reject"
                  onClick={rejectCall}
                  aria-label={t("رد تماس")}
                  className="inline-flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-danger text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                >
                  <HangupIcon />
                  {t("رد")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* تأیید شروع تماس جدید هنگام تماس فعال */}
        {confirmMode && (
          <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/60 backdrop-blur-[2px] sm:items-center sm:p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-label={t("شروع تماس جدید")}
              className="w-full rounded-t-3xl border border-border bg-surface p-5 shadow-2xl sm:max-w-sm sm:rounded-3xl"
            >
              <p className="text-sm font-bold text-foreground">{t("تماس جدیدی شروع می‌کنید؟")}</p>
              <p className="mt-1 text-xs leading-6 text-muted">
                {tf("تماس فعلی پایان می‌یابد و {mode} جدیدی برای طرف مقابل زنگ می‌خورد.", { mode: confirmMode === "video" ? "تماس تصویری" : "تماس صوتی" })}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => acceptNewCall(confirmMode)}
                  className="h-11 cursor-pointer rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {t("پایان و تماس جدید")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmMode(null)}
                  className="h-11 cursor-pointer rounded-xl border border-border bg-surface text-sm font-bold text-foreground transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {t("انصراف")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
