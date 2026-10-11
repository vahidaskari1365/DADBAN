"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { formatJalali, formatTime } from "@/lib/money";
import { useT } from "@/lib/i18n/provider";
import type { MessageItem } from "./portal-server";

const ROLE_LABEL: Record<string, string> = {
  client: "موکل",
  lawyer: "وکیل",
  trainee: "کارآموز",
  system: "سیستم",
};

/** پیام‌رسان امن موکل و وکیل برای یک پرونده */
export function MessagesPanel({
  caseId,
  caseLabel,
  initialMessages,
  meName,
}: {
  caseId: number;
  caseLabel: string;
  initialMessages: MessageItem[];
  meName: string;
}) {
  const router = useRouter();
  const t = useT();
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const text = body.trim();
    if (text.length < 2) {
      toast.error(t("متن پیام را وارد کنید."));
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/portal/cases/${caseId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = (await res.json()) as { ok: boolean; messages?: MessageItem[]; error?: string };
      if (data.ok && data.messages) {
        setMessages(data.messages);
        setBody("");
        toast.success(t("پیام ارسال شد."));
        router.refresh();
      } else {
        toast.error(data.error ?? t("ارسال پیام ناموفق بود."));
      }
    } catch {
      toast.error(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {t("گفتگو:")} <b className="text-foreground-soft">{caseLabel}</b>
        </p>
        <span className="rounded-full bg-cyan/15 px-2.5 py-1 text-[11px] font-semibold text-[#1d7a8c]">{t("رمزشده")}</span>
      </div>

      <div className="max-h-96 space-y-3 overflow-y-auto rounded-2xl bg-surface-2/40 p-3">
        {messages.length === 0 && (
          <p className="p-6 text-center text-sm text-muted">{t("هنوز پیامی رد و بدل نشده است؛ اولین پیام را بفرستید.")}</p>
        )}
        {messages.map((m) => {
          const mine = m.senderName === meName && m.senderRole !== "client";
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-start" : "items-end"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-6 ${
                  mine ? "bg-primary text-primary-foreground" : "border border-border bg-surface text-foreground"
                }`}
              >
                <span className={`mb-1 block text-[10px] font-bold ${mine ? "text-cyan" : "text-accent"}`}>
                  {t(ROLE_LABEL[m.senderRole] ?? m.senderRole)} · {m.senderName}
                </span>
                {m.body}
              </div>
              <small className="mt-1 text-[10px] text-muted">
                {formatJalali(m.createdAt)} · {formatTime(m.createdAt)}
              </small>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <label className="flex-1">
          <span className="sr-only">{t("متن پیام")}</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder={t("پیام خود را بنویسید...")}
            className="min-h-11 w-full resize-y rounded-xl border border-border bg-surface p-3 text-sm outline-none focus:border-primary/40"
          />
        </label>
        <Button variant="primary" size="md" onClick={() => void send()} disabled={sending} className="shrink-0">
          <Icon name="send" className="h-4 w-4" />
          {sending ? "..." : t("ارسال")}
        </Button>
      </div>
    </div>
  );
}
