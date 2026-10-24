import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { FaqSection } from "@/components/seo/faq-section";
import { SeoLinkGrid } from "@/components/seo/link-grid";
import { safeJsonLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";
import { getJudgmentEntry, getJudgments } from "@/lib/content-store";
import { getJudgmentContent } from "@/lib/judgments-content";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getT();
  const judgment = await getJudgmentEntry(slug);
  if (!judgment) return { title: t("رأی یافت نشد") };
  const locale = await getServerLocale();
  const content = getJudgmentContent(slug);
  // توضیح متا: اول quickAnswer (AEO) — وگرنه خلاصهٔ DB
  const faDesc = content?.quickAnswer ?? judgment.summary;
  const [title, summary] = await Promise.all([
    tdyn(locale, judgment.title, 400),
    tdyn(locale, faDesc, 320),
  ]);
  const keywords = content?.keywords;
  return {
    title: `${title} | تحلیل رأی به زبان ساده`,
    description: summary,
    alternates: { canonical: `/judgments/${slug}` },
    ...(keywords ? { keywords } : {}),
    openGraph: {
      title: { absolute: `${title} | دادورزان` },
      description: summary,
      url: `${SITE_URL}/judgments/${slug}`,
    },
  };
}

export default async function JudgmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getT();
  const locale = await getServerLocale();
  const judgment = await getJudgmentEntry(slug);
  if (!judgment) notFound();

  // ترجمهٔ عنوان/خلاصهٔ رأی — متن کامل رأی verbatim می‌ماند
  let j = judgment;
  if (locale !== "fa") {
    const [title, summary, court, subject] = await Promise.all([
      tdyn(locale, judgment.title, 400),
      tdyn(locale, judgment.summary, 700),
      tdyn(locale, judgment.court, 200),
      tdyn(locale, judgment.subject, 200),
    ]);
    j = { ...judgment, title, summary, court, subject };
  }

  // لایه تحریریه AEO — فقط فارسی (برای سایر زبان‌ها متن ترجمه‌نشده گراس‌فول می‌شود)
  const content = locale === "fa" ? getJudgmentContent(slug) : null;

  // آرای مرتبط — اولویت با هم‌موضوع‌ها؛ فقط عنوان و مرجع برای نمایش ترجمه می‌شود
  const relatedOriginal = (await getJudgments())
    .filter((x) => x.slug !== slug)
    .sort((a, b) => (a.subject === j.subject ? -1 : 0) - (b.subject === j.subject ? -1 : 0))
    .slice(0, 3);
  const related = await Promise.all(
    relatedOriginal.map(async (r) => {
      if (locale === "fa") return r;
      const [title, court] = await Promise.all([tdyn(locale, r.title, 400), tdyn(locale, r.court, 200)]);
      return { ...r, title, court };
    }),
  );

  const canonical = `/judgments/${j.slug}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${SITE_URL}${canonical}#article`,
        headline: `${j.title} — تحلیل رأی به زبان ساده`,
        description: content?.quickAnswer ?? j.summary,
        url: `${SITE_URL}${canonical}`,
        inLanguage: "fa-IR",
        dateModified: new Date().toISOString().slice(0, 10),
        isPartOf: { "@id": `${SITE_URL}/#organization` },
        about: {
          "@type": "Thing",
          name: `${j.subject} — رویه قضایی ایران`,
        },
        author: { "@type": "Organization", name: "تیم تحریریه دادورزان" },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "دادورزان", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "آرای قضایی", item: `${SITE_URL}/judgments` },
          { "@type": "ListItem", position: 3, name: j.title, item: `${SITE_URL}${canonical}` },
        ],
      },
      /* FAQPage schema فقط یک‌بار و توسط <FaqSection /> تزریق می‌شود */
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />

      <PageHero
        variant="market"
        image="/images/hero-judgments.png"
        badge={j.subject}
        title={j.title}
        desc={j.summary}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("آرای قضایی"), href: "/judgments" }, { label: j.subject }]}
        chips={content ? [{ icon: "gavel", label: j.court }, { icon: "clock", label: `بازبینی: ${content.updated}` }] : undefined}
      />

      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_300px]">
        <article className="space-y-4">
          {/* بلوک citation-ready — پاسخ مستقیم قابل نقل (AEO/GEO) */}
          {content && (
            <section
              aria-label="پاسخ کوتاه"
              className="rounded-3xl border border-primary/20 bg-primary-soft p-6 sm:p-8"
            >
              <div className="flex items-start gap-4">
                <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Icon name="quote" className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-black text-foreground sm:text-base">{t("این رأی در یک نگاه")}</h2>
                  <p className="mt-2 text-sm leading-8 text-foreground-soft">{content.quickAnswer}</p>
                </div>
              </div>
            </section>
          )}

          {/* «این رأی درباره چیست؟» + تحلیل رویه (AIO/GEO) */}
          <Card hover={false}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground sm:text-xl">
              <Icon name="scale" className="h-5 w-5 text-primary" />
              {t("این رأی درباره چیست؟")}
            </h2>
            <p className="mt-3 text-sm leading-8 text-foreground-soft">{content?.what ?? j.summary}</p>
            {content?.intro.map((p, i) => (
              <p key={i} className="mt-3 text-sm leading-8 text-foreground-soft">{p}</p>
            ))}
            {!content && (
              <p className="mt-3 text-xs leading-6 text-muted">
                {t("این خلاصه صرفاً برای آشنایی با رویه‌ی قضایی است و مشاوره‌ی حقوقی محسوب نمی‌شود. متن کامل رأی در منابع رسمی قابل دسترسی است.")}
              </p>
            )}
          </Card>

          {/* نکات کلیدی عدددار */}
          {content && content.keyPoints.length > 0 && (
            <Card hover={false} className="bg-surface-2">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground sm:text-xl">
                <Icon name="star" className="h-5 w-5 text-primary" />
                {t("نکات کلیدی رأی")}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {content.keyPoints.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm leading-7 text-foreground-soft">
                    <span className="mt-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-black text-primary">
                      {i + 1}
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* جدول مواد قانونی مرتبط (GEO — ساختار جدولی) */}
          {content && content.legalBasis.length > 0 && (
            <Card hover={false}>
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground sm:text-xl">
                <Icon name="book" className="h-5 w-5 text-primary" />
                {t("مستندات قانونی مرتبط")}
              </h2>
              <p className="mt-2 text-xs leading-6 text-muted">
                {t("مواد و آرای قابل استناد در پرونده‌های مشابه؛ متن کامل مواد در منابع رسمی در دسترس است.")}
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-right text-xs text-muted">
                      <th scope="col" className="py-2 pl-2 font-bold">{t("مستند")}</th>
                      <th scope="col" className="py-2 pr-2 font-bold">{t("حکم در یک جمله")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.legalBasis.map((a, i) => (
                      <tr key={i} className="border-b border-border/60 align-top">
                        <td className="py-3 pl-2 font-bold text-primary">{a.ref}</td>
                        <td className="py-3 pr-2 leading-7 text-foreground-soft">{a.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* FAQ + FAQPage schema (AEO) */}
          {content && content.faqs.length > 0 && (
            <FaqSection items={content.faqs} title="پرسش‌های متداول درباره این رویه" canonicalPath={canonical} />
          )}
        </article>

        {/* سایدبار SXO — مسیرهای خدماتی */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card hover={false} className="bg-gradient-to-br from-primary to-primary-hover text-primary-foreground">
            <h3 className="text-sm font-bold">{t("کاربرد این رأی در پرونده شما")}</h3>
            <p className="mt-1 text-xs text-white/80">
              {t("برای تطبیق رویه قضایی با جزئیات پرونده‌ی خود، با وکیل متخصص مشورت کنید.")}
            </p>
            <Button href="/lawyers" variant="accent" className="mt-3 w-full" size="sm">
              {t("پیدا کردن وکیل")}
            </Button>
            <Button href="/case/new" variant="ghost" className="mt-2 w-full border border-white/30 text-white hover:bg-white/10" size="sm">
              {t("ثبت پرونده")}
            </Button>
          </Card>

          <Card hover={false}>
            <h3 className="text-sm font-bold text-foreground">{t("آرای مرتبط")}</h3>
            <div className="mt-3 space-y-2">
              {related.map((r) => (
                <a key={r.slug} href={`/judgments/${r.slug}`} className="block rounded-lg p-2 transition-colors hover:bg-surface-2">
                  <p className="text-xs font-semibold text-foreground">{r.title}</p>
                  <p className="text-[11px] text-muted">{r.court}</p>
                </a>
              ))}
            </div>
          </Card>

          {/* لینک‌های داخلی موضوعی (SXO — مقاله/خدمت مرتبط) */}
          {content && (
            <Card hover={false}>
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Icon name="link" className="h-4 w-4 text-primary" /> {t("راهنماهای مرتبط")}
              </h3>
              <div className="mt-3 space-y-2">
                {content.related.map((r) => (
                  <a
                    key={r.href}
                    href={r.href}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft"
                  >
                    <span className="flex items-center gap-2">{r.label}</span>
                    <Icon name="arrow" className="h-3.5 w-3.5 text-muted" />
                  </a>
                ))}
              </div>
            </Card>
          )}
        </aside>
      </Container>

      {/* لینک‌سازی داخلی بین‌بخشی (SEO/GEO) */}
      <Container>
        <SeoLinkGrid
          title="ادامه مسیر حقوقی شما"
          links={[
            { label: "مرکز قوانین ایران", href: "/laws" },
            { label: "مقالات و راهنماهای حقوقی", href: "/knowledge" },
            { label: "پرسش و پاسخ حقوقی", href: "/qa" },
            { label: "پیدا کردن وکیل متخصص", href: "/lawyers" },
            { label: "ثبت پرونده حقوقی", href: "/case/new" },
            { label: "آرای قضایی — همه آرای", href: "/judgments" },
          ]}
        />
      </Container>
    </>
  );
}
