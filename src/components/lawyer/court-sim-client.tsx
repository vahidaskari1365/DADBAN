"use client";

// ============================================================
// دادبان — شبیه‌سازی دادگاه (کلاینت)
// تنظیم سناریو (از پرونده یا موضوعی) → گفتگوی نوبتی با «قاضی» و
// «وکیل خصم» → پایان جلسه و بازخورد ۴بخشی. سقف ۲۰ نوبت.
// هشدار ثابت: تمرین است، نه پیش‌بینی نتیجهٔ دادگاه.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";
import { MAX_COURT_TURNS, COURT_DISCLAIMER, type CourtSpeaker } from "@/lib/court-sim";

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const inputCls =
  "w-full rounded-xl border border-border-strong bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";

export interface SimCaseOption {
  caseNumber: string;
  subject: string;
}

export interface SimMessage {
  speaker: CourtSpeaker | string;
  text: string;
  at?: string;
}

export interface PastSession {
  id: number;
  title: string;
  turns: number;
  status: string;
  createdAt: string;
  messages: SimMessage[];
  feedback: string;
}

const SPEAKER_META: Record<string, { label: string; icon: "gavel" | "balance" | "user" | "sparkles"; cls: string; bubble: string }> = {
  judge: {
    label: "قاضی",
    icon: "gavel",
    cls: "text-primary",
    bubble: "bg-primary-soft/50 border-primary/25",
  },
  opponent: {
    label: "وکیل خصم",
    icon: "balance",
    cls: "text-danger",
    bubble: "bg-[color-mix(in_oklab,var(--danger)_7%,transparent)] border-[color-mix(in_oklab,var(--danger)_25%,transparent)]",
  },
  lawyer: {
    label: "شما (وکیل)",
    icon: "user",
    cls: "text-accent-text",
    bubble: "bg-accent-soft border-accent/25",
  },
  system: {
    label: "سامانه",
    icon: "sparkles",
    cls: "text-foreground-soft",
    bubble: "bg-surface-2 border-border",
  },
};

export function CourtSimClient({
  cases,
  initialMessages,
  initialFeedback,
  initialSessionId,
  initialTurns,
  initialTitle,
}: {
  cases: SimCaseOption[];
  initialMessages: SimMessage[];
  initialFeedback: string;
  initialSessionId: number | null;
  initialTurns: number;
  initialTitle: string;
}) {
  const t = useT();
  const tt = templateT(t);

  const [mode, setMode] = useState<"case" | "topic">(initialSessionId ? "topic" : cases.length ? "case" : "topic");
  const [caseNumber, setCaseNumber] = useState(cases[0]?.caseNumber ?? "");
  const [topic, setTopic] = useState("");
  const [claim, setClaim] = useState("");
  const [side, setSide] = useState<"خواهان" | "خوانده">("خواهان");

  const [sessionId, setSessionId] = useState<number | null>(initialSessionId);
  const [title, setTitle] = useState(initialTitle);
  const [messages, setMessages] = useState<SimMessage[]>(initialMessages);
  const [turns, setTurns] = useState(initialTurns);
  const [feedback, setFeedback] = useState(initialFeedback);

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<"none" | "start" | "turn" | "end">("none");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* ---------- صدای قاضی (TTS) — با کش حافظه برای پخش مجدد بدون مصرف سهمیه ---------- */
  const [ttsState, setTtsState] = useState<{ idx: number; status: "loading" | "playing" } | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const ttsCacheRef = useRef<Map<string, string>>(new Map());

  function stopTts() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setTtsState(null);
  }

  useEffect(() => {
    return () => {
      // خروج از صفحه — توقف صدا و آزادسازی حافظه
      audioRef.current?.pause();
      audioRef.current = null;
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  async function speakJudge(idx: number, text: string) {
    // همان پیام در حال پخش — توقف
    if (ttsState?.idx === idx) {
      stopTts();
      return;
    }
    stopTts();
    setTtsError(null);
    const cacheKey = text.slice(0, 200);
    const cached = ttsCacheRef.current.get(cacheKey);
    if (cached) {
      playUrl(cached, idx);
      return;
    }
    setTtsState({ idx, status: "loading" });
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 1024) }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setTtsState(null);
        setTtsError(data?.error ?? t("تولید صدا در حال حاضر ممکن نیست."));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      ttsCacheRef.current.set(cacheKey, url);
      audioUrlRef.current = url;
      playUrl(url, idx);
    } catch {
      setTtsState(null);
      setTtsError(t("خطا در تولید صدا. لطفاً دوباره تلاش کنید."));
    }
  }

  function playUrl(url: string, idx: number) {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => {
      setTtsState(null);
    };
    audio.onerror = () => {
      setTtsState(null);
      setTtsError(t("پخش صدا ناموفق بود."));
    };
    setTtsState({ idx, status: "playing" });
    void audio.play().catch(() => {
      setTtsState(null);
      setTtsError(t("پخش صدا ناموفق بود."));
    });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, feedback]);

  const active = sessionId !== null && messages.length > 0 && !feedback;

  /* ---------- شروع جلسه ---------- */
  async function start() {
    if (mode === "case" && !caseNumber) return;
    if (mode === "topic" && topic.trim().length < 4) return;
    setBusy("start");
    setError(null);
    setFeedback("");
    try {
      const res = await fetch("/api/court-sim/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "case" ? { caseNumber, side } : { topic, claim, side }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; sessionId?: number; title?: string; messages?: SimMessage[]; error?: string }
        | null;
      if (!res.ok || !data?.ok || !data.sessionId) {
        setError(data?.error ?? t("شروع جلسه ناموفق بود."));
        return;
      }
      setSessionId(data.sessionId);
      setTitle(data.title ?? "");
      setMessages(data.messages ?? []);
      setTurns(0);
      setFeedback("");
    } catch {
      setError(t("خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید."));
    } finally {
      setBusy("none");
    }
  }

  /* ---------- نوبت وکیل ---------- */
  async function send() {
    const text = draft.trim();
    if (text.length < 2 || !sessionId || busy !== "none") return;
    setDraft("");
    setBusy("turn");
    setError(null);
    setMessages((m) => [...m, { speaker: "lawyer", text, at: new Date().toISOString() }]);
    try {
      const res = await fetch("/api/court-sim/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, text }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; messages?: SimMessage[]; turns?: number; error?: string }
        | null;
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? t("پاسخ جلسه دریافت نشد."));
        return;
      }
      if (data.messages?.length) setMessages((m) => [...m, ...data.messages!]);
      if (typeof data.turns === "number") setTurns(data.turns);
    } catch {
      setError(t("خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید."));
    } finally {
      setBusy("none");
    }
  }

  /* ---------- پایان جلسه و بازخورد ---------- */
  async function endSession() {
    if (!sessionId || busy !== "none") return;
    setBusy("end");
    setError(null);
    try {
      const res = await fetch("/api/court-sim/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; feedback?: string; note?: string; error?: string } | null;
      if (data?.feedback) setFeedback(data.feedback);
      else if (data?.note) setFeedback(data.note);
      else if (!res.ok || !data?.ok) setError(data?.error ?? t("ساخت بازخورد ناموفق بود."));
    } catch {
      setError(t("خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید."));
    } finally {
      setBusy("none");
    }
  }

  function reset() {
    setSessionId(null);
    setMessages([]);
    setFeedback("");
    setTurns(0);
    setTitle("");
    setError(null);
  }

  return (
    <div className="space-y-6" data-testid="court-sim">
      {/* هشدار همیشگی */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-50 px-3 py-2.5 text-[12.5px] leading-6 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-300">
        <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t(COURT_DISCLAIMER)}</span>
      </div>

      {/* تنظیم جلسه — فقط وقتی جلسه فعالی نیست */}
      {!sessionId && (
        <Card hover={false}>
          <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-foreground">
            <Icon name="gavel" className="h-5 w-5 text-primary" />
            {t("سناریوی تمرین")}
          </h3>
          <div className="mb-4 flex gap-2" role="tablist" aria-label={t("نوع سناریو")}>
            {cases.length > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={mode === "case"}
                onClick={() => setMode("case")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${mode === "case" ? "bg-primary text-primary-foreground shadow-sm" : "bg-surface-2 text-foreground-soft hover:text-foreground"}`}
              >
                {t("از پرونده‌های من")}
              </button>
            )}
            <button
              type="button"
              role="tab"
              aria-selected={mode === "topic"}
              onClick={() => setMode("topic")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${mode === "topic" ? "bg-primary text-primary-foreground shadow-sm" : "bg-surface-2 text-foreground-soft hover:text-foreground"}`}
            >
              {t("موضوع دلخواه")}
            </button>
          </div>

          {mode === "case" && cases.length > 0 ? (
            <div className="mb-3">
              <label className="mb-1.5 block text-[13px] font-semibold text-foreground" htmlFor="sim-case">
                {t("انتخاب پرونده")}
              </label>
              <select id="sim-case" className={inputCls + " h-11"} value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)}>
                {cases.map((c) => (
                  <option key={c.caseNumber} value={c.caseNumber}>
                    {c.subject} — {c.caseNumber}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mb-3 space-y-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-foreground" htmlFor="sim-topic">
                  {t("موضوع دعوا")}
                </label>
                <input
                  id="sim-topic"
                  className={inputCls + " h-11"}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value.slice(0, 300))}
                  placeholder={t("مثلاً: مطالبهٔ وجه چک برگشتی ۲۰۰ میلیونی")}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-foreground" htmlFor="sim-claim">
                  {t("شرح خواسته/دفاع و جزئیات کلیدی (اختیاری)")}
                </label>
                <textarea
                  id="sim-claim"
                  className={`${inputCls} min-h-24 resize-y`}
                  value={claim}
                  onChange={(e) => setClaim(e.target.value.slice(0, 1500))}
                  placeholder={t("وقایع اصلی، مدارک موجود، نکاتی که می‌خواهی درباره‌شان تمرین کنی…")}
                />
              </div>
            </div>
          )}

          <div className="mb-4 max-w-xs">
            <label className="mb-1.5 block text-[13px] font-semibold text-foreground" htmlFor="sim-side">
              {t("نقش شما")}
            </label>
            <select id="sim-side" className={inputCls + " h-11"} value={side} onChange={(e) => setSide(e.target.value === "خوانده" ? "خوانده" : "خواهان")}>
              <option value="خواهان">{t("وکیل خواهان")}</option>
              <option value="خوانده">{t("وکیل خوانده")}</option>
            </select>
          </div>

          <Button variant="accent" size="md" icon="gavel" onClick={start} disabled={busy !== "none"}>
            {busy === "start" ? <Spinner /> : <Icon name="gavel" className="h-4 w-4" />}
            {t("شروع جلسه — قاضی اولین سؤال را می‌پرسد")}
          </Button>
        </Card>
      )}

      {/* گفتگوی جلسه */}
      {sessionId && (
        <Card hover={false} className="border-primary/30">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
              <Icon name="gavel" className="h-5 w-5 text-primary" />
              {title || t("جلسهٔ تمرین")}
            </h3>
            <div className="flex items-center gap-2">
              <Badge tone="neutral">
                {tt("نوبت {n} از {m}", { n: String(turns), m: String(MAX_COURT_TURNS) })}
              </Badge>
              {active && (
                <Button size="sm" variant="soft" icon="check" onClick={endSession} disabled={busy !== "none"}>
                  {busy === "end" ? <Spinner /> : <Icon name="check" className="h-4 w-4" />}
                  {t("پایان جلسه و بازخورد")}
                </Button>
              )}
              <Button size="sm" variant="ghost" icon="plus" onClick={reset}>
                {t("جلسهٔ جدید")}
              </Button>
            </div>
          </div>

          {/* پیام‌ها */}
          <div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-xl bg-surface-2/40 p-3" data-testid="sim-messages">
            {messages.map((m, i) => {
              const meta = SPEAKER_META[String(m.speaker)] ?? SPEAKER_META.system;
              return (
                <div key={i} className={`flex gap-2 ${m.speaker === "lawyer" ? "flex-row-reverse" : ""}`}>
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background ${meta.cls}`}>
                    <Icon name={meta.icon} className="h-4 w-4" />
                  </span>
                  <div className={`max-w-[85%] rounded-2xl border px-3.5 py-2.5 ${meta.bubble}`}>
                    <div className={`mb-0.5 flex items-center gap-1.5 text-[11px] font-bold ${meta.cls}`}>
                      {t(meta.label)}
                      {String(m.speaker) === "judge" && (
                        <button
                          type="button"
                          onClick={() => void speakJudge(i, m.text)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-primary/10"
                          aria-label={ttsState?.idx === i ? t("توقف صدا") : t("پخش صدای قاضی")}
                          title={t("صدای قاضی")}
                          data-testid={`judge-tts-${i}`}
                        >
                          {ttsState?.idx === i && ttsState.status === "loading" ? (
                            <Spinner className="h-3.5 w-3.5" />
                          ) : ttsState?.idx === i && ttsState.status === "playing" ? (
                            <Icon name="volume-off" className="h-3.5 w-3.5" />
                          ) : (
                            <Icon name="volume" className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-[13px] leading-7 text-foreground">{m.text}</p>
                  </div>
                </div>
              );
            })}
            {busy === "turn" && (
              <div className="flex items-center gap-2 text-xs text-foreground-soft">
                <Spinner className="h-3.5 w-3.5" /> {t("دادگاه در حال بررسی پاسخ شما…")}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ورودی پاسخ */}
          {active && (
            <div className="mt-3 flex gap-2">
              <textarea
                className={`${inputCls} min-h-12 flex-1 resize-y py-2.5`}
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={t("پاسخ وکیل به قاضی… (Enter برای ارسال)")}
                aria-label={t("پاسخ وکیل")}
                disabled={busy !== "none"}
              />
              <Button size="md" icon="send" onClick={send} disabled={busy !== "none" || draft.trim().length < 2} aria-label={t("ارسال پاسخ")}>
                {busy === "turn" ? <Spinner /> : <Icon name="send" className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {turns >= MAX_COURT_TURNS && active && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              {t("سقف نوبت‌های این جلسه پر شد. با «پایان جلسه و بازخورد» جمع‌بندی کنید یا جلسهٔ تازه بسازید.")}
            </p>
          )}

          {ttsError && (
            <p role="status" className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              {ttsError}
            </p>
          )}
        </Card>
      )}

      {/* بازخورد */}
      {feedback && (
        <Card hover={false} className="border-accent/40 bg-accent-soft/20" data-testid="sim-feedback">
          <h3 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-foreground">
            <Icon name="sparkles" className="h-5 w-5 text-accent-text" />
            {t("بازخورد جلسهٔ تمرین")}
          </h3>
          <div className="whitespace-pre-wrap text-[13.5px] leading-8 text-foreground">{feedback}</div>
        </Card>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
