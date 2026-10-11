"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "./icons";
import { useT } from "@/lib/i18n/provider";

/**
 * فرم عضویت در خبرنامهٔ دادبان — کامپوننت کلاینتِ کوچک برای فوتر (سرورکامپوننت).
 * صداقت: پیام موفقیت فقط از پاسخ سرور می‌آید؛ خطا (۴۲۲/۴۲۹/۵۰۳/شبکه) قرمز و شفاف است.
 * هدف لمسی ≥۴۴px، لیبل برای اسکرین‌ریدر، و پیام‌های فارسی.
 */
export default function NewsletterForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setOk(null);
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; error?: string } | null;
      if (res.ok && data?.ok) {
        setOk(data.message ?? t("ایمیل شما در خبرنامهٔ دادبان ثبت شد."));
        setEmail("");
      } else {
        setErr(data?.error ?? t("ثبت خبرنامه انجام نشد؛ لطفاً دوباره تلاش کنید."));
      }
    } catch {
      setErr(t("ارتباط برقرار نشد؛ لطفاً اتصال اینترنت را بررسی کنید."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="flex items-stretch gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          {t("ایمیل برای عضویت در خبرنامه")}
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          inputMode="email"
          dir="ltr"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="newsletter-email"
          aria-describedby="newsletter-msg"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-soft focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading || email.trim().length === 0}
          data-testid="newsletter-submit"
          className="btn-gold inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t("در حال ثبت…")}
            </>
          ) : (
            <>
              <Icon name="send" className="h-4 w-4" aria-hidden />
              {t("عضویت")}
            </>
          )}
        </button>
      </form>
      <p id="newsletter-msg" aria-live="polite" className="mt-2 min-h-5 text-xs leading-5">
        {ok && (
          <span className="inline-flex items-center gap-1 text-success" data-testid="newsletter-success">
            <Icon name="check" className="h-3.5 w-3.5" aria-hidden />
            {t(ok)}
          </span>
        )}
        {err && (
          <span className="inline-flex items-center gap-1 text-danger" role="alert" data-testid="newsletter-error">
            <Icon name="alert" className="h-3.5 w-3.5" aria-hidden />
            {t(err)}
          </span>
        )}
      </p>
    </div>
  );
}
