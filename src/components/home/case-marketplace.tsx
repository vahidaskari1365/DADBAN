import Link from "next/link";
import { db } from "@/db";
import { cases, caseOffers, lawyers } from "@/db/schema";
import { sql, inArray } from "drizzle-orm";
import { Reveal } from "@/components/reveal";
import { Icon } from "@/components/icons";
import { Container } from "@/components/ui";
import { faNum } from "@/lib/data";

/**
 * بخش «بازار پرونده‌ها» در صفحهٔ اول — معرفی کوتاه فرآیند سه‌گامی
 * (ثبت پرونده ← پیشنهاد قیمت وکلا ← انتخاب بهترین) با آمار زندهٔ دیتابیس و
 * دو CTA (ثبت پرونده / دیدن بازار). رندر سمت سرور و بدون ریسک: هر خطای دیتابیس
 * فقط آمار را حذف می‌کند.
 */

export async function CaseMarketplace() {
  let stats = { openCases: 0, totalOffers: 0, lawyers: 0 };
  let hasData = false;
  try {
    const rows = await db
      .select({
        id: cases.id,
        accepted: sql<boolean>`exists (
          select 1 from ${caseOffers}
          where ${caseOffers.caseId} = ${cases.id} and ${caseOffers.status} = 'accepted'
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
    <div>
      <Reveal variant="blur">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold tracking-wide text-accent-text">
            بازار پرونده‌ها
          </span>
          <h2 className="mt-3 text-pretty text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-[2rem]">
            پرونده‌تان را به رقابت بگذارید؛ بهترین پیشنهاد را انتخاب کنید
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
            مثل بازار کار، ولی برای پرونده‌های حقوقی: موکل پرونده را ثبت می‌کند، وکلای متخصص نظر و پیشنهاد قیمت اعلام می‌کنند و موکل آزادانه بهترین را انتخاب می‌کند.
          </p>
        </div>
      </Reveal>

      {/* سه گام */}
      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 70} variant="start">
            <div className="flex h-full items-start gap-3 rounded-2xl border border-border bg-surface p-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon name={s.icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black text-foreground">
                  <span className="tnum text-primary">{faNum(i + 1)}. </span>
                  {s.title}
                </p>
                <p className="mt-1 text-xs leading-6 text-muted">{s.desc}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* آمار زنده + CTA */}
      <Reveal delay={120} variant="blur">
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row">
          {hasData ? (
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center sm:text-start">
              <span className="text-xs text-muted">
                <strong className="tnum text-base font-black text-foreground">{faNum(stats.openCases)}</strong> پروندهٔ باز
              </span>
              <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
              <span className="text-xs text-muted">
                <strong className="tnum text-base font-black text-foreground">{faNum(stats.totalOffers)}</strong> پیشنهاد قیمت ثبت‌شده
              </span>
              <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
              <span className="text-xs text-muted">
                <strong className="tnum text-base font-black text-foreground">{faNum(stats.lawyers)}</strong> وکیل متخصص
              </span>
            </div>
          ) : (
            <p className="text-xs leading-6 text-muted">ثبت پرونده و دریافت پیشنهاد قیمت برای موکل کاملاً رایگان است.</p>
          )}
          <div className="flex shrink-0 flex-wrap justify-center gap-2">
            <Link
              href="/case/new"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover"
            >
              <Icon name="plus" className="h-4 w-4" />
              ثبت پرونده
            </Link>
            <Link
              href="/case-board"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-bold text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
            >
              دیدن بازار پرونده‌ها
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
