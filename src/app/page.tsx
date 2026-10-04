import Link from "next/link";
import { db } from "@/db";
import { lawyers, articles, qaQuestions, contracts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Container, SectionHeading, Button, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LawyerCard } from "@/components/lawyer-card";
import { PinMasonry } from "@/components/pin-masonry";
import { HomeHero } from "@/components/home-hero";
import { Reveal } from "@/components/reveal";
import { Counter } from "@/components/counter";
import { CONSULTATION_TYPES, faNum, faPrice } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import { RelatedLinks } from "@/components/related-links";
import { getPlatformStats } from "@/lib/stats";
import { ReviewsSpotlight } from "@/components/amazon/reviews-spotlight";
import { LawyerDiscovery } from "@/components/amazon/recently-viewed";
import { TrustLine } from "@/components/amazon/trust-line";
import { ActionHub, TrustStrip } from "@/components/home/action-hub";
import { AISpotlight } from "@/components/home/ai-spotlight";
import { InPersonServices, type InPersonService } from "@/components/home/inperson";
import { SiteMenu } from "@/components/home/site-menu";
import { CATALOG_SERVICES } from "@/lib/managed-catalog";

export const dynamic = "force-dynamic";

// خدمات حضوری/اداری — از کاتالوگ مدیریت‌شده (فیلتر ADMINISTRATIVE) به‌صورت اسلیم
const IN_PERSON: InPersonService[] = CATALOG_SERVICES.filter(
  (s) => s.category === "ADMINISTRATIVE" && s.active,
).map((s) => ({
  slug: s.slug,
  title: s.title,
  desc: s.shortDescription,
  icon: s.icon,
  basePrice: s.basePrice,
  estimatedTime: s.estimatedTime,
}));
const TOTAL_SERVICES = CATALOG_SERVICES.filter((s) => s.active).length;

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
    console.error("[dadban] homepage query failed:", err);
  }

  // Real numbers only — nothing fabricated; a metric is hidden when unknown.
  const realStats: { to: number; label: string; icon: IconKey }[] = [
    ...(stats.verifiedLawyers != null ? [{ to: stats.verifiedLawyers, label: "وکیل تأییدشده", icon: "badge" as IconKey }] : []),
    ...(stats.registeredCases != null && stats.registeredCases > 0 ? [{ to: stats.registeredCases, label: "پرونده ثبت‌شده", icon: "folder" as IconKey }] : []),
    ...(stats.answeredQuestions != null && stats.answeredQuestions > 0 ? [{ to: stats.answeredQuestions, label: "پرسش حقوقی پاسخ‌داده‌شده", icon: "chat" as IconKey }] : []),
    ...(stats.publishedArticles != null && stats.publishedArticles > 0 ? [{ to: stats.publishedArticles, label: "مقاله حقوقی منتشرشده", icon: "book" as IconKey }] : []),
  ];

  return (
    <div className="page-wash">
      <HomeHero />

      {/* Stats — real, DB-derived counters only */}
      {realStats.length > 0 && (
        <Container>
          <Reveal variant="zoom">
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
        </Container>
      )}

      {/* #1 — هاب یکپارچهٔ اقدام‌ها (بنتو) — جایگزین کارت‌های هدف + خدمات ویژهٔ تکراری */}
      <section className="mt-20">
        <Container>
          <Reveal variant="blur">
            <SectionHeading
              eyebrow="دریافت کمک"
              title="همه‌چیز از یک‌جا"
              desc="هر خدمتی که از دادبان می‌خواهید، همین‌جا یک‌کلیکه در دسترس است."
            />
          </Reveal>
          <div className="mt-10">
            <ActionHub />
          </div>
          <div className="mt-8">
            <TrustStrip />
          </div>
        </Container>
      </section>

      {/* #2 — اسپات‌لایت سینمایی دستیار هوش مصنوعی */}
      <section className="mt-24">
        <Container>
          <AISpotlight />
        </Container>
      </section>

      {/* #3 — خدمات حضوری و اداری */}
      <section className="mt-24">
        <Container>
          <Reveal variant="blur">
            <SectionHeading
              eyebrow="نمایندهٔ شما در اداره‌ها"
              title="کارهای حضوری، دیگر دردسر نیست"
              desc="از اجرای احکام تا انحصار وراثت — نمایندهٔ دادبان با وکالت‌نامهٔ رسمی به‌جای شما می‌رود."
            />
          </Reveal>
          <div className="mt-10">
            <InPersonServices services={IN_PERSON} totalCount={TOTAL_SERVICES} />
          </div>
        </Container>
      </section>

      {/* Featured lawyers */}
      {featured.length > 0 && (
        <section className="mt-24">
          <Container>
            <Reveal variant="blur">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <SectionHeading
                  align="start"
                  eyebrow="وکیل‌یابی"
                  title="وکلای برتر و تأییدشده"
                  desc="از میان وکلای متخصص با پروانه معتبر، انتخاب کنید."
                />
                <Button href="/lawyers" variant="outline" icon="arrow" className="shrink-0">
                  همه وکلا
                </Button>
              </div>
            </Reveal>
            <PinMasonry className="mt-8">
              {featured.map((l, i) => (
                <Reveal key={l.id} delay={i * 60}>
                  <LawyerCard lawyer={l} index={i} priority={i === 0} />
                </Reveal>
              ))}
            </PinMasonry>
          </Container>
        </section>
      )}

      {/* شخصی‌سازی: بازدیدهای اخیر + پیشنهاد برای شما (سبک آمازون) */}
      <section className="mt-10">
        <Container>
          <LawyerDiscovery />
        </Container>
      </section>

      {/* Consultation types */}
      <section className="mt-24">
        <Container>
          <Reveal variant="blur">
            <SectionHeading
              eyebrow="مشاوره آنلاین"
              title="به روش خودتان مشاوره بگیرید"
              desc="مشاوره متنی، صوتی یا تصویری با وکیل متخصص — در هر زمان و مکان."
            />
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {CONSULTATION_TYPES.map((c, i) => (
              <Reveal key={c.key} delay={i * 70}>
                <Card className="flex h-full flex-col">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon name={c.icon} className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-foreground">{c.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{c.desc}</p>
                  <ul className="mt-4 space-y-2 text-sm text-foreground-soft">
                    {(i === 0
                      ? ["پاسخ مکتوب و دقیق", "ذخیره سابقه گفتگو", "ارسال فایل و سند"]
                      : i === 1
                        ? ["تماس ۱۵ / ۳۰ / ۶۰ دقیقه", "یادآوری پیامکی", "ثبت صورت‌جلسه"]
                        : ["جلسه ویدئویی داخل پلتفرم", "اشتراک صفحه و فایل", "کیفیت بالا"]
                    ).map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Icon name="check" className="h-4 w-4 shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button href="/consultation" variant="soft" icon="calendar" className="mt-5 w-full">
                    رزرو مشاوره
                  </Button>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Knowledge + Q&A + Contracts */}
      <section className="mt-24">
        <Container>
          <div className="grid gap-8 lg:grid-cols-3">
            <Reveal variant="start">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">جدیدترین مقالات</h2>
                <Link href="/knowledge" className="text-sm font-medium text-primary hover:text-primary-hover">همه ←</Link>
              </div>
              <div className="mt-4 space-y-3">
                {recentArticles.map((a) => (
                  <Link key={a.slug} href={`/knowledge/${a.slug}`} className="block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/30 hover:bg-surface-2">
                    <div className="flex items-center gap-2 text-xs text-accent"><Icon name="book" className="h-3.5 w-3.5" />{a.category}</div>
                    <h3 className="mt-1.5 text-sm font-bold leading-6 text-foreground">{a.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{a.excerpt}</p>
                  </Link>
                ))}
              </div>
            </Reveal>

            <Reveal delay={80} variant="start">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">پرسش و پاسخ</h2>
                <Link href="/qa" className="text-sm font-medium text-primary hover:text-primary-hover">همه ←</Link>
              </div>
              <div className="mt-4 space-y-3">
                {popularQa.map((q) => (
                  <Link key={q.slug} href={`/qa#${q.slug}`} className="block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/30 hover:bg-surface-2">
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

            <Reveal delay={160} variant="start">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">قراردادهای پرطرفدار</h2>
                <Link href="/contracts" className="text-sm font-medium text-primary hover:text-primary-hover">همه ←</Link>
              </div>
              <div className="mt-4 space-y-3">
                {popularContracts.map((c) => (
                  <Link key={c.slug} href={`/contracts/${c.slug}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/30 hover:bg-surface-2">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
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
        </Container>
      </section>

      {/* برترین نظرات کاربران — فقط نظرات واقعی (سبک Top reviews آمازون) */}
      <ReviewsSpotlight />

      {/* Final CTA */}
      <section className="mt-24 pb-8">
        <Container>
          <Reveal variant="blur">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 text-center card-shadow sm:p-12">
              <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: "linear-gradient(110deg, color-mix(in oklab, var(--primary) 14%, transparent), color-mix(in oklab, var(--accent) 12%, transparent), color-mix(in oklab, var(--primary) 14%, transparent))" }} />
              <div className="relative">
                <h2 className="text-2xl font-bold text-foreground sm:text-3xl">آماده‌اید مشکل حقوقی‌تان را حل کنید؟</h2>
                <p className="mx-auto mt-3 max-w-xl text-muted">
                  همین حالا وکیل متخصص خود را پیدا کنید یا پرونده‌تان را ثبت نمایید. تیم دادبان کنار شماست.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button href="/lawyers" size="lg" icon="search">پیدا کردن وکیل</Button>
                  <Button href="/case/new" size="lg" variant="outline" icon="folder">ثبت پرونده</Button>
                </div>
                <TrustLine className="mt-5" />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Internal linking — صفحات مرتبط برای SEO و UX */}
      <Container>
        <RelatedLinks pathname="/" />
      </Container>

      {/* منوی شناور «همه خدمات» — همبرگری با همهٔ بخش‌های سایت */}
      <SiteMenu />
    </div>
  );
}
