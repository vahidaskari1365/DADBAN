"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";

/**
 * «همه‌چیز از یک‌جا» — هاب یکپارچهٔ اقدام‌های اصلی سایت (سبک بنتو).
 * جایگزین دو بخش تکراری قبلی (کارت‌های هدف + خدمات ویژه) است.
 * موشن: ورود پلکانی با spring + بلور، هاور لیفت و درخشش.
 */

type ActionItem = {
  title: string;
  desc: string;
  icon: IconKey;
  href: string;
  /** featured = کارت بزرگ دستیار هوشمند (بنتو ۲×۲) */
  featured?: boolean;
  /** wide = کارت پهن */
  wide?: boolean;
};

const ACTIONS: ActionItem[] = [
  { title: "دستیار هوش مصنوعی", desc: "پاسخ فوری سؤال حقوقی با استناد به قانون — رایگان و ۲۴ ساعته", icon: "sparkles", href: "/ai-assistant", featured: true },
  { title: "خدمات حضوری و اداری", desc: "نماینده دادورزان با وکالت‌نامه رسمی به‌جای شما به اداره‌ها می‌رود", icon: "signature", href: "/services", wide: true },
  { title: "وکیل‌یابی", desc: "جست‌وجوی وکیل متخصص بر اساس تخصص و شهر", icon: "search", href: "/lawyers" },
  { title: "رزرو مشاوره", desc: "متنی، صوتی یا تصویری با وکیل", icon: "calendar", href: "/consultation" },
  { title: "ثبت پرونده", desc: "ارزیابی اولیه و معرفی وکیل", icon: "folder", href: "/case/new" },
  { title: "پیگیری پرونده", desc: "وضعیت لحظه‌ای پرونده شما", icon: "clock", href: "/track-case" },
  { title: "قرارداد و فرم‌ها", desc: "قراردادساز، تحلیل ریسک، دادخواست", icon: "document", href: "/contracts" },
  { title: "کسب‌وکارها", desc: "حقوق شرکت‌ها و قراردادهای B2B", icon: "briefcase", href: "/business" },
];

const spring = { type: "spring" as const, stiffness: 210, damping: 24 };

export function ActionHub() {
  const t = useT();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ACTIONS.map((a, i) => {
        const featured = Boolean(a.featured);
        const wide = Boolean(a.wide);
        return (
          <motion.div
            key={a.href}
            initial={{ opacity: 0, y: 26, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "0px 0px -60px 0px" }}
            transition={{ ...spring, delay: i * 0.055 }}
            className={featured ? "sm:col-span-2 lg:row-span-2" : wide ? "sm:col-span-2" : ""}
          >
            <Link
              href={a.href}
              className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lift)] ${
                featured
                  ? "home-glow border-accent/40 bg-gradient-to-br from-primary via-primary to-primary-hover text-primary-foreground"
                  : "border-border bg-surface hover:border-accent/30"
              }`}
            >
              {/* هاله نوری متحرک در کارت ویژه */}
              {featured && (
                <>
                  <span className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-accent/25 blur-3xl home-float-slow" />
                  <span className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl home-float" />
                </>
              )}

              <div className="relative flex items-start justify-between">
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${
                    featured ? "bg-accent text-accent-foreground shadow-lg" : "bg-primary-soft text-primary"
                  }`}
                >
                  <Icon name={a.icon} className="h-6 w-6" />
                </span>
                {featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-black text-accent-text ring-1 ring-accent/40">
                    <Icon name="sparkles" className="h-3 w-3" />
                    {t("پیشنهاد دادورزان")}
                  </span>
                )}
              </div>

              <div className="relative mt-auto pt-5">
                <h3 className={`font-black ${featured ? "text-2xl sm:text-3xl" : "text-base"} ${featured ? "text-primary-foreground" : "text-foreground"}`}>
                  {t(a.title)}
                </h3>
                <p className={`mt-1.5 leading-6 ${featured ? "text-sm text-primary-foreground/80" : "text-sm text-muted"}`}>
                  {t(a.desc)}
                </p>
                <span
                  className={`mt-4 inline-flex items-center gap-1.5 text-sm font-bold transition-all duration-300 group-hover:gap-3 ${
                    featured ? "text-accent-text" : "text-primary"
                  }`}
                >
                  {t("شروع کنید")}
                  <Icon name="arrow" className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                </span>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

/** نوار متحرک اعتماد — باریک و یک‌خطی (جایگزین ۴ کارت بزرگ تکراری) */
const TRUST_ITEMS: { icon: IconKey; text: string }[] = [
  { icon: "certificate", text: "راستی‌آزمایی پروانه وکلا" },
  { icon: "lock", text: "محرمانگی اطلاعات" },
  { icon: "shield", text: "بازگشت وجه طبق سیاست شفاف" },
  { icon: "balance", text: "تعرفه شفاف پیش از تصمیم" },
  { icon: "clock", text: `${faNum(24)} ساعته، ${faNum(7)} روز هفته` },
];

export function TrustStrip() {
  const t = useT();
  const row = [...TRUST_ITEMS, ...TRUST_ITEMS];
  return (
    <div className="home-marquee relative overflow-hidden rounded-2xl border border-border bg-surface/70 py-3 backdrop-blur" dir="ltr">
      <div className="home-marquee-track flex w-max items-center gap-8 pl-8" dir="rtl">
        {row.map((item, i) => (
          <span key={`${item.text}-${i}`} className="inline-flex shrink-0 items-center gap-2 text-xs font-medium text-muted">
            <Icon name={item.icon} className="h-4 w-4 text-accent-text" />
            {t(item.text)}
            <span className="mr-4 inline-block h-1 w-1 rounded-full bg-border" aria-hidden />
          </span>
        ))}
      </div>
      {/* محو لبه‌ها */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
