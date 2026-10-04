"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container, Logo, Button } from "./ui";
import { Icon } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { NAV } from "@/lib/data";
import type { IconKey } from "@/lib/data";

const childIcon = (label: string): IconKey => {
  const m: Record<string, IconKey> = {
    "مشاوره حقوقی": "chat",
    "درخواست وکیل": "user",
    "وکیل کارمندان": "user",
    "انجام امور اداری": "building",
    "تنظیم دادخواست و شکواییه": "gavel",
    "تنظیم اسناد": "document",
    "بررسی قرارداد": "file",
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
    "تحلیل قرارداد": "file",
    "قراردادساز": "document",
    "فرم‌های حقوقی": "file",
    "تعرفه خدمات": "money",
  };
  return m[label] ?? "arrow";
};

export function Header() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
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
          aria-label="دادبان — خانه"
          onClick={() => {
            // Clicking the logo always goes home; if already there, scroll back to top.
            if (pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <Logo />
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
                    {item.label}
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
                              <span className="text-sm font-semibold text-foreground">{c.label}</span>
                              {c.desc && <span className="text-xs text-muted">{c.desc}</span>}
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
                        ? "ml-1 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3.5 py-1.5 text-sm font-bold text-accent shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-accent/50 hover:bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] hover:shadow-md"
                        : `flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            pathname === item.href
                              ? "bg-surface-2 text-foreground"
                              : "text-foreground-soft hover:bg-surface-2 hover:text-foreground"
                          }`
                    }
                  >
                    {item.ai && <Icon name="sparkles" className="h-4 w-4" />}
                    {item.label}
                  </Link>
                </li>
              )
            )}
          </ul>
        </nav>

        {/* Left actions — مینیمال روی موبایل */}
        <div className="flex items-center gap-2">
          {/* تم‌تاگل فقط روی دسکتاپ */}
          <div className="hidden lg:block">
            <ThemeToggle compact />
          </div>
          {/* دکمه ورود فقط روی دسکتاپ (در موبایل از طریق BottomNav) */}
          <div className="hidden lg:block">
            <a
              href="/dashboard/client"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-foreground-soft transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <Icon name="user" className="h-4 w-4" />
              ورود
            </a>
          </div>
          {/* دکمه رزرو مشاوره فقط روی دسکتاپ (در موبایل از طریق BottomNav تب وسط) */}
          <div className="hidden lg:block">
            <Button href="/consultation" size="sm" icon="calendar">
              رزرو مشاوره
            </Button>
          </div>
          {/* آیکون منو — موبایل/تبلت، حداقل 44px touch target */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition-all active:scale-90 lg:hidden"
            aria-label="منو"
            aria-expanded={mobileOpen}
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
              role="dialog"
              aria-modal="true"
              aria-label="منوی اصلی"
              className="absolute inset-y-0 right-0 w-[85%] max-w-sm overflow-y-auto bg-surface shadow-[var(--shadow-lift)] animate-slide-in-right"
            >
            {/* هدر drawer */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 active:scale-90"
                aria-label="بستن منو"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M6 18 18 6" />
                </svg>
              </button>
            </div>
            {/* ناوبری */}
            <nav className="flex flex-col gap-1 p-3">
              {NAV.map((item) =>
                item.children ? (
                  <div key={item.label} className="border-b border-border pb-2 last:border-0">
                    <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-muted">{item.label}</p>
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
                          {c.label}
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
                        ? "mb-2 mt-1 flex items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm font-bold text-accent active:scale-95"
                        : "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground-soft hover:bg-surface-2 active:bg-surface-3"
                    }
                  >
                    {item.ai && <Icon name="sparkles" className="h-4 w-4" />}
                    {item.label}
                  </Link>
                )
              )}
            </nav>
            {/* پایین drawer — اقلام اکانت */}
            <div className="border-t border-border p-3">
              <div className="mb-3 flex items-center justify-between px-3">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">حالت نمایش</span>
                <ThemeToggle compact />
              </div>
              <Button href="/consultation" icon="calendar" className="w-full">رزرو مشاوره</Button>
              <Button href="/dashboard/client" variant="outline" icon="user" className="mt-2 w-full">ورود / ثبت‌نام</Button>
            </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
