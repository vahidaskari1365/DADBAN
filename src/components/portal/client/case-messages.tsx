"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { timeAgo } from "@/lib/money";
import type { MessageItem } from "./types";

/**
 * پیام‌رسان موکل و وکیل — چت ساده با polling هر ۵ ثانیه.
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
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);

  const isOwn = (m: MessageItem) =>
    m.senderRole === viewerRole || (viewerRole !== "client" && m.senderRole !== "client");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/cases/${caseId}/messages`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { ok?: boolean; messages?: MessageItem[] };
      if (data?.ok && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch {
      /* بی‌صدا — دادهٔ اولیهٔ سرور روی صفحه می‌ماند */
    }
  }, [caseId]);

  useEffect(() => {
    queueMicrotask(() => void load());
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);

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
        setError(data.error ?? "ارسال پیام ناموفق بود.");
      } else {
        setBody("");
        await load();
      }
    } catch {
      setError("خطا در ارتباط با سرور.");
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
            هنوز پیامی رد و بدل نشده است. اولین پیام را برای وکیل خود بنویسید.
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
                  <span>{m.senderName || (own ? "شما" : "طرف پرونده")}</span>
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
          متن پیام
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
          placeholder="پیام خود را بنویسید… (Enter برای ارسال)"
          className="min-h-11 flex-1 resize-none rounded-xl border border-border-strong bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !body.trim()}
          className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-hover disabled:opacity-50"
          aria-label="ارسال پیام"
        >
          <Icon name="send" className="h-4 w-4" />
          <span className="hidden sm:inline">{sending ? "در حال ارسال…" : "ارسال"}</span>
        </button>
      </div>

      <p className="mt-2 flex items-center justify-between text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <Icon name="lock" className="h-3 w-3 text-success" /> گفتگوی امن؛ فقط طرفین پرونده دسترسی دارند.
        </span>
        <span>بروزرسانی خودکار هر ۵ ثانیه</span>
      </p>
    </div>
  );
}
