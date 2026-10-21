"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { faNum, LEGAL_TOPICS } from "@/lib/data";
import { isRedirectSafeForRole, isLawyerSideRole, panelHomeForRole } from "@/lib/roles";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";
import { DevCodeNotice, OtpLoginFlow, OtpCodeInput, ResendRow, useCooldown } from "@/components/auth/otp-flows";
import { ForgotPasswordDialog } from "@/components/auth/forgot-dialog";
import { ProvinceCombobox } from "@/components/auth/province-combobox";

type Tab = "client" | "lawyer";
type Mode = "login" | "register";
/** مسیر عضویت در تب وکیل — رسمی (احراز هویت) / کارآموز (ثبت‌نام مستقیم) / کارشناس حقوقی (ثبت‌نام مستقیم) */
type LawyerTrack = "wakil" | "karamooz" | "expert";

/** یکسان‌سازی ارقام فارسی/عربی به لاتین برای ارسال به API */
const toEnDigits = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

const TABS: { id: Tab; label: string; icon: "user" | "briefcase" }[] = [
  { id: "client", label: "موکل", icon: "user" },
  { id: "lawyer", label: "وکیل", icon: "briefcase" },
];

/** محتوای پنل برند به تفکیک حالت — عیناً در تیغه هم رندر می‌شود تا جابه‌جایی بی‌درز باشد */
const BRAND: Record<Mode, { title: string; gold: string; sub: string }> = {
  login: {
    title: "خوش آمدید",
    gold: "دوباره.",
    sub: "پرونده‌ها، وکلا و دستیار حقوقی‌تان — دقیقاً همان‌جا که رها کردید.",
  },
  register: {
    title: "خوش آمدید",
    gold: "به دادورزان.",
    sub: "حساب بسازید؛ وکیل متخصص، پیگیری شفاف پرونده و دستیار هوشمند، همین‌جا است.",
  },
};

const TRUST_ITEMS = ["وکلای احراز هویت‌شده", "پیگیری شفاف", "پشتیبانی ۲۴/۷"];

/** شهرهای پرتکرار برای انتخاب سریع شهر کارآموز — اختیاری؛ مراکز استان‌ها */
const POPULAR_CITIES = [
  "تهران", "مشهد", "اصفهان", "شیراز", "کرج", "تبریز", "اهواز", "قم", "رشت",
  "کرمانشاه", "یزد", "اردبیل", "بندرعباس", "زاهدان", "سنندج", "همدان", "اراک",
  "گرگان", "ساری", "کرمان", "ارومیه", "خرم‌آباد", "زنجان", "قزوین", "بوشهر",
  "شهرکرد", "بیرجند", "بجنورد", "سمنان", "یاسوج", "ایلام",
];

/* ─────────────── پنل برند — سرمه‌ای/طلایی تم خود سایت + عکس هیرو ─────────────── */

function BrandPane({ mode, priority = false }: { mode: Mode; priority?: boolean }) {
  const t = useT();
  const b = BRAND[mode];
  return (
    <div
      className="relative flex h-full flex-col justify-center overflow-hidden px-14 py-14 xl:px-20"
      style={{
        background:
          "linear-gradient(155deg, var(--auth-brand-a) 0%, var(--auth-brand-b) 52%, var(--auth-brand-c) 100%)",
      }}
    >
      {/* عکس هیروی سایت — کن‌برنز آرام + ماسک محوشدن به بالا */}
      <div
        aria-hidden
        className="site-hero-bg absolute inset-0 bg-cover bg-right opacity-[0.4] dark:hidden"
        style={{
          backgroundImage: "url('/hero-bg-light.jpg')",
          maskImage: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 45%, transparent 80%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 45%, transparent 80%)",
        }}
      />
      <div
        aria-hidden
        className="site-hero-bg absolute inset-0 hidden bg-cover bg-right opacity-[0.32] dark:block"
        style={{
          backgroundImage: "url('/hero-bg-dark.jpg')",
          maskImage: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 45%, transparent 80%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 45%, transparent 80%)",
        }}
      />
      {/* هاله‌های نورانی طلایی/آبی — اورورای آرام */}
      <div aria-hidden className="auth-aurora-b absolute -bottom-28 -right-24 h-[26rem] w-[26rem]" />
      <div aria-hidden className="auth-aurora-a absolute -top-32 -left-20 h-[24rem] w-[24rem] [animation-delay:-7s]" />
      <div aria-hidden className="auth-noise absolute inset-0" />

      <div className="auth-stagger relative ms-auto w-full max-w-md">
        <div className="auth-float w-fit">
          <div className="logo-motion logo-motion-bare rounded-2xl bg-white p-2 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.65)] ring-1 ring-white/20">
            <Image
              src="/logo-crest.png"
              alt={t("لوگوی دادورزان")}
              width={96}
              height={96}
              priority={priority}
              className="h-auto w-[5.5rem] rounded-xl"
            />
          </div>
        </div>

        <p className="mt-10 text-[11px] font-extrabold tracking-[0.45em] text-[var(--auth-gold)]">دادورزان</p>
        <h1 className="mt-3 text-[2.6rem] font-black leading-[1.3] text-[var(--auth-onbrand)] xl:text-[2.9rem]">
          {t(b.title)}{" "}
          <span className="text-[var(--auth-gold)]">{t(b.gold)}</span>
        </h1>
        <p className="mt-4 text-sm leading-8 text-[var(--auth-onbrand-soft)]">{t(b.sub)}</p>

        <ul className="mt-10 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] font-bold text-[var(--auth-onbrand-soft)]">
          {TRUST_ITEMS.map((item, i) => (
            <li key={item} className="flex items-center gap-2.5">
              {i > 0 && <span aria-hidden className="text-[var(--auth-gold)]">•</span>}
              {t(item)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─────────────── نوار برند موبایل — لبه پایین مورب ─────────────── */

function BrandBand({ mode }: { mode: Mode }) {
  const t = useT();
  const b = BRAND[mode];
  return (
    <div
      className="relative mb-4 overflow-hidden lg:hidden"
      style={{
        background:
          "linear-gradient(155deg, var(--auth-brand-a) 0%, var(--auth-brand-b) 55%, var(--auth-brand-c) 100%)",
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 44px), 0 100%)",
      }}
    >
      <div
        aria-hidden
        className="site-hero-bg absolute inset-0 bg-cover bg-right opacity-[0.4] dark:hidden"
        style={{
          backgroundImage: "url('/hero-bg-light.jpg')",
          maskImage: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 85%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 85%)",
        }}
      />
      <div
        aria-hidden
        className="site-hero-bg absolute inset-0 hidden bg-cover bg-right opacity-[0.32] dark:block"
        style={{
          backgroundImage: "url('/hero-bg-dark.jpg')",
          maskImage: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 85%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 85%)",
        }}
      />
      <div aria-hidden className="auth-aurora-b absolute -bottom-16 -right-10 h-56 w-56" />
      <div aria-hidden className="auth-noise absolute inset-0" />

      <div className="auth-stagger relative px-6 pb-14 pt-7">
        <div className="flex items-center gap-3">
          <div className="auth-float rounded-xl bg-white p-1.5 shadow-[0_14px_30px_-14px_rgba(0,0,0,0.6)] ring-1 ring-white/20">
            <Image src="/logo-crest.png" alt={t("لوگوی دادورزان")} width={44} height={44} priority className="h-11 w-11 rounded-lg" />
          </div>
          <p className="text-[10px] font-extrabold tracking-[0.4em] text-[var(--auth-gold)]">دادورزان</p>
        </div>
        <h1 className="mt-5 text-2xl font-black leading-relaxed text-[var(--auth-onbrand)]">
          {t(b.title)}{" "}
          <span className="text-[var(--auth-gold)]">{t(b.gold)}</span>
        </h1>
        <p className="mt-2 text-xs leading-6 text-[var(--auth-onbrand-soft)]">{t(b.sub)}</p>
      </div>
    </div>
  );
}

/* ─────────────── مرحلهٔ کد تأیید ثبت‌نام — مشترک موکل/کارآموز ─────────────── */

function RegisterOtpStep({
  devCode,
  phoneFa,
  code,
  onCodeChange,
  cooldown,
  onResend,
  onBack,
}: {
  devCode: string | null;
  phoneFa: string;
  code: string;
  onCodeChange: (v: string) => void;
  cooldown: number;
  onResend: () => void;
  onBack: () => void;
}) {
  const t = useT();
  return (
    <div data-testid="register-otp-step" className="rounded-2xl border border-[var(--auth-line)] bg-[color-mix(in_oklab,var(--primary)_4%,transparent)] p-4">
      <p className="text-center text-[13px] leading-7 text-[var(--auth-ink-soft)]">
        {t("کد ۵ رقمی تأیید به")}{" "}
        <span dir="ltr" className="font-bold text-[var(--auth-ink)]">
          {phoneFa}
        </span>{" "}
        {t("ارسال شد؛ آن را وارد کنید.")}
      </p>
      {devCode && <DevCodeNotice devCode={devCode} extra={t("حالت توسعه — پیامک فعال نیست، کد نمایش داده می‌شود")} />}
      <OtpCodeInput value={code} onChange={onCodeChange} label="کد تأیید ۵ رقمی ثبت‌نام" digits={5} />
      <ResendRow cooldown={cooldown} onResend={onResend} onChange={onBack} onChangeLabel={t("اصلاح اطلاعات ثبت‌نام")} />
    </div>
  );
}

/* ─────────────── صحنه تمام‌صفحه با برش مورب ─────────────── */

export function AuthCard({ initialMode = "login" }: { initialMode?: Mode }) {
  const t = useT();
  const tf = templateT(t);
  const [tab, setTab] = useState<Tab>("client");
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  /* مسیر عضویت وکیل — فقط در تب وکیلِ register استفاده می‌شود */
  const [lawyerTrack, setLawyerTrack] = useState<LawyerTrack>("wakil");
  const [lawyerCity, setLawyerCity] = useState("");
  /* ثبت‌نام مستقیم وکیل رسمی — نوع عضویت (کانون/مرکز وکلا)، پروانه و استان */
  const [barType, setBarType] = useState<"kanoon" | "markaz" | null>(null);
  const [licenseNo, setLicenseNo] = useState("");
  const [province, setProvince] = useState("");
  const [wakilDone, setWakilDone] = useState(false);
  /* تخصص‌ها + گزینهٔ اختیاری «وکیل کارمندان و کارهای اداری» — فرم ثبت‌نام کارآموز */
  const [lawyerSpecs, setLawyerSpecs] = useState<string[]>([]);
  const [employeeLawyer, setEmployeeLawyer] = useState(false);
  /* زیرجریان‌های پیامکی تب موکلِ login — با رمز عبور، یا کد پیامکی، یا بازیابی رمز */
  const [loginFlow, setLoginFlow] = useState<"password" | "otp">("password");
  const [forgotOpen, setForgotOpen] = useState(false);
  /* ثبت‌نام با تأیید شماره — مرحلهٔ فرم ← کد ۵ رقمی پیامکی ← ساخت حساب */
  const [regStage, setRegStage] = useState<"form" | "code">("form");
  const [regCode, setRegCode] = useState("");
  const [regDevCode, setRegDevCode] = useState<string | null>(null);
  const regCooldown = useCooldown(60, regStage === "code");

  /* تیغه: یک انیمیشن در هر لحظه؛ سوییچ محتوا زیر پوشش کامل آن */
  const [sweep, setSweep] = useState<{ dir: 1 | -1; id: number; mode: Mode; tab: Tab } | null>(null);
  const busyRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const sweepIdRef = useRef(0);

  /* «مرا به خاطر بسپار» — پیش‌پرکردن واقعی شناسه از localStorage.
     عمداً sync است تا قبل از اولین paint پر شود؛ الگوی استاندارد prefill */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dadban:remember");
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIdentifier(saved);
        setRemember(true);
      }
    } catch {}
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const pwScore = useMemo(() => {
    if (!password) return 0;
    return [
      password.length >= 8,
      /\d/.test(password) && /[a-zA-Zآ-ی]/.test(password),
      password.length >= 10,
      /[^A-Za-z0-9آ-ی]/.test(password),
    ].filter(Boolean).length;
  }, [password]);

  /** شروع جاروی تیغه؛ محتوا در میانه راه (زیر پوشش کامل) سوییچ می‌شود */
  const sweepTo = (nextMode: Mode, nextTab: Tab) => {
    if (busyRef.current || (nextMode === mode && nextTab === tab)) return;
    busyRef.current = true;
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    const dir: 1 | -1 = nextMode === "register" ? 1 : -1;
    const id = ++sweepIdRef.current;
    setSweep({ dir, id, mode: nextMode, tab: nextTab });
    timersRef.current.push(
      window.setTimeout(() => {
        setMode(nextMode);
        setTab(nextTab);
        setError("");
        setNotice("");
        setLoginFlow("password");
        setForgotOpen(false);
        setRegStage("form");
        setRegCode("");
        setRegDevCode(null);
        setWakilDone(false);
        try {
          window.history.replaceState(null, "", nextMode === "register" ? "/register" : "/login");
        } catch {}
      }, 420),
    );
  };

  const finishSweep = () => {
    setSweep(null);
    busyRef.current = false;
  };

  /** اسپات‌لایت دنبال‌کننده موس روی ستون فرم */
  const trackSpotlight = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const safeRedirect = () => {
    const wanted = new URLSearchParams(window.location.search).get("redirect");
    return wanted && wanted.startsWith("/") && !wanted.startsWith("//") ? wanted : null;
  };

  /** بعد از احراز هویت، ناوبری کامل (نه SPA) تا کوکی سشن حتماً در درخواست RSC داشبورد اعمال شود */
  const hardNavigate = (target: string) => {
    window.location.assign(target);
  };

  /**
   * مقصد نهایی بعد از ورود — نقش همیشه برنده است:
   * پارامتر ?redirect= فقط وقتی honored می‌شود که با نقش کاربر هم‌ناحیه باشد.
   * (تلهٔ گزارش‌شده: بعد از خروج از پنل موکل، proxy آدرس /login?redirect=/dashboard/client
   * می‌سازد و وکیلی که بعداً از همین صفحه وارد می‌شد به‌اجبار به پنل موکل فرستاده می‌شد.)
   */
  const destinationFor = (role: string | null | undefined) => {
    const wanted = safeRedirect();
    return isRedirectSafeForRole(role, wanted) && wanted ? wanted : panelHomeForRole(role);
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = toEnDigits(identifier).trim();
    if (!id || !password || loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: id, password }),
        signal: AbortSignal.timeout(25_000), // هیچ دکمه‌ای نباید برای همیشه لودینگ بماند
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        try {
          if (remember) localStorage.setItem("dadban:remember", id);
          else localStorage.removeItem("dadban:remember");
        } catch {}
        if (tab === "lawyer" && !isLawyerSideRole(data.user?.role)) {
          setNotice(t("این حساب به‌عنوان «وکیل» ثبت نشده است — از تب «موکل» برای ورود استفاده کنید."));
          setTab("client");
          setLoading(false);
          return;
        }
        hardNavigate(destinationFor(data.user?.role));
        return; // در حال هدایت — لودینگ باقی می‌ماند
      }
      setError(data.error ?? t("خطا در ورود"));
    } catch (err) {
      setError(err instanceof Error && err.name === "TimeoutError" ? t("پاسخ سرور بیش از حد طول کشید؛ لطفاً دوباره تلاش کنید.") : t("خطا در ارتباط با سرور"));
    }
    setLoading(false);
  };

  /** درخواست کد تأیید شماره (purpose=register) — مشترک بین فرم موکل و کارآموز */
  const requestRegisterOtp = async (mobile: string): Promise<void> => {
    if (loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile, purpose: "register" }),
        signal: AbortSignal.timeout(25_000),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setRegCode("");
        setRegStage("code");
        setRegDevCode(data.dev ? String(data.devCode ?? "") : null);
        setNotice(data.dev ? "" : t("کد تأیید ۵ رقمی پیامک شد؛ صندوق پیامک را بررسی کنید."));
        setLoading(false); // ⚠️ حیاتی: بدون این، دکمهٔ «تأیید و ورود» مرحلهٔ کد در «در حال بررسی…» گیر می‌کند و کاربر هرگز نمی‌تواند کد را ثبت کند (باگ گزارش‌شدهٔ پروداکشن)
        return;
      }
      setError(data.error ?? t("ارسال کد تأیید ناموفق بود."));
    } catch (err) {
      setError(err instanceof Error && err.name === "TimeoutError" ? t("پاسخ سرور بیش از حد طول کشید؛ لطفاً دوباره تلاش کنید.") : t("خطا در ارتباط با سرور"));
    }
    setLoading(false);
  };

  /** بازگشت از مرحلهٔ کد به فرم ثبت‌نام برای اصلاح اطلاعات */
  const backToRegisterForm = () => {
    setRegStage("form");
    setRegCode("");
    setRegDevCode(null);
    setError("");
    setNotice("");
    setLoading(false);
  };

  /** ثبت‌نام موکل با تأیید شماره — مرحلهٔ ۱: کد پیامکی · مرحلهٔ ۲: کد ۵ رقمی + ساخت حساب */
  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const mobile = toEnDigits(phone).trim();
    if (!name.trim() || !mobile || !password || loading) return;
    if (!/^09\d{9}$/.test(mobile)) {
      setError(t("شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد."));
      return;
    }
    if (password.length < 8) {
      setError(t("رمز عبور باید حداقل ۸ کاراکتر باشد."));
      return;
    }
    // مرحلهٔ ۱ — تأیید شماره با کد پیامکی
    if (regStage === "form") {
      await requestRegisterOtp(mobile);
      return;
    }
    // مرحلهٔ ۲ — بررسی کد ۵ رقمی و ساخت حساب
    const c = toEnDigits(regCode).replace(/\D/g, "");
    if (c.length !== 5) {
      setError(t("کد ۵ رقمی را کامل وارد کنید."));
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: mobile, password, code: c }),
        signal: AbortSignal.timeout(25_000),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        // سشن server-side ست شده — ناوبری کامل مثل بعد از لاگین
        hardNavigate(destinationFor(data.user?.role ?? "client"));
        return; // در حال هدایت — لودینگ باقی می‌ماند
      }
      setError(data.error ?? t("خطا در ثبت‌نام"));
    } catch (err) {
      setError(err instanceof Error && err.name === "TimeoutError" ? t("پاسخ سرور بیش از حد طول کشید؛ لطفاً دوباره تلاش کنید.") : t("خطا در ارتباط با سرور"));
    }
    setLoading(false);
  };

  /** ثبت‌نام مستقیم کارآموز وکالت با تأیید شماره — حساب role=lawyer + پروفایل کارآموز + سشن */
  const submitKaramooz = async (e: React.FormEvent) => {
    e.preventDefault();
    const mobile = toEnDigits(phone).trim();
    if (!name.trim() || !mobile || !password || loading) return;
    if (!/^09\d{9}$/.test(mobile)) {
      setError(t("شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد."));
      return;
    }
    if (password.length < 8) {
      setError(t("رمز عبور باید حداقل ۸ کاراکتر باشد."));
      return;
    }
    if (!lawyerSpecs.length) {
      setError(t("حداقل یک تخصص انتخاب کنید."));
      return;
    }
    // مرحلهٔ ۱ — تأیید شماره با کد پیامکی
    if (regStage === "form") {
      await requestRegisterOtp(mobile);
      return;
    }
    // مرحلهٔ ۲ — بررسی کد ۵ رقمی و ساخت حساب وکیل کارآموز
    const c = toEnDigits(regCode).replace(/\D/g, "");
    if (c.length !== 5) {
      setError(t("کد ۵ رقمی را کامل وارد کنید."));
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: mobile,
          password,
          code: c,
          lawyerType: lawyerTrack === "expert" ? "expert" : "karamooz",
          specialties: lawyerSpecs,
          employeeLawyer,
          ...(lawyerCity ? { city: lawyerCity } : {}),
        }),
        signal: AbortSignal.timeout(25_000),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        // سشن server-side ست شده — ناوبری کامل مثل بعد از لاگین (نقش وکیل → پنل وکیل)
        hardNavigate(destinationFor("lawyer"));
        return;
      }
      setError(data.error ?? t("خطا در ثبت‌نام"));
    } catch (err) {
      setError(err instanceof Error && err.name === "TimeoutError" ? t("پاسخ سرور بیش از حد طول کشید؛ لطفاً دوباره تلاش کنید.") : t("خطا در ارتباط با سرور"));
    }
    setLoading(false);
  };

  /** ثبت‌نام مستقیم وکیل رسمی (کانون/مرکز وکلا) — فرم: نوع عضویت، پروانه، استان، نام، موبایل، رمز ← کد تأیید ← درخواست pending برای مدیر */
  const submitWakil = async (e: React.FormEvent) => {
    e.preventDefault();
    const mobile = toEnDigits(phone).trim();
    if (loading) return;
    if (!barType) {
      setError(t("نوع عضویت (کانون وکلا یا مرکز وکلا) را انتخاب کنید."));
      return;
    }
    if (licenseNo.trim().length < 2) {
      setError(t("شماره پروانه وکالت را وارد کنید."));
      return;
    }
    if (!province) {
      setError(t("استان را انتخاب کنید."));
      return;
    }
    if (!name.trim() || !mobile || !password) return;
    if (!/^09\d{9}$/.test(mobile)) {
      setError(t("شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد."));
      return;
    }
    if (password.length < 8) {
      setError(t("رمز عبور باید حداقل ۸ کاراکتر باشد."));
      return;
    }
    // مرحلهٔ ۱ — تأیید شماره با کد پیامکی
    if (regStage === "form") {
      await requestRegisterOtp(mobile);
      return;
    }
    // مرحلهٔ ۲ — بررسی کد ۵ رقمی و ثبت درخواست عضویت
    const c = toEnDigits(regCode).replace(/\D/g, "");
    if (c.length !== 5) {
      setError(t("کد ۵ رقمی را کامل وارد کنید."));
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/lawyer-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barType,
          licenseNo: licenseNo.trim(),
          province,
          name: name.trim(),
          phone: mobile,
          password,
          code: c,
        }),
        signal: AbortSignal.timeout(25_000),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        // سشن صادر شد؛ درخواست «در انتظار تأیید مدیر» است — صفحهٔ موفقیت داخل همان کارت
        setWakilDone(true);
        setRegStage("form");
        setRegCode("");
        setRegDevCode(null);
        setLoading(false);
        return;
      }
      setError(data.error ?? t("خطا در ثبت‌نام"));
    } catch (err) {
      setError(err instanceof Error && err.name === "TimeoutError" ? t("پاسخ سرور بیش از حد طول کشید؛ لطفاً دوباره تلاش کنید.") : t("خطا در ارتباط با سرور"));
    }
    setLoading(false);
  };

  const heading =
    tab === "lawyer"
      ? mode === "login"
        ? { title: "ورود وکلا", sub: "با شماره موبایل یا ایمیلِ حساب وکیل خود وارد شوید." }
        : lawyerTrack === "karamooz"
          ? { title: "عضویت کارآموز وکالت", sub: "حساب و پروفایل کارآموزی شما فوری ساخته می‌شود." }
          : lawyerTrack === "expert"
            ? { title: "عضویت کارشناس حقوقی", sub: "مشاوره، قرارداد و اسناد — بدون وکالت در دادگاه؛ حساب شما فوری ساخته می‌شود." }
            : { title: "عضویت وکلا", sub: "فرم زیر را کامل کنید؛ پس از تأیید شمارهٔ موبایل، درخواستتان برای تأیید مدیران ارسال می‌شود و پنل وکیل فعال می‌گردد." }
      : mode === "login" && loginFlow === "otp"
          ? { title: "ورود با کد پیامکی", sub: "به‌جای رمز عبور، یک کد ۶ رقمی به موبایل شما می‌فرستیم." }
          : mode === "login"
            ? { title: "ورود به حساب", sub: "به پرونده‌ها، مشاوره‌ها و اسناد خود دسترسی داشته باشید." }
            : { title: "ساخت حساب موکل", sub: "رایگان ثبت‌نام کنید و پرونده‌تان را همین امروز شروع کنید." };

  const banner =
    error ? { tone: "danger" as const, text: error }
    : notice ? { tone: "warn" as const, text: notice }
    : null;

  return (
    <div className="auth-root relative min-h-[100svh] w-full overflow-hidden bg-[var(--auth-form-bg)]">
      <div className="grid min-h-[100svh] lg:grid-cols-[44fr_56fr]">
        {/* ══ ستون فرم (راست در RTL) — زمینه خود تم سایت ══ */}
        <section
          className="auth-spotlight relative flex flex-col px-5 pb-12 pt-5 sm:px-10 lg:justify-center lg:pb-10"
          onMouseMove={trackSpotlight}
        >
          <BrandBand mode={mode} />

          <div className="auth-enter-form mx-auto w-full max-w-md lg:my-auto">
            <div className="auth-stagger">
              {/* بازگشت به خانه */}
              <div className="mb-6 flex justify-start">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold text-[var(--auth-ink-soft)] transition-colors hover:text-[var(--accent-text)]"
                >
                  <Icon name="arrow" className="h-4 w-4 -scale-x-100" />
                  {t("بازگشت به صفحه اصلی")}
                </Link>
              </div>

              {/* تب نوع حساب */}
              <div role="tablist" aria-label={t("نوع حساب")} className="mb-8 grid grid-cols-2 gap-1 rounded-full bg-[color-mix(in_oklab,var(--primary)_8%,var(--auth-form-bg))] p-1 ring-1 ring-[var(--border)]">
                {TABS.map((tb) => (
                  <button
                    key={tb.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === tb.id}
                    onClick={() => sweepTo(mode, tb.id)}
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-extrabold transition-all duration-300 ${
                      tab === tb.id
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md"
                        : "text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)]"
                    }`}
                  >
                    <Icon name={tb.icon} className="h-4 w-4" />
                    {t(tb.label)}
                  </button>
                ))}
              </div>

              {/* سرتیتر + خط طلایی */}
              <h2 className="text-[1.5rem] font-black text-[var(--auth-ink)]">{t(heading.title)}</h2>
              <span aria-hidden className="mt-3 block h-[3px] w-12 rounded-full bg-gradient-to-l from-[var(--accent)] to-[var(--auth-gold)]" />
              <p className="mt-3 text-[13px] leading-7 text-[var(--auth-ink-soft)]">{t(heading.sub)}</p>

              {/* دکمهٔ بزرگ «درخواست عضویت و ثبت‌نام» — بالای فرم، بدون اسکرول کاملاً دیده می‌شود (بازخورد: پیدا کردنش سخت بود) */}
              {mode === "login" && (
                <button
                  type="button"
                  data-testid="register-cta"
                  onClick={() => sweepTo("register", tab)}
                  className="btn-press group mt-5 flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-l from-[var(--auth-gold)] via-[var(--accent)] to-[var(--accent-hover)] p-4 text-start shadow-[0_16px_36px_-14px_rgba(176,125,18,0.55)] transition-all hover:shadow-[0_20px_44px_-14px_rgba(176,125,18,0.7)] sm:p-5"
                >
                  <span className="flex items-center gap-3.5">
                    <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/35 ring-1 ring-white/50">
                      <Icon name="user-plus" className="h-6 w-6 text-[var(--accent-foreground)]" />
                    </span>
                    <span>
                      <span className="block text-[15px] font-black leading-6 text-[var(--accent-foreground)] sm:text-base">{t("درخواست عضویت و ثبت‌نام")}</span>
                      <span className="mt-0.5 block text-[11px] font-bold leading-5 text-[var(--accent-foreground)] opacity-80">{t("موکل، وکیل، کارآموز وکالت یا کارشناس حقوقی — رایگان")}</span>
                    </span>
                  </span>
                  <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/35 ring-1 ring-white/50 transition-transform duration-300 group-hover:-translate-x-1">
                    <Icon name="arrow" className="h-4 w-4 text-[var(--accent-foreground)]" />
                  </span>
                </button>
              )}

              {/* بنر خطا / اطلاع */}
              {banner && (
                <div
                  role="alert"
                  className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs font-bold leading-6 ${
                    banner.tone === "danger"
                      ? "border-[#b42318]/25 bg-[#b42318]/[0.06] text-[#b42318] dark:border-[#f87171]/30 dark:bg-[#f87171]/[0.08] dark:text-[#f87171]"
                      : "border-[var(--accent)]/30 bg-[var(--accent)]/[0.08] text-[var(--accent-text)]"
                  }`}
                >
                  <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                  {banner.text}
                </div>
              )}

              {/* ── فرم‌ها ── */}
              {tab === "client" && mode === "login" && !forgotOpen && loginFlow === "password" && (
                <form onSubmit={submitLogin} className="mt-7 space-y-5" noValidate>
                  <AuthField label={t("موبایل یا ایمیل")} icon="user">
                    <input
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="09123456789"
                      autoComplete="username"
                      dir="ltr"
                      style={{ textAlign: "right" }}
                    />
                  </AuthField>
                  <AuthPwField idPrefix="login" value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw((v) => !v)} />
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex min-h-11 cursor-pointer select-none items-center gap-2 text-xs font-bold text-[var(--auth-ink-soft)]">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden
                        className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ring)] ${
                          remember
                            ? "border-[var(--primary)] bg-[var(--primary)]"
                            : "border-[var(--auth-line)] bg-transparent"
                        }`}
                      >
                        {remember && <Icon name="check" className="h-3 w-3 text-[var(--primary-foreground)]" strokeWidth={3.2} />}
                      </span>
                      {t("مرا به خاطر بسپار")}
                    </label>
                    <button
                      type="button"
                      data-testid="forgot-link"
                      onClick={() => {
                        setLoginFlow("password");
                        setForgotOpen(true);
                        setError("");
                        setNotice("");
                      }}
                      className="text-xs font-extrabold text-[var(--accent-text)] transition-colors hover:text-[var(--auth-gold)]"
                    >
                      {t("فراموشی رمز؟")}
                    </button>
                  </div>
                  <AuthSubmit loading={loading} label={t("ورود به دادورزان")} loadingLabel={t("در حال ورود…")} />
                  {/* ورود جایگزین با کد پیامکی — بدون رمز عبور */}
                  <button
                    type="button"
                    data-testid="otp-login-btn"
                    onClick={() => {
                      setForgotOpen(false);
                      setLoginFlow("otp");
                      setError("");
                      setNotice("");
                    }}
                    className="btn-press flex h-12 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-[var(--auth-line)] text-sm font-extrabold text-[var(--auth-ink)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent-text)]"
                  >
                    <Icon name="chat" className="h-4 w-4" />
                    {t("ورود با کد پیامکی")}
                  </button>
                </form>
              )}

              {/* ورود با کد پیامکی — زیرجریان: شماره ← کد ۶ رقمی ← ورود */}
              {tab === "client" && mode === "login" && !forgotOpen && loginFlow === "otp" && (
                <OtpLoginFlow
                  onSuccess={(role) => hardNavigate(destinationFor(role))}
                  onBack={() => {
                    setLoginFlow("password");
                    setError("");
                    setNotice("");
                  }}
                />
              )}

              {tab === "client" && mode === "register" && (
                <form onSubmit={submitRegister} className="mt-7 space-y-5" noValidate>
                  <AuthField label={t("نام و نام خانوادگی")} icon="id">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("مثلاً سارا محمدی")}
                      autoComplete="name"
                    />
                  </AuthField>
                  <AuthField label={t("شماره موبایل")} icon="phone">
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09123456789"
                      inputMode="tel"
                      autoComplete="tel"
                      dir="ltr"
                      style={{ textAlign: "right" }}
                    />
                  </AuthField>
                  <div>
                    <AuthPwField idPrefix="register" value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw((v) => !v)} autoComplete="new-password" />
                    {password && (
                      <span className="mt-2.5 flex items-center gap-2.5">
                        <span className="flex flex-1 gap-1">
                          {[1, 2, 3, 4].map((i) => (
                            <span
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                                i <= pwScore
                                  ? pwScore === 1
                                    ? "bg-[#b42318]"
                                    : pwScore === 2
                                      ? "bg-[var(--accent)]"
                                      : pwScore === 3
                                        ? "bg-[var(--success)]"
                                        : "bg-success"
                                  : "bg-[var(--auth-line)]"
                              }`}
                            />
                          ))}
                        </span>
                        <span className="text-[10px] font-extrabold text-[var(--auth-ink-soft)]">
                          {t(["", "ضعیف", "متوسط", "خوب", "عالی"][pwScore])}
                        </span>
                      </span>
                    )}
                  </div>
                  {regStage === "code" && (
                    <RegisterOtpStep
                      devCode={regDevCode}
                      phoneFa={faNum(toEnDigits(phone).trim())}
                      code={regCode}
                      onCodeChange={setRegCode}
                      cooldown={regCooldown}
                      onResend={() => void requestRegisterOtp(toEnDigits(phone).trim())}
                      onBack={backToRegisterForm}
                    />
                  )}
                  <AuthSubmit
                    loading={loading}
                    label={regStage === "form" ? t("تأیید شماره و ادامه") : t("تأیید کد و ورود")}
                    loadingLabel={regStage === "form" ? t("در حال ارسال کد…") : t("در حال بررسی کد…")}
                  />
                </form>
              )}

              {tab === "lawyer" && mode === "login" && (
                <form onSubmit={submitLogin} className="mt-7 space-y-5" noValidate>
                  <AuthField label={t("موبایل یا ایمیل حساب وکیل")} icon="briefcase">
                    <input
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="09123456789"
                      autoComplete="username"
                      dir="ltr"
                      style={{ textAlign: "right" }}
                    />
                  </AuthField>
                  <AuthPwField idPrefix="lawyer" value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw((v) => !v)} />
                  <AuthSubmit loading={loading} label={t("ورود به پنل وکیل")} loadingLabel={t("در حال ورود…")} />
                  <p className="text-center">
                    <button
                      type="button"
                      data-testid="lawyer-forgot-link"
                      onClick={() => {
                        setForgotOpen(true);
                        setError("");
                        setNotice("");
                      }}
                      className="text-xs font-extrabold text-[var(--accent-text)] transition-colors hover:text-[var(--auth-gold)]"
                    >
                      {t("رمز عبور را فراموش کرده‌اید؟ بازیابی رمز")}
                    </button>
                  </p>
                </form>
              )}

              {tab === "lawyer" && mode === "register" && (
                <div className="mt-7 space-y-5">
                  {/* انتخاب مسیر: وکیل رسمی (احراز هویت) یا کارآموز وکالت (ثبت‌نام مستقیم) */}
                  <div role="radiogroup" aria-label={t("نوع عضویت وکیل")} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {([
                      { id: "wakil" as const, icon: "gavel" as const, title: "وکیل رسمی", desc: "دارای پروانه وکالت" },
                      { id: "karamooz" as const, icon: "book" as const, title: "کارآموز وکالت", desc: "ثبت‌نام فوری" },
                      { id: "expert" as const, icon: "certificate" as const, title: "کارشناس حقوقی", desc: "مشاوره، قرارداد و اسناد" },
                    ]).map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={lawyerTrack === o.id}
                        onClick={() => setLawyerTrack(o.id)}
                        className={`btn-press rounded-2xl border p-3.5 text-start transition-all duration-300 ${
                          lawyerTrack === o.id
                            ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] shadow-[0_10px_24px_-14px_rgba(176,125,18,0.55)]"
                            : "border-[var(--border)] bg-[color-mix(in_oklab,var(--primary)_4%,transparent)] hover:border-[color-mix(in_oklab,var(--accent)_45%,transparent)]"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                            lawyerTrack === o.id
                              ? "bg-[var(--accent)] text-white"
                              : "bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-[var(--auth-ink-soft)]"
                          }`}
                        >
                          <Icon name={o.icon} className="h-[18px] w-[18px]" />
                        </span>
                        <span className={`mt-2.5 block text-[13px] font-extrabold ${lawyerTrack === o.id ? "text-[var(--auth-ink)]" : "text-[var(--auth-ink-soft)]"}`}>
                          {t(o.title)}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-5 text-[var(--auth-ink-soft)]">{t(o.desc)}</span>
                      </button>
                    ))}
                  </div>

                  {lawyerTrack === "wakil" ? (
                    /* ── مسیر وکیل رسمی — ثبت‌نام مستقیم: نوع عضویت، پروانه، استان، نام، موبایل، رمز ← کد تأیید ── */
                    <form onSubmit={submitWakil} className="space-y-5" noValidate data-testid="wakil-register-form">
                      {wakilDone ? (
                        <div className="rounded-2xl border border-[color-mix(in_oklab,var(--success)_35%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)] p-6 text-center" data-testid="wakil-done">
                          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[var(--success)]">
                            <Icon name="check" className="h-6 w-6" />
                          </span>
                          <p className="mt-3 text-base font-black text-[var(--auth-ink)]">{t("ثبت‌نام شما کامل شد")}</p>
                          <p className="mt-2 text-xs leading-6 text-[var(--auth-ink-soft)]">
                            {t("شمارهٔ موبایل شما تأیید شد و درخواست عضویت به‌همراه مشخصات پروانه برای بررسی و تأیید مدیران ارسال شد؛ به‌محض تأیید، پنل وکیل شما فعال می‌شود.")}
                          </p>
                          <a
                            href="/dashboard/client"
                            className="btn-press mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] text-sm font-extrabold text-[var(--primary-foreground)] shadow-[0_14px_30px_-12px_rgba(21,54,93,0.55)] transition-all hover:bg-[var(--primary-hover)]"
                          >
                            <Icon name="home" className="h-4 w-4" />
                            {t("ورود به پنل کاربری")}
                          </a>
                          <p className="mt-3 text-[11px] leading-5 text-[var(--auth-ink-soft)]">
                            {t("وضعیت درخواست و نتیجهٔ بررسی از همین پنل قابل پیگیری است.")}
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* نوع عضویت — گزینهٔ تیک‌خور: کانون وکلا یا مرکز وکلا */}
                          <fieldset>
                            <legend className="mb-1.5 block text-[11px] font-extrabold text-[var(--auth-ink-soft)]">{t("نوع وکیل")} *</legend>
                            <div role="radiogroup" aria-label={t("نوع وکیل")} className="grid grid-cols-2 gap-3">
                              {([
                                { id: "kanoon" as const, title: "وکیل کانون وکلا", desc: "عضو کانون وکلای دادگستری" },
                                { id: "markaz" as const, title: "وکیل مرکز وکلا", desc: "عضو مرکز وکلای دادگستری" },
                              ]).map((o) => {
                                const checked = barType === o.id;
                                return (
                                  <button
                                    key={o.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={checked}
                                    onClick={() => setBarType(o.id)}
                                    data-testid={`bar-${o.id}`}
                                    className={`btn-press flex items-start gap-2.5 rounded-2xl border p-3.5 text-start transition-all duration-300 ${
                                      checked
                                        ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] shadow-[0_10px_24px_-14px_rgba(176,125,18,0.55)]"
                                        : "border-[var(--border)] bg-[color-mix(in_oklab,var(--primary)_4%,transparent)] hover:border-[color-mix(in_oklab,var(--accent)_45%,transparent)]"
                                    }`}
                                  >
                                    <span
                                      aria-hidden
                                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                                        checked ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--auth-line)] bg-transparent"
                                      }`}
                                    >
                                      {checked && <Icon name="check" className="h-3.5 w-3.5" />}
                                    </span>
                                    <span>
                                      <span className={`block text-[13px] font-extrabold ${checked ? "text-[var(--auth-ink)]" : "text-[var(--auth-ink-soft)]"}`}>
                                        {t(o.title)}
                                      </span>
                                      <span className="mt-0.5 block text-[11px] leading-5 text-[var(--auth-ink-soft)]">{t(o.desc)}</span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </fieldset>

                          {/* شماره پروانه وکالت */}
                          <AuthField label={t("شماره پروانه وکالت")} icon="id">
                            <input
                              value={licenseNo}
                              onChange={(e) => setLicenseNo(e.target.value)}
                              placeholder={t("مثال: 12345")}
                              dir="ltr"
                              style={{ textAlign: "right" }}
                              maxLength={60}
                              data-testid="wakil-license"
                            />
                          </AuthField>

                          {/* استان — کومبوباکس با جستجوی زنده */}
                          <div>
                            <label htmlFor="wakil-province" className="mb-1.5 block text-[11px] font-extrabold text-[var(--auth-ink-soft)]">
                              {t("استان")} *
                            </label>
                            <ProvinceCombobox id="wakil-province" value={province} onChange={setProvince} />
                          </div>

                          <AuthField label={t("نام و نام خانوادگی")} icon="user">
                            <input
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder={t("مثلاً رضا کریمی")}
                              autoComplete="name"
                              data-testid="wakil-name"
                            />
                          </AuthField>

                          <AuthField label={t("شماره موبایل")} icon="phone">
                            <input
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="09123456789"
                              inputMode="tel"
                              autoComplete="tel"
                              dir="ltr"
                              style={{ textAlign: "right" }}
                              data-testid="wakil-phone"
                            />
                          </AuthField>

                          <AuthPwField idPrefix="wakil" value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw((v) => !v)} autoComplete="new-password" />

                          {regStage === "code" && (
                            <RegisterOtpStep
                              devCode={regDevCode}
                              phoneFa={faNum(toEnDigits(phone).trim())}
                              code={regCode}
                              onCodeChange={setRegCode}
                              cooldown={regCooldown}
                              onResend={() => void requestRegisterOtp(toEnDigits(phone).trim())}
                              onBack={backToRegisterForm}
                            />
                          )}

                          {regStage === "form" && (
                            <p className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--primary)_5%,transparent)] p-3 text-[11px] font-bold leading-6 text-[var(--auth-ink-soft)]">
                              {t("با تأیید شماره، حساب شما ساخته و درخواست عضویت با مشخصات پروانه برای تأیید مدیران ارسال می‌شود؛ پس از تأیید، پنل وکیل شما فعال می‌گردد.")}
                            </p>
                          )}

                          <AuthSubmit
                            loading={loading}
                            label={regStage === "form" ? t("تأیید شماره و ادامه") : t("تأیید کد و ثبت درخواست")}
                            loadingLabel={regStage === "form" ? t("در حال ارسال کد…") : t("در حال بررسی کد…")}
                          />
                        </>
                      )}
                      <p className="text-center text-xs text-[var(--auth-ink-soft)]">
                        {t("پروانه‌تان قبلاً تأیید شده؟")}{" "}
                        <button type="button" onClick={() => sweepTo("login", "lawyer")} className="font-extrabold text-[var(--accent-text)] hover:underline">
                          {t("ورود وکیل")}
                        </button>
                      </p>
                    </form>
                  ) : (
                    /* ── مسیر کارآموز وکالت — فرم ثبت‌نام مستقیم ── */
                    <form onSubmit={submitKaramooz} className="space-y-5" noValidate>
                      <AuthField label={t("نام و نام خانوادگی")} icon="id">
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={t("مثلاً رضا کریمی")}
                          autoComplete="name"
                        />
                      </AuthField>
                      <AuthField label={t("شماره موبایل")} icon="phone">
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="09123456789"
                          inputMode="tel"
                          autoComplete="tel"
                          dir="ltr"
                          style={{ textAlign: "right" }}
                        />
                      </AuthField>
                      <AuthPwField idPrefix="karamooz" value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw((v) => !v)} autoComplete="new-password" />
                      <label className="block">
                        <span className="mb-1.5 block text-[11px] font-extrabold text-[var(--auth-ink-soft)]">{t("شهر (اختیاری)")}</span>
                        <span className="relative block">
                          <Icon name="location" className="pointer-events-none absolute right-0 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--auth-ink-soft)]" />
                          <select
                            value={lawyerCity}
                            onChange={(e) => setLawyerCity(e.target.value)}
                            className="h-12 w-full appearance-none border-0 border-b-[1.5px] border-[var(--auth-line)] bg-transparent ps-10 pe-6 text-[0.925rem] font-semibold text-[var(--auth-ink)] outline-none transition-colors duration-300 focus:border-[var(--accent)]"
                          >
                            <option value="">{t("انتخاب شهر — اختیاری")}</option>
                            {POPULAR_CITIES.map((c) => (
                              <option key={c} value={c}>
                                {t(c)}
                              </option>
                            ))}
                          </select>
                          <Icon name="chevron" className="pointer-events-none absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-[var(--auth-ink-soft)]" />
                        </span>
                      </label>

                      {/* تخصص‌ها — چیپ چندانتخابی (الزامی، حداکثر ۶ مورد) */}
                      <fieldset>
                        <legend className="mb-1.5 block text-[11px] font-extrabold text-[var(--auth-ink-soft)]">
                          {t("تخصص‌ها")} *{" "}
                          <span className="font-normal">
                            {tf("(حداکثر {m} مورد — انتخاب‌شده: {s})", { m: faNum(6), s: faNum(lawyerSpecs.length) })}
                          </span>
                        </legend>
                        <div className="flex flex-wrap gap-2">
                          {LEGAL_TOPICS.map((topic) => {
                            const active = lawyerSpecs.includes(topic.label);
                            const disabled = !active && lawyerSpecs.length >= 6;
                            return (
                              <button
                                key={topic.label}
                                type="button"
                                onClick={() => setLawyerSpecs((s) => (active ? s.filter((x) => x !== topic.label) : disabled ? s : [...s, topic.label]))}
                                aria-pressed={active}
                                disabled={disabled}
                                title={t(topic.hint)}
                                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-all ${
                                  active
                                    ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm"
                                    : disabled
                                      ? "cursor-not-allowed border-[var(--auth-line)] opacity-45 text-[var(--auth-ink-soft)]"
                                      : "border-[var(--auth-line)] text-[var(--auth-ink-soft)] hover:border-[var(--accent)] hover:text-[var(--auth-ink)]"
                                }`}
                              >
                                {active && <Icon name="check" className="h-3.5 w-3.5" />}
                                {t(topic.label)}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>

                      {/* گزینهٔ اختیاری — وکیل کارمندان و کارهای اداری (فقط مسیر کارآموز؛ برای کارشناس بی‌معنی است) */}
                      {lawyerTrack === "karamooz" && (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={employeeLawyer}
                        onClick={() => setEmployeeLawyer((v) => !v)}
                        data-testid="employee-lawyer-toggle"
                        className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-start transition-all ${
                          employeeLawyer
                            ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]"
                            : "border-[var(--border)] bg-[color-mix(in_oklab,var(--primary)_4%,transparent)] hover:border-[color-mix(in_oklab,var(--accent)_40%,transparent)]"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            employeeLawyer ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--auth-line)] bg-transparent"
                          }`}
                          aria-hidden
                        >
                          {employeeLawyer && <Icon name="check" className="h-3.5 w-3.5" />}
                        </span>
                        <span>
                          <span className={`block text-[13px] font-extrabold ${employeeLawyer ? "text-[var(--auth-ink)]" : "text-[var(--auth-ink-soft)]"}`}>
                            {t("وکیل کارمندان و کارهای اداری")}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-5 text-[var(--auth-ink-soft)]">
                            {t("برای پذیرش پرونده‌های کارکنان، ادارات و امور اداری — اختیاری")}
                          </span>
                        </span>
                      </button>
                      )}

                      {lawyerTrack === "expert" && (
                        <p className="rounded-xl border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)] p-3 text-[11px] font-bold leading-6 text-[var(--auth-ink-soft)]">
                          {t("کارشناس حقوقی: مشاوره متنی/صوتی/تصویری، تنظیم و بازبینی قرارداد و کمک به اسناد فعال است؛ پذیرش پرونده قضایی، پیشنهاد روی پرونده‌ها و توکیل مخصوص وکلای دادگستری است. پروفایل شما پس از تأیید مدارک در بخش کارشناسان نمایش داده می‌شود.")}
                        </p>
                      )}

                      <p className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--primary)_5%,transparent)] p-3 text-[11px] font-bold leading-6 text-[var(--auth-ink-soft)]">
                        {t("پس از ثبت‌نام وارد پنل وکیل می‌شوید؛ برای دیده‌شدن در فهرست وکلای سایت، مدارک را در بخش «احراز هویت» پنل بارگذاری کنید تا مدیر سایت بررسی و تأیید کند.")}
                      </p>
                      {regStage === "code" && (
                        <RegisterOtpStep
                          devCode={regDevCode}
                          phoneFa={faNum(toEnDigits(phone).trim())}
                          code={regCode}
                          onCodeChange={setRegCode}
                          cooldown={regCooldown}
                          onResend={() => void requestRegisterOtp(toEnDigits(phone).trim())}
                          onBack={backToRegisterForm}
                        />
                      )}
                      <AuthSubmit
                        loading={loading}
                        label={regStage === "form" ? t("تأیید شماره و ادامه") : t("تأیید کد و ساخت حساب")}
                        loadingLabel={regStage === "form" ? t("در حال ارسال کد…") : t("در حال بررسی کد…")}
                      />
                      <p className="text-center text-xs text-[var(--auth-ink-soft)]">
                        {t("پروانه‌تان قبلاً تأیید شده؟")}{" "}
                        <button type="button" onClick={() => sweepTo("login", "lawyer")} className="font-extrabold text-[var(--accent-text)] hover:underline">
                          {t("ورود وکیل")}
                        </button>
                      </p>
                    </form>
                  )}
                </div>
              )}

              {/* سوییچ بازگشت ثبت‌نام → ورود (در حالت ورود، دکمهٔ بزرگ بالای فرم نقش ثبت‌نام را دارد) */}
              {tab === "client" && mode === "register" && (
                <p className="mt-7 text-center text-xs text-[var(--auth-ink-soft)]">
                  {t("قبلاً ثبت‌نام کرده‌اید؟")}{" "}
                  <button type="button" onClick={() => sweepTo("login", tab)} className="auth-switch">
                    {t("وارد شوید")}
                  </button>
                </p>
              )}

              <p className="mt-4 text-center text-[10px] leading-5 text-[var(--auth-ink-soft)]">
                {t("با ورود یا ثبت‌نام،")}{" "}
                <Link href="/legal/terms" className="font-bold text-[var(--accent-text)] hover:underline">
                  {t("قوانین و مقررات")}
                </Link>{" "}
                {t("و")}{" "}
                <Link href="/legal/privacy" className="font-bold text-[var(--accent-text)] hover:underline">
                  {t("حریم خصوصی")}
                </Link>{" "}
                {t("دادورزان را می‌پذیرید.")}
              </p>
            </div>
          </div>
        </section>

        {/* ══ پنل برند (چپ در RTL) — برش مورب + درز طلایی ══ */}
        <aside className="auth-brand auth-enter-brand relative hidden lg:block">
          <div className="auth-seam" aria-hidden />
          <div className="auth-brand-clip absolute inset-0">
            <BrandPane mode={mode} priority />
          </div>
        </aside>
      </div>

      {/* پنجرهٔ کوچک فراموشی رمز — مشترک بین موکل و وکیل (رسمی/کارآموز/کارشناس) */}
      <ForgotPasswordDialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        onDone={(msg, phone) => {
          setForgotOpen(false);
          setLoginFlow("password");
          setNotice(msg);
          setError("");
          if (phone) setIdentifier(phone); // فیلد ورود با شمارهٔ همان حساب پر می‌شود
        }}
      />

      {/* ══ تیغه — جاروی تمام‌صفحه هنگام سوییچ؛ بدون حتی یک fade ══ */}
      {sweep && (
        <div
          key={sweep.id}
          aria-hidden
          className={`verso-blade ${sweep.dir === 1 ? "verso-blade--fwd" : "verso-blade--back"}`}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) finishSweep();
          }}
        >
          <span className="verso-blade-seam verso-blade-seam--tail" />
          <div className="verso-blade-inner">
            <div className="verso-blade-page">
              <BrandPane mode={sweep.mode} />
            </div>
          </div>
          <span className="verso-blade-seam verso-blade-seam--lead" />
        </div>
      )}
    </div>
  );
}

/* ─────────────── اجزای فرم ─────────────── */

function AuthField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: "user" | "briefcase" | "id" | "phone";
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-extrabold text-[var(--auth-ink-soft)]">{label}</span>
      <div className="verso-field">
        <Icon name={icon} className="pointer-events-none absolute right-0 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--auth-ink-soft)]" />
        {children}
      </div>
    </label>
  );
}

/** فیلد رمز عبور زیرخط‌دار با برچسب و دکمه نمایش/پنهان */
function AuthPwField({
  idPrefix,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  idPrefix: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete?: string;
}) {
  const inputId = `pw-${idPrefix}`;
  const pwT = useT();
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-[11px] font-extrabold text-[var(--auth-ink-soft)]">
        {pwT("رمز عبور")}
      </label>
      <div className="verso-field">
        <Icon name="lock" className="pointer-events-none absolute right-0 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--auth-ink-soft)]" />
        <input
          id={inputId}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          autoComplete={show ? "off" : autoComplete ?? "current-password"}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? pwT("پنهان‌کردن رمز") : pwT("نمایش رمز")}
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

/** دکمه قرصی سرمه‌ای (تم خود سایت) با اسپینر */
function AuthSubmit({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-press mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] text-sm font-extrabold text-[var(--primary-foreground)] shadow-[0_14px_30px_-12px_rgba(21,54,93,0.55)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[0_18px_36px_-12px_rgba(21,54,93,0.65)] disabled:opacity-60"
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
