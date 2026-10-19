"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";

interface SmsTestResult {
  success: boolean;
  messageId?: string | null;
  channel?: string | null;
  error?: string | null;
}

interface SmsTestConfig {
  configured: boolean;
  sender: string;
  patternConfigured: boolean;
  apiBase: string;
}

/**
 * کارت «تست سامانهٔ پیامک» در پایش خطاها — ارسال واقعی از مسیر پروداکشن (فراز)
 * و نمایش نتیجهٔ خام API؛ برای عیب‌یابی بدون نیاز به لاگ کنسول هاست.
 */
export default function SmsTestCard() {
  const t = useT();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SmsTestResult | null>(null);
  const [config, setConfig] = useState<SmsTestConfig | null>(null);

  async function send() {
    if (running) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sms-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; result?: SmsTestResult; config?: SmsTestConfig; error?: string };
      setConfig(data.config ?? null);
      if (data.result) {
        setResult(data.result);
      } else {
        setResult({ success: false, error: data.error ?? `HTTP ${res.status}` });
      }
      router.refresh(); // اگر خطا در app_errors ثبت شده باشد، فوراً در فهرست پایین دیده شود
    } catch {
      setResult({ success: false, error: "خطای شبکه — اتصال برقرار نشد" });
    } finally {
      setRunning(false);
    }
  }

  const valid = /^09\d{9}$/.test(phone.trim());

  return (
    <Card hover={false} className="p-5" data-testid="sms-test-card">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
          <Icon name="send" className="h-3.5 w-3.5" /> {t("تست سامانهٔ پیامک (فراز)")}
        </span>
        {config && (
          <span className="mr-auto flex flex-wrap items-center gap-1.5">
            <Badge tone={config.configured ? "success" : "danger"}>
              {t("کلید API")}: {config.configured ? t("فعال") : t("ناموجود")}
            </Badge>
            <Badge tone="neutral">{t("خط فرستنده")}: {config.sender}</Badge>
            <Badge tone={config.patternConfigured ? "success" : "accent"}>
              {t("پترن OTP")}: {config.patternConfigured ? t("فعال") : t("تنظیم نشده — فالبک ساده")}
            </Badge>
          </span>
        )}
      </div>

      <p className="mt-3 text-xs leading-6 text-muted">
        {t("شمارهٔ موبایل خودت را وارد کن؛ پیامک واقعی از خط فرستندهٔ پنل فراز ارسال می‌شود و نتیجهٔ خام وب‌سرویس همین‌جا نمایش داده می‌شود.")}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          dir="ltr"
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))}
          placeholder="09xxxxxxxxx"
          aria-label={t("شمارهٔ موبایل برای تست")}
          className="min-h-11 w-44 rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
        <Button onClick={send} disabled={running || !valid} className="min-h-11">
          <Icon name="send" className={`h-4 w-4 ${running ? "animate-pulse" : ""}`} />
          {running ? t("در حال ارسال…") : t("ارسال پیامک تستی")}
        </Button>
      </div>

      {result && (
        <div
          className={`mt-3 rounded-xl border p-3 text-sm font-bold leading-6 break-words ${
            result.success
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
          data-testid="sms-test-result"
        >
          {result.success ? (
            <>
              ✓ {t("درخواست ارسال با موفقیت ثبت شد")}
              {result.messageId && result.messageId !== "-" ? (
                <span dir="ltr" className="mx-1">— ID: {result.messageId}</span>
              ) : null}
              {result.channel ? <span className="mx-1">({result.channel === "pattern" ? t("مسیر پترن") : t("مسیر ساده")})</span> : null}
              — {t("اگر پیام نرسید، وضعیت را در «گزارش ارسال» پنل فراز چک کن.")}
            </>
          ) : (
            <>
              ✗ {t("ارسال ناموفق")}:
              <span dir="ltr" className="mx-1 inline-block max-w-full break-all">{result.error}</span>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
