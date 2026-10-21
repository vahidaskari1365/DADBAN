"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import {
  DevCodeNotice,
  FlowBanner,
  FlowPill,
  FlowSubmit,
  ResendRow,
  useCooldown,
} from "./otp-flows";
import { OtpCodeInput } from "./otp-flows";

/**
 * ============================================================================
 * دادورزان — پنجرهٔ کوچک «فراموشی رمز عبور» — مشترک بین همه نقش‌ها
 * (موکل، وکیل رسمی، کارآموز وکالت، کارشناس حقوقی — همه با شماره موبایل حساب)
 * ----------------------------------------------------------------------------
 * جریان (طبق خواستهٔ محصول):
 *   ۱) «شماره موبایل را وارد کنید» → دکمه تأیید
 *   ۲) کد ۵ رقمی پیامکی → با تکمیل پنجمی رقم، خودکار مرحلهٔ رمز جدید باز می‌شود
 *   ۳) «رمز جدید» + «تکرار رمز جدید» → دکمه تأیید
 *   ۴) پنجره بسته می‌شود و کاربر روی همان فرم ورود، با رمز جدید وارد می‌شود.
 *
 * اعتبارسنجی واقعی کد سمت سرور در /api/auth/password/reset انجام می‌شود
 * (verifyAndConsumeOtp) — پیش‌رفت مرحله فقط UI است؛ اگر کد غلط باشد سرور
 * خطا می‌دهد و کاربر به مرحلهٔ کد برمی‌گردد.
 * صداقت: در dev کد در DevCodeNotice نمایش داده می‌شود؛ در پروداکشن پیامک واقعی.
 * ============================================================================
 */

/** یکسان‌سازی ارقام فارسی/عربی به لاتین */
const toEnDigits = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/** نرمال‌سازی موبایل به قالب ۰۹… برای API */
const normalizeMobile = (v: string) => {
  const d = toEnDigits(v).replace(/\D/g, "");
  return /^9\d{9}$/.test(d) ? `0${d}` : d;
};

type Step = "phone" | "code" | "newpw";
type Banner = { tone: "danger" | "warn"; text: string } | null;

/** فیلد رمز با چشمک نمایش/پنهان — هم‌خانوادهٔ verso-field پنل ورود */
function PwField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder = "••••••••",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
}) {
  const t = useT();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-extrabold text-[var(--auth-ink-soft)]">
        {t(label)}
      </label>
      <div className="verso-field">
        <Icon name="lock" className="pointer-events-none absolute right-0 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--auth-ink-soft)]" />
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          minLength={8}
          aria-label={t(label)}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? t("پنهان‌کردن رمز") : t("نمایش رمز")}
          className="absolute left-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--auth-ink-soft)] transition-colors hover:text-[var(--auth-ink)]"
        >
          {show ? (
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
  );
}

export function ForgotPasswordDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  /** پس از موفقیت — پیام اعلان روی فرم ورود + شماره برای پیش‌پرکردن فیلد ورود */
  onDone: (notice: string, phone: string) => void;
}) {
  const t = useT();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const cooldown = useCooldown(60, open && step === "code");

  // با هر بازشدن، پنجره از صفر شروع می‌شود
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep("phone");
    setPhone("");
    setCode("");
    setPw1("");
    setPw2("");
    setShow1(false);
    setShow2(false);
    setBanner(null);
    setDevCode(null);
  }, [open]);

  /** مرحله ۱ — درخواست کد بازیابی برای شماره */
  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    const mobile = normalizeMobile(phone);
    if (!/^09\d{9}$/.test(mobile)) {
      setBanner({ tone: "danger", text: t("شماره موبایل معتبر نیست؛ با ۰۹ شروع می‌شود و ۱۱ رقم است.") });
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile, purpose: "reset" }),
        signal: AbortSignal.timeout(25_000),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setPhone(mobile);
        setCode("");
        setDevCode(data.dev ? String(data.devCode ?? "") : null);
        setBanner(
          data.dev
            ? null
            : data.via === "email"
              ? { tone: "warn", text: t("این حساب ایمیل فعال دارد؛ کد بازیابی به ایمیل شما ارسال شد.") }
              : { tone: "warn", text: t("کد بازیابی پیامک شد؛ لطفاً صندوق پیامک را بررسی کنید.") },
        );
        setStep("code");
      } else {
        setBanner({ tone: "danger", text: data.error ?? t("ارسال کد ناموفق بود.") });
      }
    } catch (err) {
      setBanner({
        tone: "danger",
        text: err instanceof Error && err.name === "TimeoutError" ? t("پاسخ سرور بیش از حد طول کشید؛ لطفاً دوباره تلاش کنید.") : t("خطا در ارتباط با سرور"),
      });
    }
    setLoading(false);
  };

  /** مرحله ۳ — ثبت رمز جدید (کد همان‌جا سمت سرور راستی‌آزمایی و مصرف می‌شود) */
  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (pw1.length < 8) {
      setBanner({ tone: "danger", text: t("رمز عبور باید حداقل ۸ کاراکتر باشد.") });
      return;
    }
    if (pw1 !== pw2) {
      setBanner({ tone: "danger", text: t("تکرار رمز با رمز جدید یکسان نیست.") });
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizeMobile(phone), code: toEnDigits(code).replace(/\D/g, ""), password: pw1 }),
        signal: AbortSignal.timeout(25_000),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        // پنجره بسته می‌شود و کاربر روی فرم ورود با رمز جدید وارد می‌شود
        onDone(t("رمز عبور با موفقیت تغییر کرد؛ حالا با رمز جدید وارد شوید."), normalizeMobile(phone));
        return;
      }
      const msg = String(data.error ?? t("تغییر رمز ناموفق بود."));
      if (/کد/.test(msg)) {
        // کد غلط/منقضی — به مرحلهٔ کد برگرد تا قابل ویرایش باشد
        setCode("");
        setStep("code");
      }
      setBanner({ tone: "danger", text: msg });
    } catch (err) {
      setBanner({
        tone: "danger",
        text: err instanceof Error && err.name === "TimeoutError" ? t("پاسخ سرور بیش از حد طول کشید؛ لطفاً دوباره تلاش کنید.") : t("خطا در ارتباط با سرور"),
      });
    }
    setLoading(false);
  };

  const STEP_LABELS = ["شماره موبایل", "کد تأیید", "رمز جدید"] as const;
  const stepIndex = step === "phone" ? 0 : step === "code" ? 1 : 2;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        data-testid="forgot-dialog"
        className="top-[50%] max-w-[360px] gap-0 overflow-hidden rounded-3xl border-[var(--auth-line)] bg-[var(--auth-form-bg)] p-6 shadow-[0_30px_70px_-20px_rgba(10,25,50,0.45)]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="gap-0 text-start">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-base font-black text-[var(--auth-ink)]">
              <Icon name="lock" className="h-[18px] w-[18px] text-[var(--accent-text)]" />
              {t("بازیابی رمز عبور")}
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("بستن پنجره")}
              data-testid="forgot-dialog-close"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--auth-line)] text-[var(--auth-ink-soft)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-text)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <DialogDescription className="mt-1.5 text-[11px] leading-5 text-[var(--auth-ink-soft)]">
            {step === "phone" && t("برای همه حساب‌ها — موکل، وکیل، کارآموز و کارشناس — با شماره موبایل قابل بازیابی است.")}
            {step === "code" && t("کد ۵ رقمی پیامک‌شده را وارد کنید؛ با تکمیل رقم پنجم، مرحلهٔ رمز جدید باز می‌شود.")}
            {step === "newpw" && t("رمز جدید و تکرار آن را وارد کنید.")}
          </DialogDescription>
        </DialogHeader>

        {/* نشانگر مرحله — سه خانه */}
        <div aria-hidden className="mt-4 flex items-center gap-1.5">
          {STEP_LABELS.map((label, i) => (
            <span
              key={label}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= stepIndex ? "bg-[var(--accent)]" : "bg-[var(--auth-line)]"
              }`}
            />
          ))}
        </div>

        {/* ── مرحله ۱: شماره موبایل ── */}
        {step === "phone" && (
          <form onSubmit={requestCode} className="mt-4 space-y-4" noValidate>
            {banner && <FlowBanner {...banner} />}
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-extrabold text-[var(--auth-ink-soft)]">{t("شماره موبایل حساب خود را وارد کنید")}</span>
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
                  autoFocus
                  data-testid="forgot-phone-input"
                  aria-label={t("شماره موبایل حساب خود را وارد کنید")}
                />
              </div>
            </label>
            <FlowSubmit
              loading={loading}
              label={t("تأیید")}
              loadingLabel={t("در حال ارسال کد…")}
              testId="forgot-phone-submit"
            />
          </form>
        )}

        {/* ── مرحله ۲: کد ۵ رقمی — تکمیل خودکار ── */}
        {step === "code" && (
          <div className="mt-4 space-y-4">
            {banner && <FlowBanner {...banner} />}
            {devCode && <DevCodeNotice devCode={devCode} extra={t("حالت توسعه — پیامک فعال نیست، کد نمایش داده می‌شود")} />}
            <p className="text-center text-[12px] leading-6 text-[var(--auth-ink-soft)]">
              {t("کد ۵ رقمی به")}{" "}
              <span dir="ltr" className="font-bold text-[var(--auth-ink)]">
                {faNum(normalizeMobile(phone))}
              </span>{" "}
              {t("ارسال شد.")}
            </p>
            <OtpCodeInput
              value={code}
              digits={5}
              label="کد تأیید ۵ رقمی بازیابی"
              onChange={(v) => {
                setCode(v);
                if (v.length >= 5) {
                  // ورود خودکار به مرحلهٔ رمز جدید — راستی‌آزمایی نهایی با ثبت رمز انجام می‌شود
                  setBanner(null);
                  setStep("newpw");
                }
              }}
            />
            <FlowSubmit
              loading={loading}
              label={t("ادامه")}
              loadingLabel={t("در حال بررسی…")}
              testId="forgot-code-continue"
            />
            <ResendRow
              cooldown={cooldown}
              onResend={() => void requestCode()}
              onChange={() => {
                setStep("phone");
                setCode("");
                setDevCode(null);
                setBanner(null);
              }}
              onChangeLabel={t("اصلاح شماره")}
            />
          </div>
        )}

        {/* ── مرحله ۳: رمز جدید + تکرار ── */}
        {step === "newpw" && (
          <form onSubmit={submitNewPassword} className="mt-4 space-y-4" noValidate>
            {banner && <FlowBanner {...banner} />}
            <PwField
              id="forgot-new-pw"
              label="رمز جدید را وارد کنید"
              value={pw1}
              onChange={setPw1}
              show={show1}
              onToggle={() => setShow1((v) => !v)}
            />
            <PwField
              id="forgot-new-pw-repeat"
              label="تکرار رمز جدید"
              value={pw2}
              onChange={setPw2}
              show={show2}
              onToggle={() => setShow2((v) => !v)}
            />
            <FlowSubmit
              loading={loading}
              label={t("تأیید و ثبت رمز جدید")}
              loadingLabel={t("در حال ثبت رمز…")}
              testId="forgot-newpw-submit"
            />
            <p className="text-center">
              <FlowPill
                onClick={() => {
                  setStep("code");
                  setBanner(null);
                }}
              >
                <Icon name="arrow" className="h-4 w-4" />
                {t("اصلاح کد تأیید")}
              </FlowPill>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
