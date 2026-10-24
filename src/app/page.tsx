import Link from "next/link";
import { db } from "@/db";
import { lawyers, articles } from "@/db/schema";
import { desc, eq, and, ne } from "drizzle-orm";
import { Container, SectionHeading, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { HomeHero } from "@/components/home-hero";
import { Marquee } from "@/components/magicui/marquee";
import { ShineBorder } from "@/components/magicui/shine-border";
import { AuroraText } from "@/components/magicui/aurora-text";
import { LEGAL_TOPICS, topicHref } from "@/lib/data";
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
import { ReviewsSpotlight } from "@/components/amazon/reviews-spotlight";
import { SiteMenu } from "@/components/home/site-menu";
import { SeoLinkGrid } from "@/components/seo/link-grid";
import { SPECIALTY_LANDINGS, CITY_LANDINGS } from "@/lib/seo-landings";
import { FaqSection } from "@/components/seo/faq-section";
import { safeJsonLd } from "@/lib/jsonld";
import { HOME_FAQS, CONTENT_REVIEWED_AT } from "@/lib/ai-discovery";
import { formatJalali } from "@/lib/jalali";
import { SITE_URL } from "@/lib/site";
import { SITE_NAME } from "@/lib/brand";
import { getT } from "@/lib/i18n/server";
import { PageContentBlocks } from "@/components/page-content-blocks";

/**
 * Homepage دادورزان — Conversion-focused و خلوت.
 * IA: HERO ← TRUST STRIP ← 3 MAIN PATHS (+بازار پرونده‌ها زیر کارت‌های شروع) ←
 *     SITUATION ROUTER ← LAWYER DISCOVERY ← LEGAL SERVICES ← AI SPOTLIGHT ←
 *     COMMON LEGAL PROBLEMS ← HOW IT WORKS ← LEGAL KNOWLEDGE ← SOCIAL PROOF ← CTA
 * زیرساخت SEO/AEO/GEO (متادیتا، JSON-LD، sitemap، robots، llms.txt) دست‌نخورده است.
 * فقط ادعاهای قابل اثبات؛ داده وکیل/مقاله/نظر همگی واقعی از دیتابیس.
 */

export const dynamic = "force-dynamic";

// canonical صریح صفحه اصلی — پس از حذف canonical پیش‌فرض layout ریشه
// (صفحاتی که خودشان canonical ندارند نباید به «/» ورثت ببرند)
export const metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const t = await getT();
  let featured: typeof lawyers.$inferSelect[] = [];
  let recentArticles: typeof articles.$inferSelect[] = [];
  try {
    [featured, recentArticles] = await Promise.all([
      // تفکیک: بخش «وکلای دادورزان» صفحهٔ اصلی فقط وکیل — کارشناس حقوقی فقط در /experts
      db.select().from(lawyers).where(and(eq(lawyers.featured, true), ne(lawyers.lawyerType, "expert"))).limit(4),
      db.select().from(articles).orderBy(desc(articles.publishedAt)).limit(3),
    ]);
  } catch (err) {
    console.error("[dadban] homepage query failed:", err);
  }

  /* ── Freshness + AEO — تاریخ واقعی آخرین به‌روزرسانی محتوا (آخرین مقاله)
     در WebPage schema تا موتورهای AI/جستجو تازگی را مستقیم بخوانند.
     + ItemList مقالات اخیر (BlogPosting با dateModified) برای کشف مقالات. */
  const lastContentUpdate =
    recentArticles[0]?.publishedAt
      ? new Date(recentArticles[0].publishedAt).toISOString()
      : CONTENT_REVIEWED_AT;
  const homeSchemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: `${SITE_NAME} | پلتفرم هوشمند خدمات حقوقی`,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "fa-IR",
      dateModified: lastContentUpdate,
    },
    ...(recentArticles.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "@id": `${SITE_URL}/#latest-articles`,
            name: "آخرین مقالات مجلهٔ حقوقی دادورزان",
            itemListElement: recentArticles.map((a, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE_URL}/knowledge/${a.slug}`,
              item: {
                "@type": "BlogPosting",
                headline: a.title,
                url: `${SITE_URL}/knowledge/${a.slug}`,
                datePublished: a.publishedAt ? new Date(a.publishedAt).toISOString() : undefined,
                dateModified: a.publishedAt ? new Date(a.publishedAt).toISOString() : undefined,
                inLanguage: "fa-IR",
              },
            })),
          },
        ]
      : []),
  ];

  return (
    <div className="page-wash">
      {/* WebPage + ItemList JSON-LD — freshness صادقانه برای AI Search */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(homeSchemas) }}
      />
      {/* HERO — H1 + Legal Problem Search + موضوعات محبوب + فانل */}
      <HomeHero />

      <PageContentBlocks page="home" position="top" />

      {/* TRUST STRIP — باریک، فقط ادعاهای واقعی */}
      <section className="-mt-6" aria-label={t("تضمین‌های دادورزان")}>
        <Container>
          <TrustStrip />
        </Container>
      </section>

      {/* Magic UI — نوار بی‌نهایت موضوعات حقوقی — هر موضوع لینک به صفحهٔ همان موضوع */}
      <section className="mt-8" aria-label={t("موضوعات حقوقی پرجستجو")}>
        <Container>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface/60 py-1.5 [mask-image:linear-gradient(to_left,transparent,black_10%,black_90%,transparent)]">
            <Marquee pauseOnHover repeat={2} className="[--duration:36s]">
              {LEGAL_TOPICS.map((tp) => (
                <span key={tp.label} className="inline-flex items-center">
                  <Link
                    href={topicHref(tp.label)}
                    title={t(tp.hint)}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-foreground-soft transition-colors hover:text-primary"
                  >
                    <Icon name={tp.icon} className="h-3.5 w-3.5 text-accent-text" />
                    {t(tp.label)}
                  </Link>
                  <span className="text-accent/50">✦</span>
                </span>
              ))}
            </Marquee>
          </div>
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
              desc={t("دادورزان مسئله‌تان را می‌فهمد، مسیر درست را پیدا می‌کند و به وکیل یا خدمت مناسب وصلتان می‌کند.")}
            />
          </Reveal>
          <div className="mt-10">
            <MainPaths />
          </div>

          {/* CASE MARKETPLACE — زیر کارت‌های شروع: پرونده را به رقابت بگذارید */}
          <div className="mt-16">
            <CaseMarketplace />
          </div>
        </Container>
      </section>

      {/* SITUATION ROUTER — موضوع را انتخاب کن، مسیر گام‌به‌گام ببین */}
      <section className="mt-24">
        <Container>
          <Reveal variant="blur">
            <SectionHeading
              eyebrow={t("مسیریاب دادورزان")}
              title={t("اگر نمی‌دانید از کجا شروع کنید، موضوعتان را انتخاب کنید")}
              desc={t("دادورزان مرحله بعدی را به شما نشان می‌دهد — برای هر موضوع یک مسیر ساده.")}
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
                  eyebrow={t("وکلای دادورزان")}
                  title={t("اگر به وکیل نیاز دارید، از همین‌جا شروع کنید")}
                  desc={t("وکلای واقعی دادورزان با تخصص و شهر مشخص — پروفایل هر وکیل را ببینید.")}
                />
                <Button href="/lawyers" variant="outline" icon="search" className="shrink-0">
                  {t("جستجوی همه وکلا")}
                </Button>
              </div>
            </Reveal>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featured.map((l, i) => (
                <Reveal key={l.id} delay={i * 60}>
                  <LawyerCard lawyer={l} priority={i === 0} />
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* LEGAL SERVICES — پلتفرم خدمات حقوقی، نه فقط وکیل‌یابی */}
      <section className="mt-24">
        <Container>
          <Reveal variant="blur">
            <SectionHeading
              eyebrow={t("پلتفرم خدمات حقوقی")}
              title={t("خدمات حقوقی دادورزان")}
              desc={t("دادورزان فقط برای پیدا کردن وکیل نیست — خدمت حقوقی موردنیازتان را همین‌جا دریافت کنید.")}
            />
          </Reveal>
          <div className="mt-10">
            <LegalServices />
          </div>
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
              title={t("مسیر حقوقی در دادورزان ساده است")}
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
                <h2 className="text-xl font-black text-foreground">{t("از مجلهٔ حقوقی دادورزان")}</h2>
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
                    {/* تاریخ انتشار واقعی — سیگنال freshness مرئی برای کاربر و موتورها */}
                    {a.publishedAt && (
                      <time
                        dateTime={new Date(a.publishedAt).toISOString().slice(0, 10)}
                        className="mt-2 text-[11px] font-bold text-accent-text"
                      >
                        {formatJalali(new Date(a.publishedAt))}
                      </time>
                    )}
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

      {/* SEO INTERNAL LINKS — دسترسی سریع تخصص‌ها و شهرها (توزیع PageRank به صفحات فرود) */}
      <section className="mt-24" aria-label="دسترسی سریع تخصص‌ها و شهرها">
        <Container className="space-y-4">
          <SeoLinkGrid
            title="تخصص‌های پرجستجوی وکالت"
            links={SPECIALTY_LANDINGS.map((s) => ({
              label: s.h1,
              href: `/lawyers/specialty/${s.slug}`,
            }))}
          />
          <SeoLinkGrid
            title="وکیل در شهرهای ایران"
            links={CITY_LANDINGS.map((c) => ({
              label: c.city, // لنگر کوتاه — عنوان گرید زمینه را می‌سازد (ضد تراکم)
              href: `/lawyers/city/${c.slug}`,
            }))}
          />
        </Container>
      </section>

      {/* پرسش‌های متداول — AEO: پاسخ خودکفا + FAQPage schema (منبع واحد با /ai/faq.json) */}
      <section className="mt-24">
        <Container>
          <Reveal variant="blur">
            <SectionHeading
              eyebrow={t("پاسخ‌های سریع")}
              title={t("پرسش‌های متداول دربارهٔ دادورزان")}
              desc={t("پاسخ کوتاه و قطعی رایج‌ترین پرسش‌های کاربران پلتفرم.")}
            />
          </Reveal>
          <div className="mt-8">
            <FaqSection
              items={HOME_FAQS.map((f) => ({ q: f.question, a: f.answer }))}
              title={t("پرسش‌های متداول")}
              canonicalPath="/"
            />
          </div>
        </Container>
      </section>

      {/* FINAL CTA — تک‌هدفه */}
      <section className="mt-24 pb-8">
        <Container>
          <Reveal variant="blur">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 text-center card-shadow sm:p-12">
              {/* Magic UI — قاب درخشان طلایی (فقط با حرکت مجاز) */}
              <ShineBorder borderWidth={1.5} duration={12} shineColor={["var(--accent)", "color-mix(in oklab, var(--accent) 45%, transparent)"]} />
              <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: "linear-gradient(110deg, color-mix(in oklab, var(--primary) 12%, transparent), color-mix(in oklab, var(--accent) 10%, transparent), color-mix(in oklab, var(--primary) 12%, transparent))" }} />
              <div className="relative">
                <h2 className="text-2xl font-black text-foreground sm:text-3xl">
                  {t("نمی‌دانید از کجا ")}
                  <AuroraText colors={["var(--accent)", "var(--accent-text)", "color-mix(in oklab, var(--accent) 55%, white)"]} speed={1.2}>
                    {t("شروع")}
                  </AuroraText>
                  {t(" کنید؟")}
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-muted sm:text-base">
                  {t("مسئله حقوقی‌تان را برای دادورزان بنویسید تا مسیر مناسب را پیدا کنید.")}
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

      <PageContentBlocks page="home" position="bottom" />

      {/* منوی شناور «همه خدمات» — همبرگری با همهٔ بخش‌های سایت */}
      <SiteMenu />
    </div>
  );
}
