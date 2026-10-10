import type { CSSProperties } from "react";
import Link from "next/link";
import { db } from "@/db";
import { cases, caseOffers, lawyers } from "@/db/schema";
import { sql, inArray } from "drizzle-orm";
import { Reveal } from "@/components/reveal";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { faNum } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { StatCount } from "@/components/home/stat-count";

/**
 * بخش «بازار پرونده‌ها» در صفحهٔ اول — کل بخش داخل همان پنل سرمه‌ای
 * «باکس آبی» صفحات بازار پروژه‌ها/مشاوره (hero-market) با عکس تالار مزایده،
 * موشن گرافی سینمایی (کن‌بیرنز آرام عکس، جاروی نور، ذرات طلایی شناور،
 * ورود پلکانی محتوا و شمارندهٔ متحرک آمار) و دو CTA (ثبت پرونده / دیدن بازار).
 * رندر سمت سرور و بدون ریسک: هر خطای دیتابیس فقط آمار را حذف می‌کند.
 */

/** ذرات طلایی شناور پنل — موقعیت/اندازه/سرعت هر ذره با متغیرهای --p-* */
const MARKET_PARTICLES = [
  { pos: "start-[8%] bottom-6", size: "h-1.5 w-1.5", op: 0.5, dur: "8s", delay: "0s" },
  { pos: "start-[24%] bottom-10", size: "h-1 w-1", op: 0.4, dur: "10s", delay: "2.2s" },
  { pos: "start-[47%] bottom-4", size: "h-1.5 w-1.5", op: 0.45, dur: "9s", delay: "4.1s" },
  { pos: "start-[70%] bottom-8", size: "h-1 w-1", op: 0.35, dur: "11s", delay: "1.3s" },
  { pos: "start-[88%] bottom-5", size: "h-1.5 w-1.5", op: 0.5, dur: "8.5s", delay: "3.4s" },
] as const;

export async function CaseMarketplace() {
  const t = await getT();
  let stats = { openCases: 0, totalOffers: 0, lawyers: 0 };
  let hasData = false;
  try {
    const rows = await db
      .select({
        id: cases.id,
        // زیرکوئری با نام صریح — drizzle ستون‌ها را در sql`` بدون پیشوند جدول
        // رندر می‌کند و «id» به case_offers.id اشاره می‌شد (باگ فیلتر پذیرفته‌شده‌ها)
        accepted: sql<boolean>`exists (
          select 1 from case_offers co
          where co.case_id = cases.id and co.status = 'accepted'
        )`,
      })
      .from(cases)
      .where(sql`${cases.status} in ('new','reviewing')`)
      .limit(200);
    const open = rows.filter((r) => !r.accepted);
    const ids = open.map((r) => r.id);
    const [offerAgg, lawyerAgg] = await Promise.all([
      ids.length
        ? db.select({ n: sql<number>`count(*)::int` }).from(caseOffers).where(inArray(caseOffers.caseId, ids))
        : Promise.resolve([{ n: 0 }]),
      db.select({ n: sql<number>`count(*)::int` }).from(lawyers),
    ]);
    stats = {
      openCases: open.length,
      totalOffers: Number(offerAgg[0]?.n ?? 0),
      lawyers: Number(lawyerAgg[0]?.n ?? 0),
    };
    hasData = true;
  } catch {
    /* دیتابیس در دسترس نیست — بخش بدون آمار رندر می‌شود */
  }

  const STEPS: { icon: "file" | "mail" | "check"; title: string; desc: string }[] = [
    { icon: "file", title: "پرونده را ثبت کنید", desc: "فرم ۲ دقیقه‌ای: موضوع، شهر و توضیحات — کد پیگیری محرمانه می‌گیرید." },
    { icon: "mail", title: "وکلا قیمت پیشنهاد می‌دهند", desc: "وکلای متخصص استان شما پرونده را می‌بینند و نظر و قیمت‌شان را ثبت می‌کنند." },
    { icon: "check", title: "بهترین را انتخاب می‌کنید", desc: "پیشنهادها را مقایسه کنید، وکیل‌تان را انتخاب کنید و با خیال راحت شروع کنید." },
  ];

  return (
    <div className="hero-market hero-market--custom relative overflow-hidden rounded-3xl">
      {/* لایه‌های سینمایی — عکس با کن‌بیرنز + دیمر + هالهٔ طلایی + دیم تکمیلی + بافت نقطه‌ای */}
      <div
        aria-hidden
        className="hero-market-photo hero-market-kenburns pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'url("/images/hero-market-bg.png")' }}
      />
      <div aria-hidden className="hero-market-dim pointer-events-none absolute inset-0" />
      <div aria-hidden className="hero-market-glow pointer-events-none absolute inset-0" />
      {/* دیم تکمیلی — محتوای این بخش کل پنل را می‌پوشاند، پس کنتراست سراسری کمی بالاتر */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[rgb(13_34_62/0.28)] dark:bg-[rgb(10_18_32/0.32)]" />
      <div aria-hidden className="hero-market-dots pointer-events-none absolute inset-0" />
      {/* ذرات طلایی شناور */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {MARKET_PARTICLES.map((p, i) => (
          <span
            key={i}
            className={`hero-particle absolute ${p.pos} ${p.size} rounded-full bg-[#eec97b]`}
            style={{ "--p-op": p.op, "--p-dur": p.dur, "--p-delay": p.delay } as CSSProperties}
          />
        ))}
      </div>

      <div className="relative px-5 py-10 sm:px-10 sm:py-14">
        <Reveal variant="blur">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(230_185_78/0.35)] bg-[rgb(230_185_78/0.14)] px-3 py-1 text-xs font-semibold tracking-wide text-[#eec97b]">
              <Icon name="sparkles" className="h-3.5 w-3.5" />
              {t("بازار پرونده‌ها")}
            </span>
            <h2 className="mt-3 text-pretty text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-[2rem]">
              {t("پرونده‌تان را به رقابت بگذارید؛ بهترین پیشنهاد را انتخاب کنید")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/75 sm:text-base">
              {t("مثل بازار کار، ولی برای پرونده‌های حقوقی: موکل پرونده را ثبت می‌کند، وکلای متخصص نظر و پیشنهاد قیمت اعلام می‌کنند و موکل آزادانه بهترین را انتخاب می‌کند.")}
            </p>
          </div>
        </Reveal>

        {/* سه گام — کارت‌های شیشه‌ای روی پنل */}
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 90} variant="start">
              <div className="flex h-full items-start gap-3 rounded-2xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur-[2px] transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.11] sm:p-5">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgb(230_185_78/0.14)] text-[#eec97b]">
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-white">
                    <span className="tnum text-[#eec97b]">{faNum(i + 1)}. </span>
                    {t(s.title)}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-white/70">{t(s.desc)}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* آمار زنده با شمارندهٔ متحرک + CTA */}
        <Reveal delay={140} variant="blur">
          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/12 bg-white/[0.07] p-5 backdrop-blur-[2px] sm:flex-row">
            {hasData ? (
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center sm:text-start">
                <span className="text-xs text-white/70">
                  <strong className="tnum text-base font-black text-white">
                    <StatCount value={stats.openCases} />
                  </strong>{" "}
                  {t("پروندهٔ باز")}
                </span>
                <span className="hidden h-4 w-px bg-white/15 sm:block" aria-hidden />
                <span className="text-xs text-white/70">
                  <strong className="tnum text-base font-black text-white">
                    <StatCount value={stats.totalOffers} />
                  </strong>{" "}
                  {t("پیشنهاد قیمت ثبت‌شده")}
                </span>
                <span className="hidden h-4 w-px bg-white/15 sm:block" aria-hidden />
                <span className="text-xs text-white/70">
                  <strong className="tnum text-base font-black text-white">
                    <StatCount value={stats.lawyers} />
                  </strong>{" "}
                  {t("وکیل متخصص")}
                </span>
              </div>
            ) : (
              <p className="text-xs leading-6 text-white/70">{t("ثبت پرونده و دریافت پیشنهاد قیمت برای موکل کاملاً رایگان است.")}</p>
            )}
            <div className="flex shrink-0 flex-wrap justify-center gap-2">
              <Button href="/case/new" variant="accent" icon="plus">
                {t("ثبت پرونده")}
              </Button>
              <Link
                href="/case-board"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
              >
                {t("دیدن بازار پرونده‌ها")}
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>

      {/* جاروی نور سینمایی — روی کل پنل و محتوا، هر ۹ ثانیه یک بار */}
      <div aria-hidden className="hero-sheen pointer-events-none absolute inset-y-0 start-0 w-1/3" />
    </div>
  );
}
