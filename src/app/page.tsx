import Link from "next/link";
import { db } from "@/db";
import { lawyers, articles } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Container, SectionHeading, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { HomeHero } from "@/components/home-hero";
import { FeeBanner } from "@/components/fee/fee-banner";
import { TrustStrip } from "@/components/home/action-hub";
import { MainPaths } from "@/components/home/main-paths";
import { SituationRouter } from "@/components/home/situation-router";
import { LegalServices } from "@/components/home/legal-services";
import { CommonProblems } from "@/components/home/common-problems";
import { HowItWorks } from "@/components/home/journey";
import { CaseMarketplace } from "@/components/home/case-marketplace";
import { AISpotlight } from "@/components/home/ai-spotlight";
import { LawyerCard } from "@/components/lawyer-card";
import { PinMasonry } from "@/components/pin-masonry";
import { ReviewsSpotlight } from "@/components/amazon/reviews-spotlight";
import { SiteMenu } from "@/components/home/site-menu";
import { getT } from "@/lib/i18n/server";

/**
 * Homepage دادبان — Conversion-focused و خلوت.
 * IA: HERO ← TRUST STRIP ← 3 MAIN PATHS ← SITUATION ROUTER ← LAWYER DISCOVERY ←
 *     LEGAL SERVICES ← AI SPOTLIGHT ← COMMON LEGAL PROBLEMS ← HOW IT WORKS ←
 *     LEGAL KNOWLEDGE ← REAL SOCIAL PROOF ← FINAL CTA
 * زیرساخت SEO/AEO/GEO (متادیتا، JSON-LD، sitemap، robots، llms.txt) دست‌نخورده است.
 * فقط ادعاهای قابل اثبات؛ داده وکیل/مقاله/نظر همگی واقعی از دیتابیس.
 */

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const t = await getT();
  let featured: typeof lawyers.$inferSelect[] = [];
  let recentArticles: typeof articles.$inferSelect[] = [];
  try {
    [featured, recentArticles] = await Promise.all([
      db.select().from(lawyers).where(eq(lawyers.featured, true)).limit(4),
      db.select().from(articles).orderBy(desc(articles.publishedAt)).limit(3),
    ]);
  } catch (err) {
    console.error("[dadban] homepage query failed:", err);
  }

  return (
    <div className="page-wash">
      {/* HERO — H1 + Legal Problem Search + موضوعات محبوب + فانل */}
      <HomeHero />

      {/* TRUST STRIP — باریک، فقط ادعاهای واقعی */}
      <section className="-mt-6" aria-label={t("تضمین‌های دادبان")}>
        <Container>
          <TrustStrip />
        </Container>
      </section>

      {/* FEE BANNER — حق‌الوکاله و پرداخت قسطی (تبلیغ برجسته به درخواست مالک) */}
      <section className="mt-10" aria-label={t("حق‌الوکاله و پرداخت قسطی")}>
        <Container>
          <FeeBanner />
        </Container>
      </section>

      {/* 3 MAIN PATHS — UNDERSTAND → CONSULT → EXECUTE */}
      <section className="mt-20">
        <Container>
          <Reveal variant="blur">
            <SectionHeading
              eyebrow={t("شروع کنید")}
              title={t("می‌خواهید از کجا شروع کنید؟")}
              desc={t("دادبان مسئله‌تان را می‌فهمد، مسیر درست را پیدا می‌کند و به وکیل یا خدمت مناسب وصلتان می‌کند.")}
            />
          </Reveal>
          <div className="mt-10">
            <MainPaths />
          </div>
        </Container>
      </section>

      {/* SITUATION ROUTER — موضوع را انتخاب کن، مسیر گام‌به‌گام ببین */}
      <section className="mt-24">
        <Container>
          <Reveal variant="blur">
            <SectionHeading
              eyebrow={t("مسیریاب دادبان")}
              title={t("اگر نمی‌دانید از کجا شروع کنید، موضوعتان را انتخاب کنید")}
              desc={t("دادبان مرحله بعدی را به شما نشان می‌دهد — برای هر موضوع یک مسیر ساده.")}
            />
          </Reveal>
          <div className="mt-10">
            <SituationRouter />
          </div>
        </Container>
      </section>

      {/* LAWYER DISCOVERY — قبل از AI: کاربر بفهمد به وکیل واقعی می‌رسد */}
      {featured.length > 0 && (
        <section className="mt-24">
          <Container>
            <Reveal variant="blur">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <SectionHeading
                  align="start"
                  eyebrow={t("وکلای دادبان")}
                  title={t("اگر به وکیل نیاز دارید، از همین‌جا شروع کنید")}
                  desc={t("وکلای واقعی دادبان با تخصص و شهر مشخص — پروفایل هر وکیل را ببینید.")}
                />
                <Button href="/lawyers" variant="outline" icon="search" className="shrink-0">
                  {t("جستجوی همه وکلا")}
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

      {/* LEGAL SERVICES — پلتفرم خدمات حقوقی، نه فقط وکیل‌یابی */}
      <section className="mt-24">
        <Container>
          <Reveal variant="blur">
            <SectionHeading
              eyebrow={t("پلتفرم خدمات حقوقی")}
              title={t("خدمات حقوقی دادبان")}
              desc={t("دادبان فقط برای پیدا کردن وکیل نیست — خدمت حقوقی موردنیازتان را همین‌جا دریافت کنید.")}
            />
          </Reveal>
          <div className="mt-10">
            <LegalServices />
          </div>
        </Container>
      </section>

      {/* CASE MARKETPLACE — پرونده را به رقابت بگذارید؛ وکلا قیمت بدهند */}
      <section className="mt-24" aria-label="بازار پرونده‌ها">
        <Container>
          <CaseMarketplace />
        </Container>
      </section>

      {/* AI SPOTLIGHT — پیش از وکیل، مسئله‌تان را بهتر بفهمید */}
      <section className="mt-24">
        <Container>
          <AISpotlight />
        </Container>
      </section>

      {/* COMMON LEGAL PROBLEMS — زبان خود کاربر، لینک به مسیر واقعی */}
      <section className="mt-24">
        <Container>
          <Reveal variant="blur">
            <SectionHeading
              eyebrow={t("راهنمای مسیر")}
              title={t("مسائل حقوقی رایج")}
              desc={t("اگر یکی از این شرایط را دارید، مسیرتان از همین‌جا شروع می‌شود.")}
            />
          </Reveal>
          <div className="mt-8">
            <CommonProblems />
          </div>
        </Container>
      </section>

      {/* HOW IT WORKS — سه گام بسیار ساده */}
      <section className="mt-24">
        <Container>
          <Reveal variant="blur">
            <SectionHeading
              eyebrow={t("چطور کار می‌کند")}
              title={t("مسیر حقوقی در دادبان ساده است")}
            />
          </Reveal>
          <div className="mt-12">
            <HowItWorks />
          </div>
        </Container>
      </section>

      {/* LEGAL KNOWLEDGE — چند محتوای واقعی و باکیفیت، نه آرشیو */}
      {recentArticles.length > 0 && (
        <section className="mt-24">
          <Container>
            <Reveal variant="blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black text-foreground">{t("از مجلهٔ حقوقی دادبان")}</h2>
                <Link href="/knowledge" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-primary-hover">
                  {t("مشاهده همه مطالب")}
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {recentArticles.map((a, i) => (
                <Reveal key={a.slug} delay={i * 70} variant="start">
                  <Link
                    href={`/knowledge/${a.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]"
                  >
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
                      <Icon name="book" className="h-3 w-3" />
                      {a.category}
                    </span>
                    <h3 className="mt-3 text-sm font-black leading-7 text-foreground transition-colors group-hover:text-primary">
                      {a.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-6 text-muted">{a.excerpt}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary transition-all duration-300 group-hover:gap-2.5">
                      {t("ادامه مطلب")}
                      <Icon name="arrow" className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* REAL SOCIAL PROOF — فقط نظرات واقعی دیتابیس */}
      <ReviewsSpotlight />

      {/* FINAL CTA — تک‌هدفه */}
      <section className="mt-24 pb-8">
        <Container>
          <Reveal variant="blur">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 text-center card-shadow sm:p-12">
              <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: "linear-gradient(110deg, color-mix(in oklab, var(--primary) 12%, transparent), color-mix(in oklab, var(--accent) 10%, transparent), color-mix(in oklab, var(--primary) 12%, transparent))" }} />
              <div className="relative">
                <h2 className="text-2xl font-black text-foreground sm:text-3xl">{t("نمی‌دانید از کجا شروع کنید؟")}</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-muted sm:text-base">
                  {t("مسئله حقوقی‌تان را برای دادبان بنویسید تا مسیر مناسب را پیدا کنید.")}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button href="/ai-assistant" size="lg" icon="arrow" className="shadow-[var(--shadow-lift)]">
                    {t("بررسی مشکل من")}
                  </Button>
                  <Button href="/lawyers" size="lg" variant="outline" icon="search">
                    {t("جستجوی وکیل")}
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* منوی شناور «همه خدمات» — همبرگری با همهٔ بخش‌های سایت */}
      <SiteMenu />
    </div>
  );
}
