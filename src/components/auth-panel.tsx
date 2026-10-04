"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";

type Tab = "client" | "lawyer";
type Mode = "login" | "register";

/** یکسان‌سازی ارقام فارسی/عربی به لاتین برای ارسال به API */
const toEnDigits = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

const TABS: { id: Tab; label: string; icon: "user" | "briefcase" }[] = [
  { id: "client", label: "موکل", icon: "user" },
  { id: "lawyer", label: "وکیل", icon: "briefcase" },
];

/** محتوای پنل برند (سبز) به تفکیک حالت — عیناً در تیغه هم رندر می‌شود تا جابه‌جایی بی‌درز باشد */
const BRAND: Record<Mode, { title: string; gold: string; sub: string }> = {
  login: {
    title: "خوش آمدید",
    gold: "دوباره.",
    sub: "پرونده‌ها، وکلا و دستیار حقوقی‌تان — دقیقاً همان‌جا که رها کردید.",
  },
  register: {
    title: "خوش آمدید",
    gold: "به دادبان.",
    sub: "حساب بسازید؛ وکیل متخصص، پیگیری شفاف پرونده و دستیار هوشمند، همین‌جا است.",
  },
};

const LAWYER_STEPS = [
  { title: "ارسال مدارک و شماره پروانه", desc: "از طریق پشتیبانی، پروانه وکالت و مدارک هویتی را ارسال کنید." },
  { title: "بررسی و احراز هویت", desc: "کارشناسان دادبان ظرف ۳ تا ۵ روز کاری راستی‌آزمایی می‌کنند." },
  { title: "فعال‌سازی پنل وکیل", desc: "پنل شما فعال می‌شود و درخواست‌های موکلان را دریافت می‌کنید." },
];

const TRUST_ITEMS = ["وکلای احراز هویت‌شده", "پیگیری شفاف", "پشتیبانی ۲۴/۷"];

/* ─────────────── پنل برند (سبز تیره + عکس هیرو) ─────────────── */

function BrandPane({ mode, priority = false }: { mode: Mode; priority?: boolean }) {
  const b = BRAND[mode];
  return (
    <div className="relative flex h-full flex-col justify-center overflow-hidden bg-[linear-gradient(150deg,#0b1f13_0%,var(--verso-green)_45%,var(--verso-green-2)_100%)] px-10 py-12">
      {/* عکس هیروی سایت — ترازوی طلایی (سمت راست تصویر) به‌صورت بافت کم‌رنگ */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-right opacity-30 dark:hidden"
        style={{
          backgroundImage: "url('/hero-bg-light.jpg')",
          maskImage: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.35) 45%, transparent 78%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.35) 45%, transparent 78%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 hidden bg-cover bg-right opacity-25 dark:block"
        style={{
          backgroundImage: "url('/hero-bg-dark.jpg')",
          maskImage: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.35) 45%, transparent 78%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.35) 45%, transparent 78%)",
        }}
      />
      {/* هاله طلایی */}
      <div
        aria-hidden
        className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full blur-2xl"
        style={{ background: "radial-gradient(closest-side, rgba(226,185,105,0.28), transparent)" }}
      />

      <div className="relative">
        <div className="auth-float w-fit">
          <div className="rounded-2xl bg-white p-2 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.6)] ring-1 ring-black/10">
            <Image
              src="/logo1.png"
              alt="لوگوی دادبان"
              width={96}
              height={96}
              priority={priority}
              className="h-auto w-[5.5rem] rounded-xl"
            />
          </div>
        </div>

        <p className="mt-9 text-[11px] font-extrabold tracking-[0.4em] text-[var(--verso-gold-bright)]">دادبان</p>
        <h1 className="mt-3 text-[2.5rem] font-black leading-[1.25] text-[#f6f2e6]">
          {b.title}{" "}
          <span className="text-[var(--verso-gold-bright)]">{b.gold}</span>
        </h1>
        <p className="mt-4 max-w-xs text-[13px] leading-7 text-white/65">{b.sub}</p>

        <ul className="mt-10 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-bold text-white/55">
          {TRUST_ITEMS.map((t, i) => (
            <li key={t} className="flex items-center gap-2.5">
              {i > 0 && <span aria-hidden className="text-[var(--verso-gold-bright)]">•</span>}
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─────────────── کارت اصلی ─────────────── */

export function AuthCard({ initialMode = "login" }: { initialMode?: Mode }) {
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

  const safeRedirect = () => {
    const wanted = new URLSearchParams(window.location.search).get("redirect");
    return wanted && wanted.startsWith("/") && !wanted.startsWith("//") ? wanted : null;
  };

  /** بعد از احراز هویت، ناوبری کامل (نه SPA) تا کوکی سشن حتماً در درخواست RSC داشبورد اعمال شود */
  const hardNavigate = (target: string) => {
    window.location.assign(target);
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
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        try {
          if (remember) localStorage.setItem("dadban:remember", id);
          else localStorage.removeItem("dadban:remember");
        } catch {}
        if (tab === "lawyer" && data.user?.role !== "lawyer") {
          setNotice("این حساب به‌عنوان «وکیل» ثبت نشده است — از تب «موکل» برای ورود استفاده کنید.");
          setTab("client");
          setLoading(false);
          return;
        }
        hardNavigate(safeRedirect() ?? (data.user?.role === "lawyer" ? "/dashboard/lawyer" : "/dashboard/client"));
        return; // در حال هدایت — لودینگ باقی می‌ماند
      }
      setError(data.error ?? "خطا در ورود");
    } catch {
      setError("خطا در ارتباط با سرور");
    }
    setLoading(false);
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const mobile = toEnDigits(phone).trim();
    if (!name.trim() || !mobile || !password || loading) return;
    if (!/^09\d{9}$/.test(mobile)) {
      setError("شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.");
      return;
    }
    if (password.length < 8) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشد.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: mobile, password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const login = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: mobile, password }),
        });
        if (login.ok) {
          hardNavigate(safeRedirect() ?? "/dashboard/client");
          return;
        }
        hardNavigate("/login");
        return;
      }
      setError(data.error ?? "خطا در ثبت‌نام");
    } catch {
      setError("خطا در ارتباط با سرور");
    }
    setLoading(false);
  };

  const heading =
    tab === "lawyer"
      ? mode === "login"
        ? { title: "ورود وکلا", sub: "با شماره موبایل یا ایمیلِ حساب وکیل خود وارد شوید." }
        : { title: "عضویت وکلا", sub: "پس از احراز هویت، پنل اختصاصی وکیل برای شما فعال می‌شود." }
      : mode === "login"
        ? { title: "ورود به حساب", sub: "به پرونده‌ها، مشاوره‌ها و اسناد خود دسترسی داشته باشید." }
        : { title: "ساخت حساب موکل", sub: "رایگان ثبت‌نام کنید و پرونده‌تان را همین امروز شروع کنید." };

  const banner =
    error ? { tone: "danger" as const, text: error }
    : notice ? { tone: "warn" as const, text: notice }
    : null;

  return (
    <div className="verso-card relative w-full overflow-hidden rounded-[26px] shadow-[var(--shadow-lift)] ring-1 ring-black/10 dark:ring-white/10 lg:rounded-[28px]">
      <div className="grid lg:grid-cols-2">
        {/* ══ سمت فرم (راست در RTL) — کرم روشن / سبز-زغالی در تم تیره ══ */}
        <div className="verso-form relative flex flex-col justify-center bg-[var(--verso-cream)] px-6 py-10 min-h-[560px] sm:px-10 sm:py-12 lg:min-h-[660px]">
          {/* برند موبایل (پنل سبز در موبایل مخفی است) */}
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <div className="rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-black/10">
              <Image src="/logo1.png" alt="لوگوی دادبان" width={40} height={40} priority className="h-9 w-9 rounded-lg" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black text-[var(--verso-ink)]">دادبان</p>
              <p className="text-[10px] font-bold text-[var(--verso-ink-soft)]">مرجع وکالت</p>
            </div>
          </div>

          {/* تب نوع حساب */}
          <div role="tablist" aria-label="نوع حساب" className="mb-8 grid grid-cols-2 gap-1 rounded-full bg-[var(--verso-cream-2)] p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => sweepTo(mode, t.id)}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-extrabold transition-all duration-300 ${
                  tab === t.id
                    ? "bg-[var(--verso-green)] text-[var(--verso-paper)] shadow-md"
                    : "text-[var(--verso-ink-soft)] hover:text-[var(--verso-ink)]"
                }`}
              >
                <Icon name={t.icon} className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* سرتیتر + خط طلایی */}
          <h2 className="text-[1.4rem] font-black text-[var(--verso-ink)]">{heading.title}</h2>
          <span aria-hidden className="mt-3 block h-[3px] w-10 rounded-full bg-gradient-to-l from-[var(--accent)] to-[var(--verso-gold-bright)]" />
          <p className="mt-3 text-xs leading-6 text-[var(--verso-ink-soft)] sm:text-[13px]">{heading.sub}</p>

          {/* بنر خطا / اطلاع */}
          {banner && (
            <div
              role="alert"
              className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs font-bold leading-6 ${
                banner.tone === "danger"
                  ? "border-[#b42318]/25 bg-[#b42318]/[0.06] text-[#b42318] dark:border-[#f87171]/30 dark:bg-[#f87171]/[0.08] dark:text-[#f87171]"
                  : "border-[var(--accent)]/30 bg-[var(--accent)]/[0.08] text-[var(--accent)]"
              }`}
            >
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              {banner.text}
            </div>
          )}

          {/* ── فرم‌ها ── */}
          {tab === "client" && mode === "login" && (
            <form onSubmit={submitLogin} className="mt-7 space-y-5" noValidate>
              <VersoField label="موبایل یا ایمیل" icon="user">
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="09123456789"
                  autoComplete="username"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                />
              </VersoField>
              <VersoPwField idPrefix="login" value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw((v) => !v)} />
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-bold text-[var(--verso-ink-soft)]">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                      remember
                        ? "border-[var(--verso-green)] bg-[var(--verso-green)]"
                        : "border-[var(--verso-line)] bg-transparent"
                    }`}
                  >
                    {remember && <Icon name="check" className="h-3 w-3 text-[var(--verso-paper)]" strokeWidth={3.2} />}
                  </span>
                  مرا به خاطر بسپار
                </label>
                <Link
                  href="/contact"
                  className="text-xs font-extrabold text-[var(--accent)] transition-colors hover:text-[var(--verso-gold-bright)]"
                >
                  فراموشی رمز؟
                </Link>
              </div>
              <VersoSubmit loading={loading} label="ورود به دادبان" loadingLabel="در حال ورود…" />
            </form>
          )}

          {tab === "client" && mode === "register" && (
            <form onSubmit={submitRegister} className="mt-7 space-y-5" noValidate>
              <VersoField label="نام و نام خانوادگی" icon="id">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً سارا محمدی"
                  autoComplete="name"
                />
              </VersoField>
              <VersoField label="شماره موبایل" icon="phone">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09123456789"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                />
              </VersoField>
              <div>
                <VersoPwField idPrefix="register" value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw((v) => !v)} autoComplete="new-password" />
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
                                    ? "bg-[var(--verso-green-hover)]"
                                    : "bg-success"
                              : "bg-[var(--verso-line)]"
                          }`}
                        />
                      ))}
                    </span>
                    <span className="text-[10px] font-extrabold text-[var(--verso-ink-soft)]">
                      {["", "ضعیف", "متوسط", "خوب", "عالی"][pwScore]}
                    </span>
                  </span>
                )}
              </div>
              <VersoSubmit loading={loading} label="ساخت حساب رایگان" loadingLabel="در حال ساخت حساب…" />
            </form>
          )}

          {tab === "lawyer" && mode === "login" && (
            <form onSubmit={submitLogin} className="mt-7 space-y-5" noValidate>
              <VersoField label="موبایل یا ایمیل حساب وکیل" icon="briefcase">
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="09123456789"
                  autoComplete="username"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                />
              </VersoField>
              <VersoPwField idPrefix="lawyer" value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw((v) => !v)} />
              <VersoSubmit loading={loading} label="ورود به پنل وکیل" loadingLabel="در حال ورود…" />
              <p className="rounded-xl border border-[var(--verso-line)] bg-[color-mix(in_oklab,var(--verso-cream-2)_55%,transparent)] p-3 text-center text-xs leading-6 text-[var(--verso-ink-soft)]">
                هنوز عضو دادبان نشده‌اید؟{" "}
                <button type="button" onClick={() => sweepTo("register", "lawyer")} className="font-extrabold text-[var(--accent)] hover:underline">
                  درخواست عضویت وکیل
                </button>
              </p>
            </form>
          )}

          {tab === "lawyer" && mode === "register" && (
            <div className="mt-7">
              <ol className="space-y-3">
                {LAWYER_STEPS.map((s, i) => (
                  <li key={s.title} className="flex items-start gap-3 rounded-2xl border border-[var(--verso-line)] bg-[color-mix(in_oklab,var(--verso-cream-2)_55%,transparent)] p-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--verso-green)] text-xs font-black text-[var(--verso-paper)] shadow-md">
                      {faNum(i + 1)}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-[var(--verso-ink)]">{s.title}</span>
                      <span className="text-xs leading-6 text-[var(--verso-ink-soft)]">{s.desc}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <a
                href="/contact"
                className="btn-press mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--verso-green)] text-sm font-extrabold text-[var(--verso-paper)] shadow-[0_14px_30px_-12px_rgba(14,36,23,0.55)] transition-all hover:bg-[var(--verso-green-hover)]"
              >
                <Icon name="chat" className="h-4 w-4" />
                شروع درخواست عضویت
              </a>
              <p className="mt-4 text-center text-xs text-[var(--verso-ink-soft)]">
                پروانه‌تان قبلاً تأیید شده؟{" "}
                <button type="button" onClick={() => sweepTo("login", "lawyer")} className="font-extrabold text-[var(--accent)] hover:underline">
                  ورود وکیل
                </button>
              </p>
            </div>
          )}

          {/* سوییچ ورود ↔ ثبت‌نام */}
          {tab === "client" && (
            <p className="mt-7 text-center text-xs text-[var(--verso-ink-soft)]">
              {mode === "login" ? (
                <>
                  تازه به دادبان آمده‌اید؟{" "}
                  <button type="button" onClick={() => sweepTo("register", tab)} className="verso-switch">
                    حساب بسازید
                  </button>
                </>
              ) : (
                <>
                  قبلاً ثبت‌نام کرده‌اید؟{" "}
                  <button type="button" onClick={() => sweepTo("login", tab)} className="verso-switch">
                    وارد شوید
                  </button>
                </>
              )}
            </p>
          )}

          <p className="mt-4 text-center text-[10px] leading-5 text-[var(--verso-ink-soft)]">
            با ورود یا ثبت‌نام،{" "}
            <Link href="/legal/terms" className="font-bold text-[var(--accent)] hover:underline">
              قوانین و مقررات
            </Link>{" "}
            و{" "}
            <Link href="/legal/privacy" className="font-bold text-[var(--accent)] hover:underline">
              حریم خصوصی
            </Link>{" "}
            دادبان را می‌پذیرید.
          </p>
        </div>

        {/* ══ سمت برند (چپ در RTL) — سبز تیره + عکس هیرو ══ */}
        <aside className="verso-brand relative hidden lg:block">
          <BrandPane mode={mode} priority />
        </aside>
      </div>

      {/* ══ تیغه — جاروی کارت هنگام سوییچ؛ بدون حتی یک fade ══ */}
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

function VersoField({
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
      <span className="mb-1.5 block text-[11px] font-extrabold text-[var(--verso-ink-soft)]">{label}</span>
      <div className="verso-field">
        <Icon name={icon} className="pointer-events-none absolute right-0 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--verso-ink-soft)]" />
        {children}
      </div>
    </label>
  );
}

/** فیلد رمز عبور زیرخط‌دار با برچسب و دکمه نمایش/پنهان */
function VersoPwField({
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
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-[11px] font-extrabold text-[var(--verso-ink-soft)]">
        رمز عبور
      </label>
      <div className="verso-field">
        <Icon name="lock" className="pointer-events-none absolute right-0 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--verso-ink-soft)]" />
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
          aria-label={show ? "پنهان‌کردن رمز" : "نمایش رمز"}
          className="absolute left-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--verso-ink-soft)] transition-colors hover:text-[var(--verso-ink)]"
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

/** دکمه قرصی سبز با اسپینر */
function VersoSubmit({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-press mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--verso-green)] text-sm font-extrabold text-[var(--verso-paper)] shadow-[0_14px_30px_-12px_rgba(14,36,23,0.55)] transition-all hover:bg-[var(--verso-green-hover)] hover:shadow-[0_18px_36px_-12px_rgba(14,36,23,0.65)] disabled:opacity-60"
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
