"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";

/**
 * «مسیریاب موضوعی دادورزان» — قلب هدفمند صفحهٔ اول:
 * کاربر موضوعش را انتخاب می‌کند و بلافاصله یک مسیر گام‌به‌گامِ کامل
 * با CTAهای واقعیِ سایت جلویش ساخته می‌شود — نه فهرست خدمات، بلکه «پلن».
 */

type PlanStep = {
  title: string;
  desc: string;
  href: string;
  cta: string;
  tag?: string;
};

type SituationPlan = {
  key: string;
  label: string;
  icon: IconKey;
  headline: string;
  intro: string;
  steps: PlanStep[];
};

const PLANS: SituationPlan[] = [
  {
    key: "family",
    label: "طلاق، مهریه و نفقه",
    icon: "family",
    headline: "مسیر پروندهٔ خانواده",
    intro: "از دانستن دقیق حقوق‌تان تا اجرای آن — سه گام مطمئن:",
    steps: [
      {
        title: "حقوق‌تان را دقیق بدانید",
        desc: "وکیل خانواده به‌صورت متنی، صوتی یا تصویری مهریه، نفقه و حضانت را برای وضعیت شما روشن می‌کند.",
        href: "/consultation",
        cta: "رزرو مشاوره",
        tag: "تعرفه شفاف",
      },
      {
        title: "دادخواست تنظیم‌شده بگیرید",
        desc: "دادخواست طلاق، مطالبهٔ مهریه یا نفقه — آمادهٔ ثبت در دادگاه.",
        href: "/legal-forms",
        cta: "فرم‌های حقوقی",
        tag: "تنظیم تخصصی",
      },
      {
        title: "وکیل متخصص خانواده انتخاب کنید",
        desc: "وکلای راستی‌آزمایی‌شدهٔ دادورزان با فیلتر تخصص خانواده.",
        href: "/lawyers?sp=خانواده",
        cta: "وکیل‌یابی",
      },
    ],
  },
  {
    key: "inheritance",
    label: "ارث و انحصار وراثت",
    icon: "scale",
    headline: "مسیر ارث و ترکه",
    intro: "از گواهی انحصار وراثت تا تقسیم سهم‌الارث:",
    steps: [
      {
        title: "بستهٔ انحصار وراثت",
        desc: "از استعلام مالیات بر ارث تا صدور گواهی — نمایندهٔ دادورزان همهٔ مراجعه‌ها را انجام می‌دهد.",
        href: "/services/inheritance-package",
        cta: "مشاهدهٔ بسته",
        tag: "قیمت مشخص",
      },
      {
        title: "سهم‌الارث‌تان را حساب کنید",
        desc: "از دستیار هوشمند بپرسید سهم هر وراث طبق قانون چقدر است.",
        href: "/ai-assistant?q=%D8%B3%D9%87%D9%85%E2%80%8C%D8%A7%D9%84%D8%A7%D8%B1%D8%AB%20%DA%86%DA%AF%D9%88%D9%86%D9%87%20%D9%85%D8%AD%D8%A7%D8%B3%D8%A8%D9%87%20%D9%85%DB%8C%E2%80%8C%D8%B4%D9%88%D8%AF%D8%9F",
        cta: "پرسش رایگان",
        tag: "رایگان",
      },
      {
        title: "وکیل متخصص ارث",
        desc: "برای اختلاف در تقسیم ترکه یا فروش ماترک.",
        href: "/lawyers?sp=ارث",
        cta: "وکیل‌یابی",
      },
    ],
  },
  {
    key: "cheque",
    label: "چک و مطالبات",
    icon: "money",
    headline: "مسیر وصول وجه",
    intro: "در چک برگشتی، سرعت همه‌چیز است — از همین امروز:",
    steps: [
      {
        title: "اقدام سریع: اظهارنامه و دادخواست",
        desc: "فرم اظهارنامهٔ حقوقی و دادخواست مطالبهٔ وجه — آمادهٔ ارسال.",
        href: "/legal-forms",
        cta: "تنظیم اظهارنامه",
        tag: "سریع",
      },
      {
        title: "مهلت‌ها را از دستیار بپرسید",
        desc: "چک برگشتی چه مسیر قانونی دارد و چه زمانی باید به اجرا گذاشته شود؟",
        href: "/ai-assistant?q=%DA%86%DA%A9%20%D8%A8%D8%B1%DA%AF%D8%B4%D8%AA%DB%8C%20%DA%86%D9%87%20%D9%85%D8%B3%DB%8C%D8%B1%20%D9%82%D8%A7%D9%86%D9%88%D9%86%DB%8C%20%D8%AF%D8%A7%D8%B1%D8%AF%D8%9F",
        cta: "پرسش رایگان",
        tag: "رایگان",
      },
      {
        title: "وکیل متخصص چک و اسناد",
        desc: "برای مطالبه از طریق اجرای ثبت یا دادگاه.",
        href: "/lawyers?sp=چک و اسناد",
        cta: "وکیل‌یابی",
      },
    ],
  },
  {
    key: "property",
    label: "ملک و اجاره",
    icon: "home",
    headline: "مسیر اختلاف ملکی",
    intro: "از قراردادِ بی‌ریسک تا تخلیه و سند:",
    steps: [
      {
        title: "پیش از امضا، ریسک را بسنجید",
        desc: "تحلیل هوشمند قرارداد اجاره یا خرید؛ بندهای پرریسک را نشان می‌دهد.",
        href: "/contracts/review",
        cta: "تحلیل قرارداد",
        tag: "هوشمند",
      },
      {
        title: "دادخواست تخلیه یا الزام به تنظیم سند",
        desc: "تخصصی‌ترین فرم‌های ملکی، آمادهٔ ثبت.",
        href: "/legal-forms",
        cta: "فرم‌های ملکی",
      },
      {
        title: "وکیل متخصص ملکی",
        desc: "تخلیه، تصرف عدوانی، خلع ید و اختلاف سند.",
        href: "/lawyers?sp=ملک",
        cta: "وکیل‌یابی",
      },
    ],
  },
  {
    key: "labor",
    label: "کار و بیمه",
    icon: "briefcase",
    headline: "مسیر حقوق کار",
    intro: "حق کارگر و کارفرما، بدون ابهام:",
    steps: [
      {
        title: "حق‌تان را از دستیار بپرسید",
        desc: "مثلاً: «کارفرما بیمه نریخته چه کنم؟» — پاسخ مستند و رایگان.",
        href: "/ai-assistant?q=%DA%A9%D8%A7%D8%B1%D9%81%D8%B1%D9%85%D8%A7%20%D8%A8%DB%8C%D9%85%D9%87%20%D9%86%D8%B1%DB%8C%D8%AE%D8%AA%D9%87%20%D8%8C%20%DA%86%D9%87%20%DA%A9%D9%86%D9%85%D8%9F",
        cta: "پرسش رایگان",
        tag: "رایگان",
      },
      {
        title: "وکیل کارمندان",
        desc: "خدمت تخصصی دادورزان برای حقوق کار و تأمین اجتماعی.",
        href: "/employee-lawyers",
        cta: "مشاهدهٔ خدمت",
      },
      {
        title: "پرونده‌تان را ثبت کنید",
        desc: "کارشناسان دادورزان بررسی اولیه می‌کنند و وکیل مناسب معرفی می‌شود.",
        href: "/case/new",
        cta: "ثبت پرونده",
      },
    ],
  },
  {
    key: "contract",
    label: "قرارداد و اسناد",
    icon: "document",
    headline: "مسیر قرارداد امن",
    intro: "بسازید، بسنجید، امضا کنید:",
    steps: [
      {
        title: "قراردادتان را بسازید",
        desc: "قراردادساز دادورزان؛ گام‌به‌گام تا خروجی نهایی.",
        href: "/contracts/builder",
        cta: "قراردادساز",
        tag: "گام‌به‌گام",
      },
      {
        title: "ریسک‌ها را بررسی کنید",
        desc: "تحلیل هوشمند بندهای پرریسک، پیش از امضا.",
        href: "/contracts/review",
        cta: "تحلیل ریسک",
      },
      {
        title: "تنظیم توسط وکیل",
        desc: "قراردادهای اختصاصی با تنظیم وکیل متخصص.",
        href: "/contracts",
        cta: "همهٔ قراردادها",
      },
    ],
  },
  {
    key: "business",
    label: "شرکت و مالیات",
    icon: "building",
    headline: "مسیر کسب‌وکار",
    intro: "از ثبت تا مالیات، بدون کاغذبازی:",
    steps: [
      {
        title: "ثبت شرکت و برند",
        desc: "خدمات ثبتی دادورزان؛ از انتخاب نام تا ثبت نهایی.",
        href: "/pricing",
        cta: "خدمات ثبتی",
      },
      {
        title: "کارهای ادارهٔ مالیات",
        desc: "برگهٔ تشخیص، اعتراض و پرداخت مالیاتی — با نمایندهٔ رسمی.",
        href: "/services/tax-office-admin",
        cta: "مشاهدهٔ خدمت",
      },
      {
        title: "پکیج حقوقی کسب‌وکارها",
        desc: "قراردادهای B2B، مشاورهٔ مستمر و تحلیل ریسک.",
        href: "/business",
        cta: "پکیج کسب‌وکار",
      },
    ],
  },
  {
    key: "criminal",
    label: "کیفری و دفاع",
    icon: "shield",
    headline: "مسیر دفاع کیفری",
    intro: "در پروندهٔ کیفری زمان طلاست — فوری اقدام کنید:",
    steps: [
      {
        title: "فوری: با وکیل حرف بزنید",
        desc: "مشاورهٔ سریع صوتی یا تصویری؛ اولین تصمیم‌ها سرنوشت‌ساز است.",
        href: "/consultation",
        cta: "رزرو مشاوره",
        tag: "فوری",
      },
      {
        title: "شکواییه تنظیم کنید",
        desc: "فرم شکواییهٔ تخصصی، آمادهٔ ثبت در دادسرا.",
        href: "/legal-forms",
        cta: "تنظیم شکواییه",
      },
      {
        title: "وکیل متخصص کیفری",
        desc: "دفاع در دادسرا و دادگاه با پروانهٔ معتبر.",
        href: "/lawyers?sp=کیفری",
        cta: "وکیل‌یابی",
      },
    ],
  },
];

const spring = { type: "spring" as const, stiffness: 210, damping: 24 };

export function SituationRouter() {
  const t = useT();
  const [active, setActive] = useState<string>(PLANS[0].key);
  const plan = PLANS.find((p) => p.key === active) ?? PLANS[0];

  return (
    <div>
      {/* چیپ‌های موضوع */}
      <div className="flex flex-wrap justify-center gap-2">
        {PLANS.map((p) => {
          const isActive = p.key === active;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setActive(p.key)}
              aria-pressed={isActive}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-all duration-250 active:scale-95 sm:text-[13px] ${
                isActive
                  ? "border-accent bg-accent text-accent-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--accent)_55%,transparent)]"
                  : "border-border bg-surface text-foreground-soft hover:border-accent/50 hover:bg-accent-soft/50 hover:text-accent-text"
              }`}
            >
              <Icon name={p.icon} className="h-4 w-4" />
              {t(p.label)}
            </button>
          );
        })}
      </div>

      {/* پنل مسیر پیشنهادی */}
      <div className="mt-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={plan.key}
            initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-3xl border border-border bg-surface card-shadow"
            aria-live="polite"
          >
            {/* شارژ طلایی بالای پنل */}
            <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-l from-transparent via-accent to-transparent" aria-hidden />

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-md">
                    <Icon name={plan.icon} className="h-5.5 w-5.5" />
                  </span>
                  <div>
                    <span className="text-[11px] font-bold text-accent-text">{t("مسیر پیشنهادی دادورزان")}</span>
                    <h3 className="text-lg font-black text-foreground sm:text-xl">{t(plan.headline)}</h3>
                  </div>
                </div>
                <p className="text-xs leading-6 text-muted sm:max-w-[34ch]">{t(plan.intro)}</p>
              </div>

              {/* گام‌ها با خط اتصال عمودی */}
              <ol className="relative mt-7 space-y-5">
                <span className="absolute bottom-6 right-[21px] top-6 w-[2px] bg-gradient-to-b from-accent/45 via-border to-border" aria-hidden />
                {plan.steps.map((s, i) => (
                  <motion.li
                    key={s.title}
                    initial={{ opacity: 0, x: 22 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring, delay: 0.1 + i * 0.09 }}
                    className="relative flex items-start gap-4"
                  >
                    <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-accent/40 bg-background text-sm font-black text-accent-text">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 rounded-2xl border border-border bg-background/60 p-4 transition-colors duration-300 hover:border-accent/30">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-black text-foreground">{t(s.title)}</h4>
                        {s.tag && (
                          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent-text">
                            {t(s.tag)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-6 text-muted sm:text-[13px]">{t(s.desc)}</p>
                      <Link
                        href={s.href}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-primary/25 bg-primary-soft px-3.5 py-2 text-xs font-bold text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground active:scale-95"
                      >
                        {t(s.cta)}
                        <Icon name="arrow" className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </motion.li>
                ))}
              </ol>

              {/* مسیر جایگزین */}
              <p className="mt-6 flex flex-wrap items-center gap-1.5 border-t border-border pt-4 text-xs text-muted">
                <Icon name="sparkles" className="h-3.5 w-3.5 text-accent-text" />
                {t("موضوعت در فهرست نیست؟")}
                <Link href="/ai-assistant" className="font-bold text-primary hover:text-primary-hover">
                  {t("همین‌جا از دستیار بپرس — رایگان")}
                </Link>
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
