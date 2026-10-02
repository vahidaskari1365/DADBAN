"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "./ui";
import { Icon } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/brand";
import type { IconKey } from "@/lib/data";

/** ناوبری عمومی دادپیو — مطابق مکاپ: خانه تا درباره ما */
const PUBLIC_NAV: {
  label: string;
  href: string;
  icon: IconKey;
  ai?: boolean;
  children?: { label: string; href: string; desc?: string }[];
}[] = [
  { label: "خانه", href: "/", icon: "home" },
  {
    label: "خدمات حقوقی",
    href: "/services",
    icon: "briefcase",
    children: [
      { label: "مشاوره حقوقی", href: "/consultation", desc: "متنی، صوتی و تصویری" },
      { label: "ثبت پرونده و درخواست وکیل", href: "/case/new", desc: "معرفی وکیل توسط کارشناسان" },
      { label: "تنظیم قرارداد", href: "/contracts/builder", desc: "قراردادساز گام‌به‌گام" },
      { label: "تنظیم دادخواست و شکواییه", href: "/legal-forms", desc: "فرم‌های حقوقی آماده" },
      { label: "بررسی قرارداد", href: "/contracts/review", desc: "تحلیل بندهای پرریسک" },
      { label: "خدمات ثبتی", href: "/pricing", desc: "ثبت شرکت و برند" },
    ],
  },
  {
    label: "وکیل‌یابی",
    href: "/lawyers",
    icon: "search",
    children: [
      { label: "همه وکلا", href: "/lawyers", desc: "جستجو با فیلتر پیشرفته" },
      { label: "وکلای خانواده", href: "/lawyers?sp=خانواده", desc: "طلاق، مهریه، حضانت" },
      { label: "وکلای ملکی", href: "/lawyers?sp=ملک", desc: "تخلیه، سند، تصرف" },
      { label: "وکلای کیفری", href: "/lawyers?sp=کیفری", desc: "دفاع کیفری" },
      { label: "وکلا بر اساس شهر", href: "/lawyers#cities", desc: "وکلای شهر شما" },
    ],
  },
  {
    label: "قراردادها",
    href: "/contracts",
    icon: "document",
    children: [
      { label: "همه قراردادها", href: "/contracts", desc: "بانک قراردادهای حقوقی" },
      { label: "قراردادساز", href: "/contracts/builder", desc: "ساخت گام‌به‌گام" },
      { label: "بررسی قرارداد", href: "/contracts/review", desc: "تحلیل هوشمند ریسک" },
    ],
  },
  {
    label: "دانش حقوقی",
    href: "/knowledge",
    icon: "book",
    children: [
      { label: "مقالات", href: "/knowledge", desc: "بانک مقالات حقوقی" },
      { label: "قوانین", href: "/laws", desc: "مرکز قوانین" },
      { label: "آرای قضایی", href: "/judgments", desc: "رویه قضایی" },
      { label: "پرسش و پاسخ", href: "/qa", desc: "پاسخ وکلای متخصص" },
      { label: "واژه‌نامه حقوقی", href: "/glossary", desc: "اصطلاحات حقوقی" },
    ],
  },
  { label: "هوش مصنوعی", href: "/ai", icon: "sparkles", ai: true },
  { label: "درباره ما", href: "/about", icon: "user" },
];

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
    <>
    <header
      className={`sticky top-0 z-50 dp-sidebar border-b border-[rgba(213,168,76,.28)] transition-shadow duration-300 ${
        scrolled ? "shadow-[0_10px_30px_-12px_rgba(6,12,27,.65)]" : ""
      }`}
    >
      <Container className="flex h-16 items-center justify-between gap-4 lg:h-[72px]">
        {/* برند — «د» در قاب طلایی + دادپیو + تگ‌لاین */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 transition-opacity hover:opacity-90"
          aria-label={`${SITE_NAME} — خانه`}
          onClick={() => {
            if (pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="dp-logo-ring inline-flex h-11 w-11 items-center justify-center rounded-[13px] text-xl font-black lg:h-12 lg:w-12">
            د
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-lg font-extrabold tracking-tight text-white">{SITE_NAME}</span>
            <span className="mt-1 text-[10px] font-medium text-[#aeb9cf]">{SITE_TAGLINE}</span>
          </span>
        </Link>

        {/* ناوبری مرکزی — دسکتاپ */}
        <nav className="hidden lg:block" onMouseLeave={() => setOpenMenu(null)}>
          <ul className="flex items-center gap-0.5">
            {PUBLIC_NAV.map((item) =>
              item.children ? (
                <li key={item.label} className="relative">
                  <button
                    type="button"
                    className="flex cursor-pointer items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[#cbd4e5] transition-colors hover:bg-white/10 hover:text-white"
                    onMouseEnter={() => setOpenMenu(item.label)}
                    onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
                    aria-expanded={openMenu === item.label}
                  >
                    {item.label}
                    <Icon name="chevron" className="h-3 w-3 -rotate-90 opacity-60" />
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
                            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                              <Icon name={item.icon} className="h-4 w-4" />
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
                        ? "mr-1 inline-flex items-center gap-1.5 rounded-full border border-[rgba(213,168,76,.5)] bg-[rgba(213,168,76,.12)] px-3.5 py-1.5 text-sm font-bold text-[color:var(--gold)] transition-all duration-200 hover:-translate-y-px hover:bg-[rgba(213,168,76,.22)] hover:shadow-md"
                        : `flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            pathname === item.href
                              ? "bg-white/10 text-white"
                              : "text-[#cbd4e5] hover:bg-white/10 hover:text-white"
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

        {/* اکشن‌ها */}
        <div className="flex items-center gap-2">
          {/* تم‌تاگل فقط روی دسکتاپ */}
          <div className="hidden lg:block">
            <ThemeToggle compact />
          </div>
          {/* ورود — خطی روشن روی سرمه‌ای (دسکتاپ) */}
          <div className="hidden lg:block">
            <Link
              href="/dashboard/client"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <Icon name="user" className="h-4 w-4" />
              ورود
            </Link>
          </div>
          {/* کمک فوری — دکمهٔ قرمز (دسکتاپ) */}
          <div className="hidden lg:block">
            <Link
              href="/support"
              className="btn-urgent inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-[.97]"
            >
              <Icon name="bolt" className="h-4 w-4" />
              کمک فوری
            </Link>
          </div>
          {/* دکمهٔ منو — موبایل/تبلت */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 text-white transition-all active:scale-90 lg:hidden"
            aria-label="منو"
            aria-expanded={mobileOpen}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? <path d="M6 6l12 12M6 18 18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </Container>
    </header>

    {/* منوی موبایل — کشوی تمام‌صفحه سرمه‌ای (بیرون از header تا قاعدهٔ ارتفاع موبایل هدر آن را محدود نکند) */}
    {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-[rgba(6,12,27,.6)] animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="dp-sidebar absolute inset-y-0 right-0 w-[86%] max-w-sm overflow-y-auto shadow-[var(--shadow-lift)] animate-slide-in-right">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <span className="flex items-center gap-3">
                <span className="dp-logo-ring inline-flex h-10 w-10 items-center justify-center rounded-[13px] text-lg font-black">
                  د
                </span>
                <span className="flex flex-col leading-none">
                  <span className="text-base font-extrabold text-white">{SITE_NAME}</span>
                  <span className="mt-1 text-[10px] text-[#aeb9cf]">{SITE_TAGLINE}</span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white active:scale-90"
                aria-label="بستن منو"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M6 18 18 6" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-1 p-3">
              {PUBLIC_NAV.map((item) => (
                <div key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                      item.ai
                        ? "border border-[rgba(213,168,76,.5)] bg-[rgba(213,168,76,.12)] text-[color:var(--gold)]"
                        : pathname === item.href
                          ? "bg-white/10 text-white"
                          : "text-[#cbd4e5] hover:bg-white/10 hover:text-white active:bg-white/15"
                    }`}
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-[color:var(--gold)]">
                      <Icon name={item.icon} className="h-4 w-4" />
                    </span>
                    {item.label}
                  </Link>
                  {item.children && (
                    <div className="mt-1 mr-6 flex flex-col border-r border-white/10 pr-3">
                      {item.children.map((c) => (
                        <Link
                          key={c.label}
                          href={c.href}
                          onClick={() => setMobileOpen(false)}
                          className="rounded-lg px-3 py-2.5 text-[13px] text-[#aeb9cf] transition-colors hover:bg-white/5 hover:text-white"
                        >
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            <div className="border-t border-white/10 p-3">
              <div className="mb-3 flex items-center justify-between px-3">
                <span className="text-xs font-bold text-[#aeb9cf]">حالت نمایش</span>
                <ThemeToggle compact />
              </div>
              <Link
                href="/support"
                className="btn-urgent flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all active:scale-[.98]"
              >
                <Icon name="bolt" className="h-4 w-4" />
                کمک فوری
              </Link>
              <Link
                href="/dashboard/client"
                className="btn-gold mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all active:scale-[.98]"
              >
                <Icon name="user" className="h-4 w-4" />
                ورود / ثبت‌نام
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
