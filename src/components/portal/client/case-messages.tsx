"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { timeAgo } from "@/lib/money";
import { useT } from "@/lib/i18n/provider";
import type { MessageItem } from "./types";

/**
 * پیام‌رسان موکل و وکیل — چت ساده.
 * تحویل زنده با SSE (/api/portal/cases/[id]/events/stream):
 *  event message → پیام تازه (هر ۲.۵ ثانیه چک سمت سرور)
 * خطای اتصال → بازگشت شفاف به polling قدیمی (هر ۵ ثانیه).
 * حباب‌های پیام خودِ کاربر سمت راست و پیام‌های طرف مقابل سمت چپ قرار می‌گیرند.
 */
export default function CaseMessages({
  caseId,
  viewerRole,
  initialMessages,
}: {
  caseId: number;
  viewerRole: string;
  initialMessages: MessageItem[];
}) {
  const t = useT();
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [live, setLive] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);
  const lastIdRef = useRef<number>(initialMessages.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0));

  const isOwn = (m: MessageItem) =>
    m.senderRole === viewerRole || (viewerRole !== "client" && m.senderRole !== "client");

  const mergeMessages = useCallback((incoming: MessageItem[]) => {
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      if (!fresh.length) return prev;
      lastIdRef.current = fresh.reduce((m, x) => Math.max(m, Number(x.id) || 0), lastIdRef.current);
      return [...prev, ...fresh].sort((a, b) => Number(a.id) - Number(b.id));
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/cases/${caseId}/messages`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { ok?: boolean; messages?: MessageItem[] };
      if (data?.ok && Array.isArray(data.messages)) {
        setMessages(data.messages);
        lastIdRef.current = data.messages.reduce((m, x) => Math.max(m, Number(x.id) || 0), lastIdRef.current);
      }
    } catch {
      /* بی‌صدا — دادهٔ اولیهٔ سرور روی صفحه می‌ماند */
    }
  }, [caseId]);

  /* SSE زنده + fallback شفاف به polling قدیمی (۵ ثانیه) */
  useEffect(() => {
    let es: EventSource | null = null;
    let pollIv: ReturnType<typeof setInterval> | null = null;
    let retryT: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const startPolling = () => {
      if (disposed || pollIv) return;
      setLive(false);
      pollIv = setInterval(() => void load(), 5000);
    };
    const stopPolling = () => {
      if (pollIv) {
        clearInterval(pollIv);
        pollIv = null;
      }
    };
    const startSse = () => {
      if (disposed) return;
      try {
        es = new EventSource(`/api/portal/cases/${caseId}/events/stream`);
      } catch {
        startPolling();
        return;
      }
      es.addEventListener("message", (ev) => {
        try {
          const row = JSON.parse((ev as MessageEvent<string>).data) as MessageItem;
          if (!row || typeof row.id !== "number") return;
          mergeMessages([row]);
        } catch {
          /* ردیف نامعتبر — نادیده */
        }
      });
      es.onopen = () => {
        if (!disposed) {
          setLive(true);
          stopPolling();
        }
      };
      es.onerror = () => {
        // CLOSED → خطای قطعی (401/429/…) → polling + تلاش مجدد SSE بعداً
        // CONNECTING → مرورگر خودش reconnect می‌کند؛ دست نمی‌زنیم
        if (es && es.readyState === EventSource.CLOSED) {
          es = null;
          startPolling();
          retryT = setTimeout(() => {
            if (disposed) return;
            stopPolling();
            startSse();
          }, 60_000);
        }
      };
    };

    queueMicrotask(() => void load());
    startSse();
    return () => {
      disposed = true;
      es?.close();
      stopPolling();
      if (retryT) clearTimeout(retryT);
    };
  }, [caseId, load, mergeMessages]);

  /* اسکرول خودکار فقط وقتی کاربر نزدیک پایین است */
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !nearBottomRef.current) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);

  const send = async () => {
    const value = body.trim();
    if (!value || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/portal/cases/${caseId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: value }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? t("ارسال پیام ناموفق بود."));
      } else {
        setBody("");
        await load();
      }
    } catch {
      setError(t("خطا در ارتباط با سرور."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div
        ref={scrollerRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
        className="max-h-96 min-h-[280px] space-y-3 overflow-y-auto rounded-2xl border border-border bg-surface-2/40 p-4"
      >
        {messages.length === 0 && (
          <p className="p-6 text-center text-sm text-muted">
            {t("هنوز پیامی رد و بدل نشده است. اولین پیام را برای وکیل خود بنویسید.")}
          </p>
        )}
        {messages.map((m) => {
          const own = isOwn(m);
          return (
            <div key={m.id} className={`flex ${own ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${
                  own
                    ? "rounded-tl-md bg-primary text-primary-foreground shadow-sm"
                    : "rounded-tr-md border border-border bg-surface text-foreground shadow-sm"
                }`}
              >
                <div className={`mb-1 flex items-center gap-2 text-[11px] font-semibold ${own ? "text-primary-foreground/75" : "text-muted"}`}>
                  <Icon name={own ? "user" : "gavel"} className="h-3 w-3" />
                  <span>{m.senderName || (own ? t("شما") : t("طرف پرونده"))}</span>
                  <span className="font-normal opacity-70">{timeAgo(m.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-danger">
          <Icon name="alert" className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <div className="mt-3 flex items-end gap-2">
        <label htmlFor="dp-msg-body" className="sr-only">
          {t("متن پیام")}
        </label>
        <textarea
          id="dp-msg-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder={t("پیام خود را بنویسید… (Enter برای ارسال)")}
          className="min-h-11 flex-1 resize-none rounded-xl border border-border-strong bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !body.trim()}
          className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-hover disabled:opacity-50"
          aria-label={t("ارسال پیام")}
        >
          <Icon name="send" className="h-4 w-4" />
          <span className="hidden sm:inline">{sending ? t("در حال ارسال…") : t("ارسال")}</span>
        </button>
      </div>

      <p className="mt-2 flex items-center justify-between text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <Icon name="lock" className="h-3 w-3 text-success" /> {t("گفتگوی امن؛ فقط طرفین پرونده دسترسی دارند.")}
        </span>
        {live ? (
          <span data-testid="case-live" className="flex items-center gap-1 font-semibold text-success">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            {t("زنده")}
          </span>
        ) : (
          <span>{t("بروزرسانی خودکار هر ۵ ثانیه")}</span>
        )}
      </p>
    </div>
  );
}
