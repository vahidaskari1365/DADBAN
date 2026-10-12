"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container, Logo, Button } from "./ui";
import { SITE_TAGLINE } from "@/lib/brand";
import { Icon } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { BackButton } from "./back-button";
import { AccountMenu, type MeUser } from "./account-menu";
import { NAV } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import { panelHomeForRole } from "@/lib/roles";
import { useT } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "./language-switcher";

const childIcon = (label: string): IconKey => {
  const m: Record<string, IconKey> = {
    "مشاوره حقوقی": "chat",
    "درخواست وکیل": "user",
    "وکیل کارمندان": "user",
    "ثبت پرونده و درخواست وکیل": "folder",
    "پیگیری پرونده": "clock",
    "انجام امور اداری": "signature",
    "تنظیم دادخواست و شکواییه": "gavel",
    "تنظیم اسناد": "document",
    "بررسی قرارداد": "signature",
    "همه قراردادها": "file",
    "خدمات ثبتی": "stamp",
    "همه وکلا": "search",
    "وکلای خانواده": "family",
    "وکلای ملکی": "home",
    "وکلای کیفری": "shield",
    "وکلا بر اساس شهر": "location",
    "جستجوی وکیل": "search",
    "تخصص‌ها": "scale",
    "شهرها": "landmark",
    "مقالات": "book",
    "قوانین": "landmark",
    "آرای قضایی": "gavel",
    "پرسش و پاسخ": "chat",
    "واژه‌نامه حقوقی": "book",
    "دستیار حقوقی AI": "sparkles",
    "دستیار هوش مصنوعی": "sparkles",
    "تحلیل قرارداد": "signature",
    "قراردادساز": "document",
    "فرم‌های حقوقی": "file",
    "تعرفه خدمات": "coins",
  };
  return m[label] ?? "arrow";
};

/* منوی موبایل: دستیار هوشمند همیشه اولین گزینه است.
   ترتیب بقیه اقلام حفظ می‌شود (sort پایدار) و NAV اصلی دسکتاپ دست‌نخورده می‌ماند. */
const MOBILE_NAV = [...NAV].sort((a, b) => Number(Boolean(b.ai)) - Number(Boolean(a.ai)));

export function Header() {
  const t = useT();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  /* منوی اکانت — وضعیت ورود از /api/auth/me (یک fetch برای هدر + drawer) */
  const [me, setMe] = useState<MeUser | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setMe(d?.ok ? (d.user as MeUser) : null);
        setMeLoaded(true);
      })
      .catch(() => { if (alive) setMeLoaded(true); });
    return () => { alive = false; };
  }, []);
  const logout = async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    window.location.assign("/login");
  };
  /* Intopia — Keyboard & Focus: درِاور مودال است؛ فوکوس هنگام باز شدن داخل
     می‌رود، Trap می‌شود، با Escape بسته می‌شود و به دکمهٔ فراخوان برمی‌گردد */
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  // بستن منوها هنگام تغییر مسیر — الگوی «تنظیم state در حین رندر» بدون effect
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
    setOpenMenu(null);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /* مدیریت فوکوس درِاور مودال (WCAG 2.4.3 / 2.1.2) */
  useEffect(() => {
    if (!mobileOpen) return;
    drawerCloseRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setMobileOpen(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (e.key === "Tab" && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass border-b border-border shadow-sm" : "bg-transparent"
      }`}
    >
      <Container className="flex h-16 items-center justify-between gap-4 lg:h-18">
        {/* Right (logo) — RTL */}
        <Link
          href="/"
          className="shrink-0 transition-opacity hover:opacity-85"
          aria-label={t("دادورزان — خانه")}
          onClick={() => {
            // Clicking the logo always goes home; if already there, scroll back to top.
            if (pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <Logo tagline={t(SITE_TAGLINE)} />
        </Link>

        {/* Center nav */}
        <nav className="hidden lg:block" onMouseLeave={() => setOpenMenu(null)}>
          <ul className="flex items-center gap-1">
            {NAV.map((item) =>
              item.children ? (
                <li key={item.label} className="relative">
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-foreground-soft transition-colors hover:bg-surface-2 hover:text-foreground"
                    onMouseEnter={() => setOpenMenu(item.label)}
                    onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
                    aria-expanded={openMenu === item.label}
                  >
                    {t(item.label)}
                    <span className="sr-only">{t("زیرمنو")}</span>
                    <Icon name="check" className="h-3 w-3 rotate-90 opacity-60" />
                  </button>
                  {openMenu === item.label && (
                    <div
                      className="absolute right-0 top-full z-50 w-72 animate-scale-in pt-2"
                      onMouseEnter={() => setOpenMenu(item.label)}
                    >
                      <div className="overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-[var(--shadow-lift)]">
                        {item.children.map((c) => (
                          <Link
                            key={c.label}
                            href={c.href}
                            className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-2"
                          >
                            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                              <Icon name={childIcon(c.label)} className="h-4 w-4" />
                            </span>
                            <span className="flex flex-col">
                              <span className="text-sm font-semibold text-foreground">{t(c.label)}</span>
                              {c.desc && <span className="text-xs text-muted">{t(c.desc)}</span>}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              ) : (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setOpenMenu(null)}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className={
                      item.ai
                        ? "ml-1 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3.5 py-1.5 text-sm font-bold text-accent-text shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-accent/50 hover:bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] hover:shadow-md"
                        : `flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            pathname === item.href
                              ? "bg-surface-2 text-foreground"
                              : "text-foreground-soft hover:bg-surface-2 hover:text-foreground"
                          }`
                    }
                  >
                    {item.ai && <Icon name="sparkles" className="h-4 w-4" />}
                    {t(item.label)}
                  </Link>
                </li>
              )
            )}
          </ul>
        </nav>

        {/* Left actions — مینیمال روی موبایل */}
        <div className="flex items-center gap-2">
          {/* دکمهٔ بازگشت — تبلت/دسکتاپ (روی موبایل جا را تنگ می‌کرد و سرریز افقی می‌ساخت) */}
          {pathname !== "/" && (
            <div className="hidden md:block">
              <BackButton variant="icon" label={t("بازگشت")} fallback="/" />
            </div>
          )}
          {/* تم‌تاگل فقط روی دسکتاپ */}
          <div className="hidden lg:block">
            <ThemeToggle compact />
          </div>
          {/* سوییچر زبان — همه‌جا */}
          <LanguageSwitcher compact />
          {/* اکانت — مهمان: ورود | واردشده: آواتار با منوی کشویی */}
          <div className="hidden lg:block">
            <AccountMenu user={me} loaded={meLoaded} />
          </div>
          {/* CTA اصلی هدر — شروع مسیر حقوقی (فقط دسکتاپ) */}
          <div className="hidden lg:block">
            <Button href="/ai-assistant" size="sm" icon="arrow">
              {t("شروع مسیر حقوقی")}
            </Button>
          </div>
          {/* CTA کوچک موبایل — کنار آیکون منو */}
          <Link
            href="/ai-assistant"
            className="inline-flex items-center gap-1 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2.5 text-xs font-bold text-accent-text transition-all active:scale-95 lg:hidden"
          >
            {t("شروع مسیر")}
            <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
          {/* آیکون منو — موبایل/تبلت، حداقل 44px touch target */}
          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition-all active:scale-90 lg:hidden"
            aria-label={mobileOpen ? t("بستن منو") : t("باز کردن منو")}
            aria-expanded={mobileOpen}
            aria-controls="mobile-main-menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? <path d="M6 6l12 12M6 18 18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </Container>

      {/* Mobile menu — Fullscreen drawer */}
      {/* پورتال به body: از استکینگ‌کانتکستِ هدر (sticky z-50) خارج می‌شود تا منو «پشت صفحه» نرود */}
      {mobileOpen &&
        createPortal(
          <div className="fixed inset-0 z-[90] lg:hidden">
            {/* پس‌زمینه تیره */}
            <div
              className="absolute inset-0 bg-black/40 animate-fade-in"
              onClick={() => setMobileOpen(false)}
            />
            {/* drawer از راست (RTL) */}
            <div
              ref={drawerRef}
              id="mobile-main-menu"
              role="dialog"
              aria-modal="true"
              aria-label={t("منوی اصلی")}
              className="absolute inset-y-0 start-0 w-[85%] max-w-sm overflow-y-auto bg-surface shadow-[var(--shadow-lift)] rtl:animate-slide-in-right ltr:animate-slide-in-left"
            >
            {/* هدر drawer */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <Logo tagline={t(SITE_TAGLINE)} />
              <button
                ref={drawerCloseRef}
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  hamburgerRef.current?.focus();
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 active:scale-90"
                aria-label={t("بستن منو")}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M6 18 18 6" />
                </svg>
              </button>
            </div>
            {/* ناوبری — دستیار هوشمند اول از همه */}
            <nav className="flex flex-col gap-1 p-3">
              {MOBILE_NAV.map((item) =>
                item.children ? (
                  <div key={item.label} className="border-b border-border pb-2 last:border-0">
                    <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-muted">{t(item.label)}</p>
                    <div className="flex flex-col">
                      {item.children.map((c) => (
                        <Link
                          key={c.label}
                          href={c.href}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground-soft hover:bg-surface-2 active:bg-surface-3"
                        >
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                            <Icon name={childIcon(c.label)} className="h-4 w-4" />
                          </span>
                          {t(c.label)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={
                      item.ai
                        ? "mb-3 flex items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3.5 text-sm font-bold text-accent-text active:scale-95"
                        : "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground-soft hover:bg-surface-2 active:bg-surface-3"
                    }
                  >
                    {item.ai && <Icon name="sparkles" className="h-4 w-4" />}
                    {t(item.label)}
                  </Link>
                )
              )}
            </nav>
            {/* پایین drawer — اقلام اکانت */}
            <div className="border-t border-border p-3">
              <div className="mb-3 flex items-center justify-between px-3">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">{t("حالت نمایش")}</span>
                <ThemeToggle compact />
              </div>
              <div className="mb-3 flex items-center justify-between px-3">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">{t("زبان")}</span>
                <LanguageSwitcher />
              </div>
              <Button href="/ai-assistant" icon="arrow" className="w-full">{t("شروع مسیر حقوقی")}</Button>
              <Button href="/consultation" variant="outline" icon="calendar" className="mt-2 w-full">{t("رزرو مشاوره")}</Button>
              {meLoaded && me ? (
                <div className="mt-3 space-y-2 rounded-2xl border border-border bg-surface-2/60 p-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-extrabold text-white shadow-sm"
                      style={{ backgroundColor: me.avatarColor || "#15365d" }}
                      aria-hidden
                    >
                      {(me.name || "؟").trim().charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-foreground">{me.name}</span>
                      <span className="block text-[11px] text-muted">{t("حساب کاربری فعال")}</span>
                    </span>
                  </div>
                  <Button href={panelHomeForRole(me.role)} variant="outline" icon="home" className="w-full">{t("داشبورد من")}</Button>
                  <button
                    type="button"
                    onClick={logout}
                    data-testid="drawer-logout"
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/5 text-sm font-bold text-danger transition-colors hover:bg-danger/10"
                  >
                    <Icon name="x" className="h-4 w-4" />
                    {t("خروج از حساب")}
                  </button>
                </div>
              ) : (
                <Button href="/login" variant="outline" icon="user" className="mt-2 w-full">{t("ورود / ثبت‌نام")}</Button>
              )}
            </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
