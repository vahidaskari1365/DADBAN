"use client";

import { useEffect, useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";

/**
 * ============================================================================
 * dadban — زیرجریان‌های پیامکی صفحهٔ ورود (کلاینت)
 * ----------------------------------------------------------------------------
 * 1) OtpLoginFlow — «ورود با کد پیامکی»: شماره → دریافت کد → InputOTP ۶ رقمی →
 *    تأیید و هدایت مثل ورود با رمز (destinationFor/hardNavigate از والد).
 * 2) فراموشی رمز عبور به‌صورت پنجرهٔ کوچک مشترک به forgot-dialog.tsx منتقل شد.
 *
 * صداقت: وقتی پیامک فعال نیست (dev) بنر کهربایی با نمایش کد؛ در پروداکشن
 * پیام پیام ۵۰۳ سرور عیناً و صادقانه نشان داده می‌شود — هیچ موفقیتی ساختگی نیست.
 * طراحی: از همان توکن‌ها/کلاس‌های سراسری (verso-field، auth-*) پنل ورود استفاده می‌کند.
 * ============================================================================
 */

/** یکسان‌سازی ارقام فارسی/عربی به لاتین برای ارسال به API */
const toEnDigits = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/** نرمال‌سازی موبایل به قالب ۰۹… برای API */
const normalizeMobile = (v: string) => {
  const d = toEnDigits(v).replace(/\D/g, "");
  return /^9\d{9}$/.test(d) ? `0${d}` : d;
};

type Tone = "danger" | "warn";
type Banner = { tone: Tone; text: string } | null;

/* ─────────────── اجزای مشترک ─────────────── */

export function FlowBanner({ tone, text }: { tone: Tone; text: string }) {
  return (
    <div
      role="alert"
      className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs font-bold leading-6 ${
        tone === "danger"
          ? "border-[#b42318]/25 bg-[#b42318]/[0.06] text-[#b42318] dark:border-[#f87171]/30 dark:bg-[#f87171]/[0.08] dark:text-[#f87171]"
          : "border-[var(--accent)]/30 bg-[var(--accent)]/[0.08] text-[var(--accent-text)]"
      }`}
    >
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 break-words">{text}</span>
    </div>
  );
}

export function FlowSubmit({
  loading,
  label,
  loadingLabel,
  testId,
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
  testId: string;
}) {
  return (
    <button
      type="submit"
      data-testid={testId}
      disabled={loading}
      className="btn-press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] text-sm font-extrabold text-[var(--primary-foreground)] shadow-[0_14px_30px_-12px_rgba(21,54,93,0.55)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[0_18px_36px_-12px_rgba(21,54,93,0.65)] disabled:opacity-60"
    >
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 12a9 9 0 1 1-6.2-8.56" />
          </svg>
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}

export function FlowPill({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-extrabold text-[var(--auth-ink-soft)] transition-colors hover:text-[var(--accent-text)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/** بنر حالت توسعه + نمایش کد dev (فقط وقتی سرور dev:true برگردانده) */
export function DevCodeNotice({ devCode, extra }: { devCode: string; extra: string }) {
  const t = useT();
  return (
    <div className="mt-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/[0.08] p-3">
      <p className="flex items-start gap-2 text-xs font-bold leading-6 text-[var(--accent-text)]">
        <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
        {extra}
      </p>
      <p className="mt-2 flex items-center justify-center gap-3">
        <span className="text-[10px] font-extrabold text-[var(--auth-ink-soft)]">{t("کد:")}</span>
        <span
          dir="ltr"
          className="rounded-lg bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] px-4 py-1.5 font-mono text-xl font-black tracking-[0.35em] text-[var(--accent-text)]"
        >
          {devCode}
        </span>
      </p>
    </div>
  );
}

/** شمارش معکوس سادهٔ ارسال مجدد کد — سقف اصلی را سرور اعمال می‌کند */
export function useCooldown(seconds: number, active: boolean) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!active || seconds <= 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLeft(seconds);
    const id = window.setInterval(() => {
      setLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [active, seconds]);
  return left;
}

/** ورودی کد یکبارمصرف — ۵ یا ۶ خانه (ثبت‌نام ۵ رقمی، ورود ۶ رقمی) */
export function OtpCodeInput({
  value,
  onChange,
  label,
  digits = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  digits?: number;
}) {
  const t = useT();
  return (
    <div dir="ltr" className="flex justify-center py-1">
      <InputOTP
        maxLength={digits}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        value={value}
        onChange={onChange}
        data-testid="otp-code-input"
        aria-label={t(label)}
        containerClassName="justify-center"
      >
        <InputOTPGroup>
          {Array.from({ length: digits }).map((_, i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="h-12 w-11 border border-[var(--auth-line)] bg-transparent text-base font-black text-[var(--auth-ink)] shadow-none first:rounded-xl last:rounded-xl data-[active=true]:border-[var(--accent)] data-[active=true]:ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

export function ResendRow({
  cooldown,
  onResend,
  onChange,
  onChangeLabel,
}: {
  cooldown: number;
  onResend: () => void;
  onChange: () => void;
  onChangeLabel: string;
}) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-2">
      <FlowPill onClick={onResend} disabled={cooldown > 0}>
        <Icon name="send" className="h-4 w-4 rotate-180" />
        {cooldown > 0 ? `${t("ارسال مجدد کد")} (${faNum(cooldown)})` : t("ارسال مجدد کد")}
      </FlowPill>
      <FlowPill onClick={onChange}>{onChangeLabel}</FlowPill>
    </div>
  );
}

/* ─────────────── ۱) ورود با کد پیامکی ─────────────── */

export function OtpLoginFlow({
  onSuccess,
  onBack,
}: {
  onSuccess: (role: string | null | undefined) => void;
  onBack: () => void;
}) {
  const t = useT();
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const cooldown = useCooldown(60, stage === "code");

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const mobile = normalizeMobile(phone);
    if (!/^09\d{9}$/.test(mobile)) {
      setBanner({ tone: "danger", text: t("شماره موبایل معتبر نیست؛ با ۰۹ شروع می‌شود و ۱۱ رقم است.") });
      return;
    }
    if (loading) return;
    setLoading(true);
    setBanner(null);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile, purpose: "login" }),
        signal: AbortSignal.timeout(25_000), // هیچ دکمه‌ای نباید برای همیشه لودینگ بماند
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setCode("");
        setStage("code");
        if (data.dev) {
          setDevCode(String(data.devCode ?? ""));
          setBanner(null); // بنر dev + کد در DevCodeNotice نمایش داده می‌شود
        } else {
          setDevCode(null);
          setBanner({
            tone: "warn",
            text: data.via === "email" ? t("این حساب ایمیل فعال دارد؛ کد ورود به ایمیل شما ارسال شد.") : t("کد ورود پیامک شد؛ لطفاً صندوق پیامک را بررسی کنید."),
          });
        }
      } else {
        setBanner({ tone: "danger", text: data.error ?? t("ارسال کد ناموفق بود.") });
      }
    } catch (err) {
      setBanner({ tone: "danger", text: err instanceof Error && err.name === "TimeoutError" ? t("پاسخ سرور بیش از حد طول کشید؛ لطفاً دوباره تلاش کنید.") : t("خطا در ارتباط با سرور") });
    }
    setLoading(false);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = toEnDigits(code).replace(/\D/g, "");
    if (c.length !== 6 || loading) return;
    setLoading(true);
    setBanner(null);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizeMobile(phone), code: c, purpose: "login" }),
        signal: AbortSignal.timeout(25_000),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onSuccess(data.user?.role); // هدایت کامل مثل ورود با رمز — لودینگ باقی می‌ماند
        return;
      }
      setBanner({ tone: "danger", text: data.error ?? t("تأیید کد ناموفق بود.") });
    } catch (err) {
      setBanner({ tone: "danger", text: err instanceof Error && err.name === "TimeoutError" ? t("پاسخ سرور بیش از حد طول کشید؛ لطفاً دوباره تلاش کنید.") : t("خطا در ارتباط با سرور") });
    }
    setLoading(false);
  };

  return (
    <div className="mt-7">
      {stage === "phone" ? (
        <form onSubmit={requestCode} className="space-y-5" noValidate>
          {banner && <FlowBanner {...banner} />}
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-extrabold text-[var(--auth-ink-soft)]">{t("شماره موبایل")}</span>
            <div className="verso-field">
              <Icon name="phone" className="pointer-events-none absolute right-0 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--auth-ink-soft)]" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09123456789"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                style={{ textAlign: "right" }}
                aria-label={t("شماره موبایل")}
              />
            </div>
          </label>
          <FlowSubmit loading={loading} label={t("دریافت کد")} loadingLabel={t("در حال ارسال کد…")} testId="otp-request-btn" />
          <p className="text-center">
            <FlowPill onClick={onBack}>
              <Icon name="arrow" className="h-4 w-4" />
              {t("بازگشت به ورود با رمز عبور")}
            </FlowPill>
          </p>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-5" noValidate>
          {banner && <FlowBanner {...banner} />}
          {devCode && <DevCodeNotice devCode={devCode} extra={t("حالت توسعه — پیامک فعال نیست، کد نمایش داده می‌شود")} />}
          <p className="text-center text-[13px] leading-7 text-[var(--auth-ink-soft)]">
            {t("کد ۶ رقمی به")}{" "}
            <span dir="ltr" className="font-bold text-[var(--auth-ink)]">
              {faNum(normalizeMobile(phone))}
            </span>{" "}
            {t("ارسال شد؛ آن را وارد کنید.")}
          </p>
          <OtpCodeInput value={code} onChange={setCode} label="کد تأیید ۶ رقمی" />
          <FlowSubmit loading={loading} label={t("تأیید و ورود")} loadingLabel={t("در حال بررسی کد…")} testId="otp-verify-btn" />
          <ResendRow
            cooldown={cooldown}
            onResend={() => void requestCode()}
            onChange={() => {
              setStage("phone");
              setCode("");
              setDevCode(null);
              setBanner(null);
            }}
            onChangeLabel={t("تغییر شماره")}
          />
          <p className="text-center">
            <FlowPill onClick={onBack}>
              <Icon name="arrow" className="h-4 w-4" />
              {t("بازگشت به ورود با رمز عبور")}
            </FlowPill>
          </p>
        </form>
      )}
    </div>
  );
}
