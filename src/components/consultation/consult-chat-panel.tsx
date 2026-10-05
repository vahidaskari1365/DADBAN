"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { formatJalaliTime } from "@/lib/jalali";
import { faNum } from "@/lib/data";
import { trackEvent } from "@/lib/analytics";

/**
 * پنل گفتگوی متنی موکل ↔ وکیل — بدون WebSocket (HTTP polling روی دیتابیس، سازگار با Vercel).
 *
 * - نقش client: موکل از فهرست وکلا وکیل را انتخاب کرده و گفتگو را شروع می‌کند.
 *   پیام‌ها حتی وقتی وکیل آفلاین است ذخیره می‌شوند و در پنل وکیل خوانده می‌شوند.
 * - نقش lawyer: وکیل از صندوق پیام‌های پنل خود (/consultation/live) گفتگو را باز می‌کند.
 *
 * تاریخچه و پیام‌های تازه با GET ?roomId&since و ارسال با POST انجام می‌شود.
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
const POLL_MS = 2_000;

function newRoomId(slug: string) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `consult-${slug}-${rand}`.slice(0, 60);
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

  const startChat = () => {
    const clean = name.trim();
    if (!clean) {
      setError("برای شروع گفتگو نام خود را وارد کنید.");
      return;
    }
    setError(null);
    try { localStorage.setItem(NAME_KEY, clean); } catch { /* private mode */ }
    if (isClient) trackEvent("consult_chat_started");
    setRoomId(newRoomId(lawyer.slug));
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

  const headerTitle = isClient ? lawyer.name : clientDisplayName ?? "گفتگو با موکل";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`گفتگو با ${headerTitle}`}
        className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-2xl sm:h-auto sm:max-h-[80vh] sm:max-w-lg sm:rounded-3xl"
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
                  ? "در حال بررسی وضعیت…"
                  : lawyerOnline
                    ? "وکیل آنلاین است — معمولاً بلافاصله پاسخ می‌دهد"
                    : "وکیل فعلاً آفلاین است — پیام شما ذخیره می‌شود"}
              </p>
            )}
            {!isClient && <p className="text-[11px] text-muted">پاسخ به موکل</p>}
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
              {lawyerOnline ? "آنلاین" : "آفلاین"}
            </span>
          )}
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="بستن گفتگو"
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
              <h3 className="text-base font-bold text-foreground">گفتگوی متنی با {lawyer.name}</h3>
              <p className="mt-1.5 text-xs leading-6 text-muted">
                نام خود را وارد کنید و سؤال حقوقی‌تان را بنویسید؛ پیام‌ها محرمانه می‌مانند و
                {lawyerOnline === false ? " پس از آنلاین شدن وکیل" : ""} در همین گفتگو پاسخ می‌گیرید.
              </p>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">نام شما</span>
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
                {error}
              </p>
            )}
            <Button onClick={startChat} icon="chat" className="w-full">
              شروع گفتگو
            </Button>
            <p className="text-center text-[11px] leading-5 text-muted">
              گفتگو مخصوص همین مشاوره است؛ طبق سیاست حریم خصوصی، اطلاعات شما در اختیار هیچ شخص ثالثی قرار نمی‌گیرد.
            </p>
          </div>
        ) : (
          <>
            {/* پیام‌ها */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-surface-2/40 px-4 py-4" aria-live="polite">
              {messages.length === 0 && (
                <div className="mt-6 text-center">
                  <p className="text-xs leading-6 text-muted">
                    گفتگو آغاز شد.
                    {isClient
                      ? " سؤال حقوقی‌تان را به‌طور خلاصه بنویسید تا وکیل پاسخ دهد."
                      : " پیام موکل را ببینید و پاسخ دهید."}
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

            {/* خطا */}
            {error && (
              <p role="alert" className="mx-4 mb-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                {error}
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
                  placeholder="پیام خود را بنویسید…"
                  className="h-11 flex-1 rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  maxLength={1000}
                  aria-label="متن پیام"
                />
                <Button onClick={() => void send()} disabled={sending || !input.trim()} icon="send" aria-label="ارسال پیام" className="shrink-0 px-4">
                  ارسال
                </Button>
              </div>
              {isClient && lawyerOnline === false && (
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  <Icon name="clock" className="ml-0.5 inline h-3.5 w-3.5" /> وکیل آفلاین است؛ پیام ذخیره می‌شود و به‌محض ورود وکیل به پنل، پاسخ می‌گیرید.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
