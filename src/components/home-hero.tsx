"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "./icons";
import { HeroScene } from "./hero-scene";
import { trackEvent } from "@/lib/analytics";
import type { IconKey } from "@/lib/data";

/** کارت‌های دسترسی سریع روی هیرو — ۷ مسیر اصلی خدمات دادپیو */
const QUICK_LINKS: { label: string; icon: IconKey; href: string; accent?: boolean }[] = [
  { label: "مشاوره متنی", icon: "chat", href: "/consultation?type=chat" },
  { label: "مشاوره تلفنی", icon: "phone", href: "/consultation?type=voice" },
  { label: "مشاوره تصویری", icon: "video", href: "/consultation?type=video" },
  { label: "تنظیم قرارداد", icon: "document", href: "/contracts/builder" },
  { label: "تنظیم دادخواست", icon: "gavel", href: "/legal-forms" },
  { label: "بررسی پرونده", icon: "folder", href: "/case/new" },
  { label: "پیدا کردن وکیل متخصص", icon: "search", href: "/lawyers", accent: true },
];

export function HomeHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    trackEvent("landing_view");
  }, []);

  const go = () => {
    const q = query.trim();
    // جستجوی هوشمند → ویزارد ثبت پرونده؛ متن به‌عنوان q پاس داده می‌شود
    router.push(q ? `/case/new?q=${encodeURIComponent(q)}` : "/case/new");
  };

  return (
    <section className="relative isolate overflow-hidden">
      <HeroScene />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-16 pt-14 text-center sm:px-6 sm:pt-20 lg:pb-20 lg:pt-24">
        {/* نشان اعتماد */}
        <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-[rgba(213,168,76,.45)] bg-[rgba(213,168,76,.12)] px-3.5 py-1.5 text-xs font-semibold text-[color:var(--gold)] backdrop-blur">
          <Icon name="badge" className="h-4 w-4" />
          پلتفرم حقوقی دادپیو — وکلای پایه یک دادگستری، تأییدشده
        </span>

        {/* تیتر اصلی */}
        <h1
          className="animate-fade-up mt-6 text-balance text-3xl font-black leading-[1.25] tracking-tight text-white sm:text-5xl sm:leading-[1.2]"
          style={{ animationDelay: "0.08s" }}
        >
          مشکل حقوقی خود را{" "}
          <span className="relative inline-block">
            <span className="bg-gradient-to-l from-[#e6c26f] via-[#d5a84c] to-[#e6c26f] bg-clip-text text-transparent">
              توضیح دهید
            </span>
            <svg
              className="absolute -bottom-2 right-0 h-3 w-full text-[color:var(--gold)]/60"
              viewBox="0 0 200 12"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden
            >
              <path d="M2 9C40 3 160 3 198 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
        </h1>

        {/* زیرتیتر */}
        <p
          className="animate-fade-up mx-auto mt-5 max-w-2xl text-sm leading-8 text-white/75 sm:text-base"
          style={{ animationDelay: "0.16s" }}
        >
          با کمک هوش مصنوعی، مشکل خود را در چند دقیقه توضیح دهید تا به شما مشاوره داده شود و
          بهترین وکیل به شما معرفی گردد.
        </p>

        {/* باکس جستجوی بزرگ سفید */}
        <form
          className="animate-fade-up mx-auto mt-8 flex max-w-2xl items-center gap-1.5 rounded-2xl bg-white p-2 shadow-[0_20px_50px_-12px_rgba(6,12,27,.6)] sm:gap-2 sm:p-2.5"
          style={{ animationDelay: "0.22s" }}
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
          role="search"
        >
          <span className="pr-2 text-muted-soft" aria-hidden>
            <Icon name="search" className="h-5 w-5" />
          </span>
          <label htmlFor="hero-search" className="sr-only">
            توضیح مشکل حقوقی
          </label>
          <input
            id="hero-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="مثال: اختلاف ملکی، قرارداد پیش‌فروش یا مشاوره حقوقی..."
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-soft sm:text-[15px]"
          />
          <button
            type="submit"
            className="btn-gold inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-4 text-sm font-bold transition-all duration-200 hover:shadow-[0_8px_22px_-6px_rgba(213,168,76,.7)] active:scale-[.97] sm:px-6"
          >
            <Icon name="sparkles" className="h-4 w-4" />
            جستجوی هوشمند
          </button>
        </form>

        {/* کمک فوری */}
        <div className="animate-fade-up mt-4 flex justify-center" style={{ animationDelay: "0.28s" }}>
          <Link
            href="/support"
            className="btn-urgent inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-5 text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-[.97]"
          >
            <Icon name="bolt" className="h-4 w-4" />
            کمک فوری
          </Link>
        </div>

        {/* ردیف دسترسی سریع — ۷ کارت شیشه‌ای */}
        <nav
          aria-label="دسترسی سریع به خدمات"
          className="animate-fade-up mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-2.5 sm:grid-cols-4"
          style={{ animationDelay: "0.34s" }}
        >
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={`group flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-4 text-center backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--gold)] ${
                l.accent
                  ? "border-[rgba(213,168,76,.5)] bg-[rgba(213,168,76,.12)] hover:bg-[rgba(213,168,76,.2)] sm:col-span-2"
                  : "border-white/15 bg-white/[0.07] hover:border-white/25 hover:bg-white/[0.12]"
              }`}
            >
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${
                  l.accent ? "bg-[rgba(213,168,76,.22)] text-[color:var(--gold)]" : "bg-white/10 text-[color:var(--gold)]"
                }`}
              >
                <Icon name={l.icon} className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold leading-5 text-white/90">{l.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
