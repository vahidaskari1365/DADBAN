"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";

/**
 * فرم پاسخ به موضوع تالار گفتگو — برای همه (لاگین‌شده یا مهمان با نام دلخواه).
 */
export function ForumReplyForm({ topicId, loggedIn }: { topicId: number; loggedIn: boolean }) {
  const t = useT();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/forum/topics/${topicId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, name: guestName }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setError(t("تعداد نوشته‌های شما زیاد است؛ کمی بعد دوباره تلاش کنید."));
        return;
      }
      if (!data.ok) {
        setError(data.error || t("ثبت پاسخ ناموفق بود"));
        return;
      }
      setBody("");
      setGuestName("");
      setOk(true);
      router.refresh();
    } catch {
      setError(t("خطای ارتباط با سرور"));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = body.trim().length >= 2 && !busy;

  return (
    <Card hover={false} className="border-primary/25" data-testid="forum-reply-form">
      <h2 className="flex items-center gap-2 text-sm font-black text-foreground">
        <Icon name="chat" className="h-4 w-4 text-primary" />
        {t("پاسخ بگذارید")}
      </h2>
      {!loggedIn && (
        <div className="mt-3">
          <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor="forum-reply-name">
            {t("نام شما (اختیاری — مهمان)")}
          </label>
          <input
            id="forum-reply-name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            maxLength={60}
            placeholder={t("مثلاً: مریم از اصفهان")}
            className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary"
          />
        </div>
      )}
      <div className="mt-3">
        <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor="forum-reply-body">
          {t("متن پاسخ")} <span className="text-destructive">*</span>
        </label>
        <textarea
          id="forum-reply-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
          rows={3}
          placeholder={t("نظر یا پاسخ خود را بنویسید…")}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm leading-7 text-foreground outline-none transition focus:border-primary"
          data-testid="forum-reply-input"
        />
      </div>
      {error && (
        <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive" role="alert" data-testid="forum-reply-error">
          {error}
        </p>
      )}
      {ok && (
        <p className="mt-3 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs font-bold text-success" role="status" data-testid="forum-reply-ok">
          {t("پاسخ شما ثبت شد ✓")}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <Button onClick={submit} disabled={!canSubmit} data-testid="forum-reply-submit">
          {busy ? t("در حال ارسال…") : t("ارسال پاسخ")}
        </Button>
        {!loggedIn && (
          <Badge tone="neutral">{t("مهمان — بدون ثبت‌نام")}</Badge>
        )}
      </div>
    </Card>
  );
}
