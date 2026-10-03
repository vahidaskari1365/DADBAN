"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui";
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

const fieldCls =
  "h-12 w-full rounded-xl border border-border-strong bg-background py-0 pl-11 pr-10 text-sm text-foreground outline-none transition-all placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/10";

const LAWYER_STEPS = [
  { title: "ارسال مدارک و شماره پروانه", desc: "از طریق پشتیبانی، پروانه وکالت و مدارک هویتی را ارسال کنید." },
  { title: "بررسی و احراز هویت", desc: "کارشناسان دادبان ظرف ۳ تا ۵ روز کاری راستی‌آزمایی می‌کنند." },
  { title: "فعال‌سازی پنل وکیل", desc: "پنل شما فعال می‌شود و درخواست‌های موکلان را دریافت می‌کنید." },
];

export function AuthPanel({
  initialTab = "client",
  initialMode = "login",
}: {
  initialTab?: Tab;
  initialMode?: Mode;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const pwScore = useMemo(() => {
    if (!password) return 0;
    return [
      password.length >= 8,
      /\d/.test(password) && /[a-zA-Zآ-ی]/.test(password),
      password.length >= 10,
      /[^A-Za-z0-9آ-ی]/.test(password),
    ].filter(Boolean).length;
  }, [password]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setError("");
    setNotice("");
  };
  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setNotice("");
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
        ? { title: "ورود وکلا به پنل", sub: "با شماره موبایل یا ایمیلِ حساب وکیل خود وارد شوید." }
        : { title: "عضویت وکلا در دادبان", sub: "پس از احراز هویت، پنل اختصاصی وکیل برای شما فعال می‌شود." }
      : mode === "login"
        ? { title: "ورود به حساب کاربری", sub: "به پرونده‌ها، مشاوره‌ها و اسناد خود دسترسی داشته باشید." }
        : { title: "ساخت حساب موکل", sub: "رایگان ثبت‌نام کنید و پرونده‌تان را همین امروز شروع کنید." };

  const banner =
    error ? { tone: "danger" as const, text: error, icon: "alert" as const }
    : notice ? { tone: "warn" as const, text: notice, icon: "alert" as const }
    : null;

  return (
    <div className="w-full">
      {/* ── تب‌های وکیل / موکل ── */}
      <div role="tablist" aria-label="نوع حساب" className="mb-7 grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => switchTab(t.id)}
            className={`relative flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition-colors ${
              tab === t.id ? "text-primary" : "text-muted hover:text-foreground"
            }`}
          >
            {tab === t.id && (
              <motion.span
                layoutId="auth-tab-pill"
                className="absolute inset-0 rounded-xl bg-surface shadow-md ring-1 ring-black/5"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon name={t.icon} className="h-4 w-4" />
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── سرتیتر متغیر ── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`head-${tab}-${mode}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
        >
          <h2 className="text-lg font-black text-foreground sm:text-xl">{heading.title}</h2>
          <p className="mt-1.5 text-xs leading-6 text-muted sm:text-sm">{heading.sub}</p>
        </motion.div>
      </AnimatePresence>

      {/* ── بنر خطا / اطلاع ── */}
      <AnimatePresence initial={false}>
        {banner && (
          <motion.div
            key={`banner-${banner.text}`}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <span
              className={`flex items-start gap-2 rounded-xl border p-3 text-xs font-bold leading-6 ${
                banner.tone === "danger"
                  ? "border-danger/20 bg-danger/5 text-danger"
                  : "border-accent/25 bg-accent-soft/70 text-accent-foreground"
              }`}
            >
              <Icon name={banner.icon} className="mt-0.5 h-4 w-4 shrink-0" />
              {banner.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── فرم‌ها ── */}
      <AnimatePresence mode="wait" initial={false}>
        {tab === "client" && mode === "login" ? (
          <motion.form
            key="client-login"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.2 }}
            onSubmit={submitLogin}
            className="mt-6 space-y-4"
            noValidate
          >
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-foreground-soft">موبایل یا ایمیل</span>
              <div className="relative">
                <Icon name="user" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={fieldCls}
                  placeholder="09123456789"
                  autoComplete="username"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-foreground-soft">رمز عبور</span>
              <PwField value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw((v) => !v)} />
            </label>
            <SubmitButton loading={loading} label="ورود به پنل موکل" loadingLabel="در حال ورود…" />
          </motion.form>
        ) : tab === "client" && mode === "register" ? (
          <motion.form
            key="client-register"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.2 }}
            onSubmit={submitRegister}
            className="mt-6 space-y-4"
            noValidate
          >
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-foreground-soft">نام و نام خانوادگی</span>
              <div className="relative">
                <Icon name="id" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} placeholder="مثلاً سارا محمدی" autoComplete="name" />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-foreground-soft">شماره موبایل</span>
              <div className="relative">
                <Icon name="phone" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={fieldCls}
                  placeholder="09123456789"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-foreground-soft">رمز عبور</span>
              <PwField value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw((v) => !v)} />
              {password && (
                <span className="mt-2.5 flex items-center gap-2.5">
                  <span className="flex flex-1 gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                          i <= pwScore
                            ? pwScore === 1
                              ? "bg-danger"
                              : pwScore === 2
                                ? "bg-accent"
                                : pwScore === 3
                                  ? "bg-primary"
                                  : "bg-success"
                            : "bg-surface-3"
                        }`}
                      />
                    ))}
                  </span>
                  <span className="text-[10px] font-extrabold text-muted">
                    {["", "ضعیف", "متوسط", "خوب", "عالی"][pwScore]}
                  </span>
                </span>
              )}
            </label>
            <SubmitButton loading={loading} label="ساخت حساب رایگان" loadingLabel="در حال ساخت حساب…" />
          </motion.form>
        ) : tab === "lawyer" && mode === "login" ? (
          <motion.form
            key="lawyer-login"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.2 }}
            onSubmit={submitLogin}
            className="mt-6 space-y-4"
            noValidate
          >
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-foreground-soft">موبایل یا ایمیل حساب وکیل</span>
              <div className="relative">
                <Icon name="briefcase" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={fieldCls}
                  placeholder="09123456789"
                  autoComplete="username"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-foreground-soft">رمز عبور</span>
              <PwField value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw((v) => !v)} />
            </label>
            <SubmitButton loading={loading} label="ورود به پنل وکیل" loadingLabel="در حال ورود…" />
            <p className="rounded-xl bg-surface-2/70 p-3 text-center text-xs leading-6 text-muted">
              هنوز عضو دادبان نشده‌اید؟{" "}
              <button type="button" onClick={() => switchMode("register")} className="font-extrabold text-primary hover:underline">
                درخواست عضویت وکیل
              </button>
            </p>
          </motion.form>
        ) : (
          <motion.div
            key="lawyer-register"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.2 }}
            className="mt-6"
          >
            <ol className="space-y-3">
              {LAWYER_STEPS.map((s, i) => (
                <li key={s.title} className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2/50 p-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-black text-primary-foreground shadow-md">
                    {faNum(i + 1)}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-foreground">{s.title}</span>
                    <span className="text-xs leading-6 text-muted">{s.desc}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Button href="/support" icon="chat" className="mt-5 w-full">
              شروع درخواست عضویت
            </Button>
            <p className="mt-4 text-center text-xs text-muted">
              پروانه‌تان قبلاً تأیید شده؟{" "}
              <button type="button" onClick={() => switchMode("login")} className="font-extrabold text-primary hover:underline">
                ورود وکیل
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── سوییچ ورود/ثبت‌نام (فقط تب موکل) ── */}
      {tab === "client" && (
        <p className="mt-5 border-t border-border pt-4 text-center text-xs text-muted">
          {mode === "login" ? (
            <>
              حساب ندارید؟{" "}
              <button type="button" onClick={() => switchMode("register")} className="font-extrabold text-primary hover:underline">
                ثبت‌نام کنید
              </button>
            </>
          ) : (
            <>
              حساب دارید؟{" "}
              <button type="button" onClick={() => switchMode("login")} className="font-extrabold text-primary hover:underline">
                وارد شوید
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}

/** فیلد رمز عبور با دکمه نمایش/پنهان */
function PwField({
  value,
  onChange,
  show,
  onToggle,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Icon name="lock" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldCls}
        placeholder="••••••••"
        autoComplete={show ? "off" : "current-password"}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "پنهان‌کردن رمز" : "نمایش رمز"}
        className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
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
  );
}

/** دکمه ارسال با اسپینر */
function SubmitButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <Button type="submit" disabled={loading} className="mt-1 h-12 w-full text-sm">
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 12a9 9 0 1 1-6.2-8.56" />
          </svg>
          {loadingLabel}
        </span>
      ) : (
        label
      )}
    </Button>
  );
}
