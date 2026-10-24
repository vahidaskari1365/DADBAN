import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { Container, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { FaqSection } from "@/components/seo/faq-section";
import { SeoLinkGrid } from "@/components/seo/link-grid";
import { safeJsonLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";
import { getJudgments } from "@/lib/content-store";
import {
  JUDGMENTS_HUB_INTRO_LEAD,
  JUDGMENTS_HUB_FAQS,
  JUDGMENTS_UPDATED,
} from "@/lib/judgments-content";

export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: "آرای قضایی و رویه دیوان عالی کشور | تحلیل وحدت رویه به زبان ساده — دادورزان",
    description: `تحلیل آرای قضایی و رأی وحدت رویه دیوان عالی کشور و دیوان عدالت اداری در چک، مهریه، سرقفلی، خیانت در امانت، مالیات، کار و داوری — پاسخ کوتاه، نکات کلیدی، مواد قانونی و پرسش‌های متداول (به‌روزرسانی ${JUDGMENTS_UPDATED}).`,
    alternates: { canonical: "/judgments" },
    openGraph: {
      title: { absolute: "آرای قضایی و رویه دیوان عالی کشور | دادورزان" },
      description:
        "رویه قضایی ایران به زبان ساده: تحلیل وحدت رویه‌های مهم با پاسخ کوتاه، نکات کلیدی و پرسش‌های متداول.",
      url: `${SITE_URL}/judgments`,
    },
  };
}

export default async function JudgmentsPage() {
  const t = await getT();
  const locale = await getServerLocale();

  // منبع: دیتابیس (ویرایش ادمین) با fallback تحریریه — متن کامل رأی verbatim می‌ماند
  const judgments = await Promise.all(
    (await getJudgments()).map(async (j) => {
      if (locale === "fa") return j;
      const [title, summary, court, subject] = await Promise.all([
        tdyn(locale, j.title, 400),
        tdyn(locale, j.summary, 700),
        tdyn(locale, j.court, 200),
        tdyn(locale, j.subject, 200),
      ]);
      return { ...j, title, summary, court, subject };
    }),
  );

  // موضوعات — برای چیپ‌های دسته‌بندی (محاسبه از داده واقعی)
  const subjectCounts = new Map<string, number>();
  for (const j of judgments) subjectCounts.set(j.subject, (subjectCounts.get(j.subject) ?? 0) + 1);
  const subjects = [...subjectCounts.entries()].sort((a, b) => b[1] - a[1]);

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/judgments#collection`,
        name: "آرای قضایی و رویه دیوان عالی کشور",
        description: JUDGMENTS_HUB_INTRO_LEAD,
        url: `${SITE_URL}/judgments`,
        inLanguage: "fa-IR",
        isPartOf: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "ItemList",
        "@id": `${SITE_URL}/judgments#list`,
        name: "آرای و رویه‌های قضایی منتشرشده",
        numberOfItems: judgments.length,
        itemListElement: judgments.map((j, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: j.title,
          url: `${SITE_URL}/judgments/${j.slug}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "دادورزان", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "آرای قضایی", item: `${SITE_URL}/judgments` },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />

      <PageHero
        variant="market"
        image="/images/hero-judgments.png"
        badge={t("آرای قضایی")}
        title={t("رویه قضایی و آرای قابل انتشار")}
        desc={t("آرای دیوان عالی کشور و سایر مراجع در موضوعات مختلف، برای آشنایی با رویه‌ی قضایی.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("آرای قضایی") }]}
      />

      <Container className="py-10">
        {/* معرفی هاب (SEO/GEO — متن تحریریه) */}
        <section aria-label="درباره آرای قضایی دادورزان" className="mx-auto max-w-3xl">
          <p className="text-sm leading-8 text-foreground-soft">{JUDGMENTS_HUB_INTRO_LEAD}</p>
        </section>

        {/* چیپ موضوعات — دسته‌بندی واقعی داده */}
        <section aria-label="موضوعات آرای قضایی" className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            {subjects.map(([subject, count]) => (
              <span
                key={subject}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground-soft"
              >
                <Icon name="gavel" className="h-3.5 w-3.5 text-primary" />
                {subject}
                <span className="text-[10px] text-muted">{count}</span>
              </span>
            ))}
          </div>
        </section>

        {/* گرید آرای — طراحی موجود حفظ شده */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {judgments.map((j, i) => (
            <Reveal key={j.slug} delay={(i % 6) * 40}>
              <Link href={`/judgments/${j.slug}`} className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name="gavel" className="h-5 w-5" /></span>
                  <Badge tone="accent">{j.subject}</Badge>
                </div>
                <h2 className="mt-3 text-sm font-bold leading-6 text-foreground">{j.title}</h2>
                <p className="mt-1 flex-1 text-xs leading-6 text-muted">{j.summary}</p>
                <p className="mt-3 text-[11px] text-muted">{j.court} • {j.date}</p>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* پرسش‌های متداول هاب — FAQPage schema داخل FaqSection تزریق می‌شود */}
        <div className="mt-12">
          <FaqSection items={JUDGMENTS_HUB_FAQS} title="پرسش‌های متداول درباره آرای قضایی" canonicalPath="/judgments" />
        </div>

        {/* لینک‌سازی داخلی بین‌بخشی (SEO/GEO) */}
        <div className="mt-12">
          <SeoLinkGrid
            title="مسیرهای مرتبط در دادورزان"
            links={[
              { label: "مرکز قوانین ایران", href: "/laws" },
              { label: "مقالات و راهنماهای حقوقی", href: "/knowledge" },
              { label: "پرسش و پاسخ حقوقی", href: "/qa" },
              { label: "واژه‌نامه حقوقی", href: "/glossary" },
              { label: "پیدا کردن وکیل متخصص", href: "/lawyers" },
              { label: "محاسبه‌گرهای حقوقی", href: "/calculators" },
            ]}
          />
        </div>
      </Container>
    </>
  );
}
