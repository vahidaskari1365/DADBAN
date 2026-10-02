import Link from "next/link";
import { db } from "@/db";
import { lawyers, articles, qaQuestions, contracts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Container, SectionHeading, Button, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LawyerCard } from "@/components/lawyer-card";
import { HomeHero } from "@/components/home-hero";
import { Reveal } from "@/components/reveal";
import { Counter } from "@/components/counter";
import { faNum, faPrice } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import { RelatedLinks } from "@/components/related-links";
import { getPlatformStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

/* ------------------------- فرآیند: از مشکل تا راه‌حل ------------------------- */
const FLOW: { title: string; desc: string; icon: IconKey }[] = [
  { title: "تشریح مشکل", desc: "مشکل حقوقی خود را در چند دقیقه می‌نویسید یا توضیح می‌دهید.", icon: "chat" },
  { title: "معرفی وکلا", desc: "فهرست وکلای متخصص متناسب با موضوع شما نمایش داده می‌شود.", icon: "user" },
  { title: "مقایسه پیشنهادها", desc: "قیمت و دامنه خدمات وکلا را شفاف کنار هم می‌بینید.", icon: "balance" },
  { title: "انتخاب وکیل", desc: "با خیال آسوده، وکیل مورد اعتماد خود را انتخاب می‌کنید.", icon: "check" },
  { title: "قرارداد الکترونیکی", desc: "قرارداد به‌صورت برخط تنظیم و امضای دیجیتال می‌شود.", icon: "document" },
  { title: "پیگیری پرونده", desc: "روند پرونده را گام‌به‌گام در تایم‌لاین دنبال می‌کنید.", icon: "clock" },
];

/* ------------------------------ چرا دادپیو؟ ------------------------------ */
const WHY: { title: string; desc: string; icon: IconKey }[] = [
  { title: "امنیت بالا و محرمانگی اطلاعات", desc: "اطلاعات شما رمزنگاری‌شده و محرمانه نگه‌داری می‌شود و در اختیار هیچ شخص ثالثی قرار نمی‌گیرد.", icon: "lock" },
  { title: "اتصال مستقیم به وکلای متخصص", desc: "بدون واسطه با وکلای پایه یک دادگستری با پروانه راستی‌آزمایی‌شده در ارتباط هستید.", icon: "badge" },
  { title: "دسترسی آسان از موبایل و وب", desc: "همه خدمات دادپیو روی موبایل و وب در دسترس است؛ بدون نیاز به نصب نرم‌افزار.", icon: "phone" },
  { title: "پرداخت امن و اقساطی", desc: "پرداخت حق‌الوکاله از طریق درگاه امن انجام می‌شود و امکان پرداخت اقساطی نیز فراهم است.", icon: "money" },
  { title: "پشتیبانی ۲۴ ساعته", desc: "تیم پشتیبانی دادپیو در تمام ساعات شبانه‌روز پاسخ‌گوی پرسش‌های شماست.", icon: "clock" },
  { title: "قرارداد الکترونیکی", desc: "قرارداد وکالت به‌صورت الکترونیکی تنظیم، امضا و برای طرفین قابل دسترسی می‌ماند.", icon: "document" },
];

/* ------------------------- مراحل ویزارد ثبت پرونده با AI ------------------------- */
const CASE_STEPS: { title: string; desc: string; icon: IconKey }[] = [
  { title: "اطلاعات اولیه", desc: "نام، شهر و موضوع پرونده", icon: "id" },
  { title: "جزئیات پرونده", desc: "شرح مشکل و مرحله فعلی", icon: "file" },
  { title: "مستندات", desc: "بارگذاری اسناد و مدارک", icon: "document" },
  { title: "تحلیل هوش مصنوعی", desc: "ارزیابی و دسته‌بندی هوشمند", icon: "sparkles" },
  { title: "انتشار برای وکلا", desc: "دریافت پیشنهاد قیمت وکلا", icon: "send" },
];

export default async function HomePage() {
  let featured: typeof lawyers.$inferSelect[] = [];
  let recentArticles: typeof articles.$inferSelect[] = [];
  let popularQa: typeof qaQuestions.$inferSelect[] = [];
  let popularContracts: typeof contracts.$inferSelect[] = [];
  let stats: Awaited<ReturnType<typeof getPlatformStats>> = {
    verifiedLawyers: null,
    registeredCases: null,
    answeredQuestions: null,
    publishedArticles: null,
  };
  try {
    [featured, recentArticles, popularQa, popularContracts, stats] = await Promise.all([
      db.select().from(lawyers).where(eq(lawyers.featured, true)).limit(4),
      db.select().from(articles).orderBy(desc(articles.publishedAt)).limit(3),
      db.select().from(qaQuestions).orderBy(desc(qaQuestions.helpful)).limit(3),
      db.select().from(contracts).where(eq(contracts.popular, true)).limit(3),
      getPlatformStats(),
    ]);
  } catch (err) {
    console.error("[dadpayo] homepage query failed:", err);
  }

  // Real numbers only — nothing fabricated; a metric is hidden when unknown.
  const realStats: { to: number; label: string; icon: IconKey }[] = [
    ...(stats.verifiedLawyers != null ? [{ to: stats.verifiedLawyers, label: "وکیل تأییدشده", icon: "badge" as IconKey }] : []),
    ...(stats.registeredCases != null && stats.registeredCases > 0 ? [{ to: stats.registeredCases, label: "پرونده ثبت‌شده", icon: "folder" as IconKey }] : []),
    ...(stats.answeredQuestions != null && stats.answeredQuestions > 0 ? [{ to: stats.answeredQuestions, label: "پرسش حقوقی پاسخ‌داده‌شده", icon: "chat" as IconKey }] : []),
    ...(stats.publishedArticles != null && stats.publishedArticles > 0 ? [{ to: stats.publishedArticles, label: "مقاله حقوقی منتشرشده", icon: "book" as IconKey }] : []),
  ];

  return (
    <div>
      {/* ۱) هیرو سرمه‌ای تمام‌عرض — جستجوی هوشمند + کمک فوری + دسترسی سریع */}
      <HomeHero />

      <Container>
        {/* ۲) نوار فرآیند «از مشکل تا راه‌حل، کنار شما هستیم» */}
        <section className="mt-16 sm:mt-20">
          <Reveal>
            <SectionHeading
              eyebrow="فرآیند کار"
              title="از مشکل تا راه‌حل، کنار شما هستیم"
              desc="شش گام شفاف از لحظه توضیح مشکل تا پیگیری کامل پرونده."
            />
          </Reveal>
          <Reveal delay={80}>
            <div className="relative mt-10">
              {/* خط اتصال — موبایل: عمودی کنار آیکون‌ها · دسکتاپ: افقی پشت آیکون‌ها */}
              <div
                aria-hidden
                className="absolute bottom-4 right-[27px] top-4 w-px bg-border md:bottom-auto md:left-8 md:right-8 md:top-7 md:h-px md:w-auto"
              />
              <ol className="relative grid gap-7 md:grid-cols-6 md:gap-4">
                {FLOW.map((s, i) => (
                  <li key={s.title} className="flex items-start gap-4 md:flex-col md:items-center md:gap-3 md:text-center">
                    <span className="relative z-10 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-primary shadow-[var(--shadow-card)]">
                      <Icon name={s.icon} className="h-6 w-6" />
                      <span className="btn-gold absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black">
                        {faNum(i + 1)}
                      </span>
                    </span>
                    <div className="min-w-0 md:max-w-[160px]">
                      <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-muted">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </section>

        {/* ۳) چرا دادپیو؟ — ۶ مزیت */}
        <section className="mt-20 sm:mt-24">
          <Reveal>
            <SectionHeading
              eyebrow="چرا دادپیو؟"
              title="اعتماد، اصل ماجراست"
              desc="چرا هزاران موکل و وکیل مسیر خود را از دادپیو شروع می‌کنند."
            />
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY.map((w, i) => (
              <Reveal key={w.title} delay={i * 50}>
                <Card className="flex h-full items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon name={w.icon} className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground">{w.title}</h3>
                    <p className="mt-1.5 text-xs leading-6 text-muted">{w.desc}</p>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ۴) وکلای برتر — دادهٔ واقعی از پایگاه داده (همان منبع /api/lawyers) */}
        {featured.length > 0 && (
          <section className="mt-20 sm:mt-24">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <SectionHeading
                  align="start"
                  eyebrow="وکیل‌یابی"
                  title="وکلای برتر دادپیو"
                  desc="از میان وکلای متخصص با پروانه معتبر، انتخاب کنید."
                />
                <Button href="/lawyers" variant="outline" icon="arrow" className="shrink-0">
                  مشاهده همهٔ وکلا
                </Button>
              </div>
            </Reveal>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((l, i) => (
                <Reveal key={l.id} delay={i * 60}>
                  <LawyerCard lawyer={l} />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* ۵) بنر «ثبت هوشمند پرونده با AI» — ۵ مرحلهٔ ویزارد */}
        <section className="mt-20 sm:mt-24">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl p-7 text-white sm:p-10" style={{ background: "linear-gradient(150deg, #101b35 0%, #17264a 55%, #0b1328 100%)" }}>
              <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "radial-gradient(closest-side, rgba(213,168,76,.35), transparent)" }} />
              <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full blur-3xl" style={{ background: "radial-gradient(closest-side, rgba(127,216,238,.18), transparent)" }} />

              <div className="relative grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(213,168,76,.5)] bg-[rgba(213,168,76,.12)] px-3 py-1 text-xs font-bold text-[color:var(--gold)]">
                    <Icon name="sparkles" className="h-3.5 w-3.5" /> تازه در دادپیو
                  </span>
                  <h2 className="mt-4 flex items-center gap-3 text-2xl font-black leading-snug sm:text-3xl">
                    <span className="dp-logo-ring inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
                      <Icon name="balance" className="h-6 w-6" />
                    </span>
                    ثبت هوشمند پرونده با هوش مصنوعی
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-8 text-white/75">
                    پرونده خود را در ویزارد پنج‌مرحله‌ای ثبت کنید؛ هوش مصنوعی دادپیو موضوع را تحلیل می‌کند و
                    پرونده شما برای وکلای متخصص همان حوزه منتشر می‌شود تا پیشنهاد قیمت دریافت کنید.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                      href="/case/new"
                      className="btn-gold inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl px-6 text-base font-bold transition-all duration-200 hover:brightness-105 active:scale-[.97]"
                    >
                      <Icon name="folder" className="h-5 w-5" />
                      شروع ثبت پرونده
                    </Link>
                    <Link
                      href="/ai-assistant"
                      className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                    >
                      <Icon name="chat" className="h-4 w-4" />
                      اول با دستیار هوشمند مشورت می‌کنم
                    </Link>
                  </div>
                </div>

                {/* مراحل ویزارد */}
                <ol className="relative space-y-1 border-r border-white/15 pr-5">
                  {CASE_STEPS.map((s, i) => (
                    <li key={s.title} className="relative flex items-start gap-3 rounded-xl py-2.5">
                      <span className="absolute -right-[31px] top-4 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(213,168,76,.55)] bg-[#101b35] text-[10px] font-black text-[color:var(--gold)]">
                        {faNum(i + 1)}
                      </span>
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[color:var(--gold)]">
                        <Icon name={s.icon} className="h-4.5 w-4.5" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">{s.title}</p>
                        <p className="mt-0.5 text-xs text-white/70">{s.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Reveal>
        </section>

        {/* آمار — فقط اعداد واقعیِ برگرفته از پایگاه داده */}
        {realStats.length > 0 && (
          <section className="mt-20 sm:mt-24">
            <Reveal>
              <div className="grid grid-cols-2 gap-4 rounded-3xl border border-border bg-surface/80 p-6 card-shadow backdrop-blur sm:grid-cols-4 sm:p-8">
                {realStats.map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-1.5 text-center">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <Icon name={s.icon} className="h-5 w-5" />
                    </span>
                    <Counter
                      to={s.to}
                      className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
                    />
                    <span className="text-xs text-muted sm:text-sm">{s.label}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* دانش حقوقی: مقالات + پرسش و پاسخ + قراردادهای پرطرفدار */}
        <section className="mt-20 sm:mt-24">
          <div className="grid gap-8 lg:grid-cols-3">
            <Reveal>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">جدیدترین مقالات</h2>
                <Link href="/knowledge" className="text-sm font-medium text-primary transition-colors hover:text-[#8a6420]">همه ←</Link>
              </div>
              <div className="mt-4 space-y-3">
                {recentArticles.map((a) => (
                  <Link key={a.slug} href={`/knowledge/${a.slug}`} className="block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-surface-2">
                    <div className="flex items-center gap-2 text-xs text-[#8a6420]"><Icon name="book" className="h-3.5 w-3.5" />{a.category}</div>
                    <h3 className="mt-1.5 text-sm font-bold leading-6 text-foreground">{a.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{a.excerpt}</p>
                  </Link>
                ))}
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">پرسش و پاسخ</h2>
                <Link href="/qa" className="text-sm font-medium text-primary transition-colors hover:text-[#8a6420]">همه ←</Link>
              </div>
              <div className="mt-4 space-y-3">
                {popularQa.map((q) => (
                  <Link key={q.slug} href={`/qa#${q.slug}`} className="block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-surface-2">
                    <div className="flex items-start gap-2">
                      <Icon name="chat" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <h3 className="text-sm font-bold leading-6 text-foreground">{q.question}</h3>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted">{q.answer}</p>
                    <p className="mt-2 text-[11px] text-muted">پاسخ {q.lawyerName} • {faNum(q.helpful)} مفید</p>
                  </Link>
                ))}
              </div>
            </Reveal>

            <Reveal delay={160}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">قراردادهای پرطرفدار</h2>
                <Link href="/contracts" className="text-sm font-medium text-primary transition-colors hover:text-[#8a6420]">همه ←</Link>
              </div>
              <div className="mt-4 space-y-3">
                {popularContracts.map((c) => (
                  <Link key={c.slug} href={`/contracts/${c.slug}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-surface-2">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <Icon name={c.icon as IconKey} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-foreground">{c.title}</h3>
                      <p className="text-xs text-muted">از {faPrice(c.samplePrice)}</p>
                    </div>
                    <Icon name="chevron" className="h-4 w-4 shrink-0 rotate-180 text-muted" />
                  </Link>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA پایانی */}
        <section className="mt-20 pb-8 sm:mt-24">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl p-8 text-center sm:p-12" style={{ background: "linear-gradient(150deg, #101b35 0%, #17264a 55%, #0b1328 100%)" }}>
              <div aria-hidden className="pointer-events-none absolute -top-20 right-1/4 h-56 w-56 rounded-full blur-3xl" style={{ background: "radial-gradient(closest-side, rgba(213,168,76,.3), transparent)" }} />
              <div className="relative">
                <h2 className="text-2xl font-black text-white sm:text-3xl">آماده‌اید مشکل حقوقی‌تان را حل کنید؟</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-white/70">
                  همین حالا وکیل متخصص خود را پیدا کنید یا پرونده‌تان را ثبت نمایید. تیم دادپیو کنار شماست.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/lawyers"
                    className="btn-gold inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl px-6 text-base font-bold transition-all duration-200 hover:brightness-105 active:scale-[.97]"
                  >
                    <Icon name="search" className="h-5 w-5" />
                    پیدا کردن وکیل
                  </Link>
                  <Link
                    href="/case/new"
                    className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    <Icon name="folder" className="h-5 w-5" />
                    ثبت پرونده
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* لینک‌های مرتبط — SEO و UX */}
        <div className="pb-4">
          <RelatedLinks pathname="/" />
        </div>
      </Container>
    </div>
  );
}
