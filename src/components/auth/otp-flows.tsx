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
 * 2) ForgotPasswordFlow — «فراموشی رمز عبور» با دو مسیر: پیامک یا ایمیل.
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ─────────────── اجزای مشترک ─────────────── */

function FlowBanner({ tone, text }: { tone: Tone; text: string }) {
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

function FlowSubmit({
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

function FlowPill({
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
function DevCodeNotice({ devCode, extra }: { devCode: string; extra: string }) {
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
function useCooldown(seconds: number, active: boolean) {
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

function OtpCodeInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const t = useT();
  return (
    <div dir="ltr" className="flex justify-center py-1">
      <InputOTP
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        value={value}
        onChange={onChange}
        data-testid="otp-code-input"
        aria-label={t(label)}
        containerClassName="justify-center"
      >
        <InputOTPGroup>
          {[0, 1, 2, 3, 4, 5].map((i) => (
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

function ResendRow({
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
    } catch {
      setBanner({ tone: "danger", text: t("خطا در ارتباط با سرور") });
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
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onSuccess(data.user?.role); // هدایت کامل مثل ورود با رمز — لودینگ باقی می‌ماند
        return;
      }
      setBanner({ tone: "danger", text: data.error ?? t("تأیید کد ناموفق بود.") });
    } catch {
      setBanner({ tone: "danger", text: t("خطا در ارتباط با سرور") });
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

/* ─────────────── ۲) فراموشی رمز عبور — پیامک یا ایمیل ─────────────── */

export function ForgotPasswordFlow({ onBack }: { onBack: () => void }) {
  const t = useT();
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [stage, setStage] = useState<"request" | "reset" | "done">("request");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const cooldown = useCooldown(60, stage === "reset");

  const targetValid = channel === "sms" ? /^09\d{9}$/.test(normalizeMobile(phone)) : EMAIL_RE.test(email.trim());

  /** درخواست کد بازیابی — پیامک: /api/auth/otp/request (purpose=reset) · ایمیل: email-request */
  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    if (!targetValid) {
      setBanner({
        tone: "danger",
        text: channel === "sms" ? t("شماره موبایل معتبر نیست؛ با ۰۹ شروع می‌شود و ۱۱ رقم است.") : t("ایمیل معتبر نیست."),
      });
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      const endpoint = channel === "sms" ? "/api/auth/otp/request" : "/api/auth/password/email-request";
      const payload = channel === "sms" ? { phone: normalizeMobile(phone), purpose: "reset" } : { email: email.trim() };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setCode("");
        setStage("reset");
        if (data.dev) {
          setDevCode(String(data.devCode ?? ""));
          setBanner(null); // بنر dev + کد در DevCodeNotice نمایش داده می‌شود
        } else {
          setDevCode(null);
          setBanner({
            tone: "warn",
            text:
              channel === "sms" && data.via === "email"
                ? t("این حساب ایمیل فعال دارد؛ کد بازیابی به ایمیل شما ارسال شد.")
                : channel === "sms"
                  ? t("کد بازیابی پیامک شد؛ لطفاً صندوق پیامک را بررسی کنید.")
                  : t("کد بازیابی به ایمیل شما ارسال شد؛ پوشهٔ هرزنامه را هم بررسی کنید."),
          });
        }
      } else {
        setBanner({ tone: "danger", text: data.error ?? t("ارسال کد ناموفق بود.") });
      }
    } catch {
      setBanner({ tone: "danger", text: t("خطا در ارتباط با سرور") });
    }
    setLoading(false);
  };

  /** ثبت رمز جدید — پیامک: /api/auth/password/reset · ایمیل: email-reset */
  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = toEnDigits(code).replace(/\D/g, "");
    if (loading) return;
    if (c.length !== 6) {
      setBanner({ tone: "danger", text: t("کد ۶ رقمی را کامل وارد کنید.") });
      return;
    }
    if (newPassword.length < 8) {
      setBanner({ tone: "danger", text: t("رمز عبور باید حداقل ۸ کاراکتر باشد.") });
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      const endpoint = channel === "sms" ? "/api/auth/password/reset" : "/api/auth/password/email-reset";
      const payload =
        channel === "sms"
          ? { phone: normalizeMobile(phone), code: c, password: newPassword }
          : { email: email.trim(), code: c, password: newPassword };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStage("done");
        setBanner(null);
        setDevCode(null);
      } else {
        setBanner({ tone: "danger", text: data.error ?? t("تغییر رمز ناموفق بود.") });
      }
    } catch {
      setBanner({ tone: "danger", text: t("خطا در ارتباط با سرور") });
    }
    setLoading(false);
  };

  return (
    <div className="mt-7">
      {stage === "done" ? (
        <div className="space-y-5">
          <div className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--success)_30%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)] p-3 text-xs font-bold leading-6 text-success">
            <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" />
            {t("رمز عبور با موفقیت تغییر کرد. حالا می‌توانید با رمز جدید وارد شوید.")}
          </div>
          <p className="text-center">
            <FlowPill onClick={onBack}>
              <Icon name="arrow" className="h-4 w-4" />
              {t("بازگشت به ورود")}
            </FlowPill>
          </p>
        </div>
      ) : stage === "request" ? (
        <form onSubmit={requestCode} className="space-y-5" noValidate>
          {banner && <FlowBanner {...banner} />}
          {/* انتخاب مسیر بازیابی */}
          <div role="radiogroup" aria-label={t("روش بازیابی رمز")} className="grid grid-cols-2 gap-3">
            {([
              { id: "sms" as const, icon: "phone" as const, title: "با پیامک" },
              { id: "email" as const, icon: "mail" as const, title: "با ایمیل" },
            ]).map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={channel === o.id}
                onClick={() => {
                  setChannel(o.id);
                  setBanner(null);
                  setDevCode(null);
                }}
                className={`btn-press flex min-h-11 items-center justify-center gap-2 rounded-xl border text-[13px] font-extrabold transition-all duration-300 ${
                  channel === o.id
                    ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] text-[var(--auth-ink)] shadow-[0_10px_24px_-14px_rgba(176,125,18,0.55)]"
                    : "border-[var(--border)] bg-[color-mix(in_oklab,var(--primary)_4%,transparent)] text-[var(--auth-ink-soft)] hover:border-[color-mix(in_oklab,var(--accent)_45%,transparent)]"
                }`}
              >
                <Icon name={o.icon} className="h-4 w-4" />
                {t(o.title)}
              </button>
            ))}
          </div>

          {channel === "sms" ? (
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-extrabold text-[var(--auth-ink-soft)]">{t("شماره موبایل حساب")}</span>
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
                  aria-label={t("شماره موبایل حساب")}
                />
              </div>
            </label>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-extrabold text-[var(--auth-ink-soft)]">{t("ایمیل حساب")}</span>
              <div className="verso-field">
                <Icon name="mail" className="pointer-events-none absolute right-0 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--auth-ink-soft)]" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                  aria-label={t("ایمیل حساب")}
                />
              </div>
            </label>
          )}

          <FlowSubmit
            loading={loading}
            label={t("دریافت کد بازیابی")}
            loadingLabel={t("در حال ارسال کد…")}
            testId="otp-request-btn"
          />
          <p className="text-center">
            <FlowPill onClick={onBack}>
              <Icon name="arrow" className="h-4 w-4" />
              {t("بازگشت به ورود")}
            </FlowPill>
          </p>
        </form>
      ) : (
        <form onSubmit={submitReset} className="space-y-5" noValidate>
          {banner && <FlowBanner {...banner} />}
          {devCode && <DevCodeNotice devCode={devCode} extra={t("حالت توسعه — پیامک فعال نیست، کد نمایش داده می‌شود")} />}
          <p className="text-center text-[13px] leading-7 text-[var(--auth-ink-soft)]">
            {t("کد ۶ رقمی بازیابی به")}{" "}
            <span dir="ltr" className="font-bold text-[var(--auth-ink)]">
              {channel === "sms" ? faNum(normalizeMobile(phone)) : email.trim()}
            </span>{" "}
            {t("ارسال شد؛ آن را وارد کنید.")}
          </p>
          <OtpCodeInput value={code} onChange={setCode} label="کد بازیابی ۶ رقمی" />
          <div>
            <label htmlFor="forgot-new-pw" className="mb-1.5 block text-[11px] font-extrabold text-[var(--auth-ink-soft)]">
              {t("رمز عبور جدید")}
            </label>
            <div className="verso-field">
              <Icon name="lock" className="pointer-events-none absolute right-0 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--auth-ink-soft)]" />
              <input
                id="forgot-new-pw"
                type={showPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
                aria-label={t("رمز عبور جدید")}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? t("پنهان‌کردن رمز") : t("نمایش رمز")}
                className="absolute left-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--auth-ink-soft)] transition-colors hover:text-[var(--auth-ink)]"
              >
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <FlowSubmit loading={loading} label={t("ثبت رمز جدید")} loadingLabel={t("در حال ثبت رمز…")} testId="reset-submit" />
          <ResendRow
            cooldown={cooldown}
            onResend={() => void requestCode()}
            onChange={() => {
              setStage("request");
              setCode("");
              setDevCode(null);
              setBanner(null);
            }}
            onChangeLabel={t("اصلاح شماره / ایمیل")}
          />
          <p className="text-center">
            <FlowPill onClick={onBack}>
              <Icon name="arrow" className="h-4 w-4" />
              {t("بازگشت به ورود")}
            </FlowPill>
          </p>
        </form>
      )}
    </div>
  );
}
