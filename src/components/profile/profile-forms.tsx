"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { ALL_PROVINCES, LOCATIONS, faNum } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

type ProfileInput = {
  name: string;
  email: string;
  phone: string;
  province: string;
  city: string;
  avatarColor: string;
  createdAt: string | null;
};

const AVATAR_COLORS = ["#15365d", "#7c5cff", "#0e7c66", "#b45309", "#be123c", "#334155"];

/** فرم اطلاعات شخصی موکل — PUT /api/profile */
export function PersonalInfoForm({ initial }: { initial: ProfileInput }) {
  const router = useRouter();
  const t = useT();
  const tf = templateT(t);
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [province, setProvince] = useState(initial.province);
  const [city, setCity] = useState(initial.city);
  const [avatarColor, setAvatarColor] = useState(initial.avatarColor);
  const [saving, setSaving] = useState(false);

  const cities = province ? (LOCATIONS.find((l) => l.province === province)?.cities ?? []) : [];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) {
      toast.error(t("نام و نام خانوادگی را کامل وارد کنید."));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), province, city, avatarColor }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        toast.success(t("اطلاعات شخصی ذخیره شد."));
        router.refresh();
      } else {
        toast.error(data.error ?? t("ذخیره اطلاعات ناموفق بود."));
      }
    } catch {
      toast.error(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t("نام و نام خانوادگی *")}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={3} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t("ایمیل (اختیاری)")}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            dir="ltr"
            className={inputCls}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t("استان")}</span>
          <select
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              setCity("");
            }}
            className={`${inputCls} cursor-pointer appearance-none`}
          >
            <option value="">{t("انتخاب استان…")}</option>
            {ALL_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {tf("استان {p}", { p })}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-muted">
            {t("استان شما برای پیشنهاد وکیلِ همان استان و شخصی‌سازی دستیار هوشمند استفاده می‌شود.")}
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t("شهر")}</span>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={!province}
            className={`${inputCls} cursor-pointer appearance-none disabled:opacity-50`}
          >
            <option value="">{province ? t("انتخاب شهر…") : t("ابتدا استان را انتخاب کنید")}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 block text-xs font-medium text-muted">{t("رنگ آواتار")}</legend>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setAvatarColor(c)}
              aria-label={tf("انتخاب رنگ {c}", { c })}
              aria-pressed={avatarColor === c}
              className={`h-9 w-9 rounded-xl border-2 transition-transform hover:scale-110 ${
                avatarColor === c ? "border-foreground" : "border-transparent"
              }`}
              style={{ background: `linear-gradient(135deg, ${c}, color-mix(in oklab, ${c} 55%, #000))` }}
            />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={saving} icon="check">
          {saving ? t("در حال ذخیره…") : t("ذخیره تغییرات")}
        </Button>
        <p className="text-xs text-muted">
          {tf("شماره موبایل {phone} شناسه ورود شماست و قابل تغییر نیست.", { phone: faNum(initial.phone) })}
        </p>
      </div>
    </form>
  );
}

/** فرم تغییر رمز عبور — PUT /api/profile/password */
export function PasswordForm() {
  const t = useT();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error(t("رمز جدید باید حداقل ۸ نویسه باشد."));
      return;
    }
    if (newPassword !== confirm) {
      toast.error(t("تکرار رمز جدید مطابقت ندارد."));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        toast.success(t("رمز عبور با موفقیت تغییر کرد."));
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        toast.error(data.error ?? t("تغییر رمز ناموفق بود."));
      }
    } catch {
      toast.error(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t("رمز فعلی *")}</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t("رمز جدید (حداقل ۸ نویسه) *")}</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t("تکرار رمز جدید *")}</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
        </label>
      </div>
      <Button type="submit" variant="outline" disabled={saving} icon="lock">
        {saving ? t("در حال تغییر…") : t("تغییر رمز عبور")}
      </Button>
    </form>
  );
}

/** نشان وضعیت اتصال حساب وکیل به پروفایل عمومی */
export function LawyerLinkBadge({ linked, href }: { linked: boolean; href?: string }) {
  const t = useT();
  if (!linked) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">
        <Icon name="alert" className="h-3.5 w-3.5" /> {t("متصل نیست")}
      </span>
    );
  }
  return (
    <a
      href={href ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success transition-colors hover:bg-success/25"
    >
      <Icon name="check" className="h-3.5 w-3.5" /> {t("مشاهده پروفایل عمومی")}
      <Icon name="arrow" className="h-3 w-3 rotate-180" />
    </a>
  );
}

/**
 * ردیف «وضعیت شماره موبایل» — نشان تأییدشده/تأییدنشده + جریان درخطی تأیید با
 * کد پیامکی (purpose=verify). صداقت: پیام ۵۰۳ سرور (پیامک فعال نیست) عیناً نمایش
 * داده می‌شود و هیچ موفقیتی ساختگی ادعا نمی‌شود.
 */
export function PhoneVerificationRow({ phone, verified }: { phone: string; verified: boolean }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [msg, setMsg] = useState<{ tone: "ok" | "warn" | "danger"; text: string } | null>(null);

  /* شمارش معکوس ارسال مجدد — سقف اصلی را سرور اعمال می‌کند */
  const counting = cooldown > 0;
  useEffect(() => {
    if (!counting) return;
    const id = window.setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [counting]);

  /** یکسان‌سازی ارقام فارسی/عربی به لاتین */
  const toEnDigits = (s: string) =>
    s
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

  async function requestCode() {
    if (loading) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "verify" }),
        signal: AbortSignal.timeout(25_000), // هیچ دکمه‌ای نباید برای همیشه لودینگ بماند
      });
      const data = (await res.json()) as { ok: boolean; error?: string; dev?: boolean; devCode?: string; via?: string };
      if (res.ok && data.ok) {
        setOpen(true);
        setCode("");
        if (data.dev) {
          setMsg({
            tone: "warn",
            text: `${t("حالت توسعه — پیامک فعال نیست، کد نمایش داده می‌شود")}: ${data.devCode ?? ""}`,
          });
        } else {
          setMsg({
            tone: "warn",
            text:
              data.via === "email"
                ? t("این حساب ایمیل فعال دارد؛ کد تأیید به ایمیل شما ارسال شد.")
                : t("کد تأیید پیامک شد؛ لطفاً صندوق پیامک را بررسی کنید."),
          });
        }
        setCooldown(60);
      } else {
        setMsg({ tone: "danger", text: data.error ?? t("ارسال کد ناموفق بود.") });
      }
    } catch (err) {
      setMsg({ tone: "danger", text: err instanceof Error && err.name === "TimeoutError" ? t("پاسخ سرور بیش از حد طول کشید؛ لطفاً دوباره تلاش کنید.") : t("ارتباط با سرور برقرار نشد.") });
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    const c = toEnDigits(code).replace(/\D/g, "");
    if (c.length !== 6 || loading) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: c, purpose: "verify" }),
        signal: AbortSignal.timeout(25_000),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (res.ok && data.ok) {
        setOpen(false);
        setMsg(null);
        setCode("");
        toast.success(t("شماره موبایل شما تأیید شد."));
        router.refresh(); // رندر مجدد سرورساید برای نشان سبز «تأییدشده»
      } else {
        setMsg({ tone: "danger", text: data.error ?? t("تأیید کد ناموفق بود.") });
      }
    } catch (err) {
      setMsg({ tone: "danger", text: err instanceof Error && err.name === "TimeoutError" ? t("پاسخ سرور بیش از حد طول کشید؛ لطفاً دوباره تلاش کنید.") : t("ارتباط با سرور برقرار نشد.") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* ردیف وضعیت */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground">
          <span dir="ltr" className="font-mono">
            {faNum(phone)}
          </span>
        </span>
        {verified ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--success)_30%,transparent)] bg-[color-mix(in_oklab,var(--success)_14%,transparent)] px-3 py-1 text-xs font-semibold text-success">
            <Icon name="check" className="h-3.5 w-3.5" /> {t("تأییدشده")}
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">
              <Icon name="alert" className="h-3.5 w-3.5" /> {t("تأییدنشده")}
            </span>
            <Button type="button" variant="outline" size="sm" icon="badge" disabled={loading} onClick={() => (open ? setOpen(false) : void requestCode())}>
              {open ? t("بستن") : t("تأیید شماره")}
            </Button>
          </>
        )}
      </div>

      {/* پیام وضعیت — صادقانه (۵۰۳ سرور، بنر dev، خطاها) */}
      {msg && (
        <p
          role="alert"
          className={`mt-3 rounded-xl border p-3 text-xs font-bold leading-6 ${
            msg.tone === "danger"
              ? "border-[color-mix(in_oklab,var(--danger)_28%,transparent)] bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] text-danger"
              : "border-accent/30 bg-accent-soft text-accent-text"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* جریان درخطی تأیید: کد ۶ رقمی */}
      {open && !verified && (
        <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-border bg-surface-2 p-4">
          <p className="text-xs leading-6 text-muted">{t("کد ۶ رقمی ارسال‌شده به همین شماره را وارد کنید:")}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void verify();
            }}
            className="mt-3 space-y-3"
            noValidate
          >
            <div dir="ltr" className="flex justify-center py-1">
              <InputOTP
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                inputMode="numeric"
                value={code}
                onChange={setCode}
                data-testid="verify-otp-input"
                aria-label={t("کد تأیید ۶ رقمی")}
                containerClassName="justify-center"
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-11 w-10 rounded-xl border border-border bg-surface text-base font-bold text-foreground shadow-none first:rounded-xl last:rounded-xl data-[active=true]:border-primary data-[active=true]:ring-primary/30"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="sm" icon="check" disabled={loading || toEnDigits(code).replace(/\D/g, "").length !== 6}>
                {loading ? t("در حال بررسی…") : t("تأیید کد")}
              </Button>
              <button
                type="button"
                onClick={() => void requestCode()}
                disabled={cooldown > 0 || loading}
                className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold text-muted transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cooldown > 0 ? `${t("ارسال مجدد کد")} (${faNum(cooldown)})` : t("ارسال مجدد کد")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
