import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { desc, eq, ne } from "drizzle-orm";
import { Container, Button, Card } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { ArticleBody } from "@/components/article-body";
import { ShareButtons } from "@/components/share-buttons";
import { faNum } from "@/lib/data";
import { formatJalaliLong } from "@/lib/jalali";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n/core";
import { tdyn, tdynArticle } from "@/lib/i18n/dynamic";
import Link from "next/link";
import { SEO_BASE } from "@/lib/seo";
import { safeJsonLd } from "@/lib/jsonld";

export const dynamic = "force-dynamic";

interface FaqItem { q: string; a: string }

/** برچسب زبان برای JSON-LD */
const LANG_TAG: Record<string, string> = {
  fa: "fa-IR",
  en: "en",
  ar: "ar",
  tr: "tr",
  zh: "zh",
};

async function getArticle(slug: string) {
  try {
    const rows = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
    return rows[0];
  } catch (err) {
    console.error("[dadban] article query failed:", err);
    return undefined;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) {
    const st = makeT(await getServerLocale());
    return { title: st("مقاله یافت نشد") };
  }
  // متادیتا با دادهٔ ترجمه‌شده (سرور) — در fa همان متن اصلی
  const locale = await getServerLocale();
  const [title, excerpt] = await Promise.all([
    tdyn(locale, a.title, 400),
    tdyn(locale, a.excerpt, 800),
  ]);
  return {
    title,
    description: excerpt,
    alternates: { canonical: `/knowledge/${slug}` },
    authors: [{ name: a.author }],
    keywords: [a.category, ...a.title.split(" ").filter((w) => w.length > 3)].slice(0, 8),
    openGraph: {
      type: "article",
      title,
      description: excerpt,
      url: `/knowledge/${slug}`,
      images: a.imageUrl ? [{ url: a.imageUrl, alt: a.imageAlt || title }] : undefined,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const original = await getArticle(slug);
  if (!original) notFound();

  const t = await getT();
  const locale = await getServerLocale();

  // مقالات مرتبط: ابتدا هم‌دسته، سپس تازه‌ترین مقالات دیگر (شبکه داخلی قوی‌تر)
  // — کوئری با دستهٔ اصلی انجام می‌شود؛ ترجمه فقط برای نمایش است
  let relatedOriginal: typeof articles.$inferSelect[] = [];
  try {
    relatedOriginal = await db
      .select()
      .from(articles)
      .where(eq(articles.category, original.category))
      .orderBy(desc(articles.publishedAt))
      .then((r) => r.filter((x) => x.slug !== original.slug).slice(0, 3));
    if (relatedOriginal.length < 3) {
      const more = await db
        .select()
        .from(articles)
        .where(ne(articles.slug, original.slug))
        .orderBy(desc(articles.views))
        .then((r) => r.filter((x) => !relatedOriginal.some((y) => y.slug === x.slug)).slice(0, 3 - relatedOriginal.length));
      relatedOriginal = [...relatedOriginal, ...more];
    }
  } catch (err) {
    console.error("[dadban] related articles query failed:", err);
  }

  // کل مقاله (عنوان/دسته/چکیده/پاسخ سریع/محتوای کامل/faq/تصویر/نویسنده) یکجا ترجمه می‌شود
  // — فیلدهای nullable با "" نرمال می‌شوند تا با امضای tdynArticle سازگار باشند
  const a = await tdynArticle(locale, {
    ...original,
    quickAnswer: original.quickAnswer ?? "",
    faq: original.faq ?? "",
  });

  // مقالات مرتبط — فقط فیلدهای نمایشی (title + category)
  const related = await Promise.all(
    relatedOriginal.map(async (r) => {
      if (locale === "fa") return r;
      const [title, category] = await Promise.all([
        tdyn(locale, r.title, 400),
        tdyn(locale, r.category, 200),
      ]);
      return { ...r, title, category };
    }),
  );

  let faq: FaqItem[] = [];
  try {
    const parsed = JSON.parse(a.faq || "[]");
    if (Array.isArray(parsed)) faq = parsed.filter((f) => f?.q && f?.a);
  } catch {
    /* faq نامعتبر */
  }

  const wordCount = a.content.split(/\s+/).filter(Boolean).length;
  const articleUrl = `${SEO_BASE}/knowledge/${a.slug}`;

  // تاریخ‌های واقعی انتشار/بازبینی — مبنای بلوک اعتماد E-E-A-T و dateModified
  const faDate = (d: Date) => formatJalaliLong(d);
  const publishedLabel = original.publishedAt ? faDate(original.publishedAt) : null;
  const reviewedLabel = original.updatedAt ? faDate(original.updatedAt) : publishedLabel;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${articleUrl}#article`,
      headline: a.title,
      description: a.excerpt,
      articleSection: a.category,
      inLanguage: LANG_TAG[locale] ?? "fa-IR",
      wordCount,
      author: {
        "@type": "Person",
        "@id": `${SEO_BASE}/#editorial-team`,
        name: a.author,
        jobTitle: a.authorRole,
        worksFor: { "@id": `${SEO_BASE}/#organization` },
      },
      publisher: { "@type": "Organization", "@id": `${SEO_BASE}/#organization`, name: "دادورزان", url: SEO_BASE },
      isPartOf: { "@id": `${SEO_BASE}/#organization` },
      datePublished: original.publishedAt,
      // تاریخ واقعی آخرین ویرایش تحریریه؛ اگر هنوز بازبینی نشده همان انتشار
      dateModified: original.updatedAt ?? original.publishedAt,
      mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
      image: a.imageUrl ? `${SEO_BASE}${a.imageUrl}` : undefined,
      // AEO — بلوک‌های پاسخ مستقیم برای اسپیکرها و موتورهای پاسخ‌محور
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: ["h1", ".aeo-quick-answer"],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t("خانه"), item: SEO_BASE },
        { "@type": "ListItem", position: 2, name: t("بانک دانش حقوقی"), item: `${SEO_BASE}/knowledge` },
        { "@type": "ListItem", position: 3, name: a.title, item: articleUrl },
      ],
    },
    ...(faq.length
      ? [{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }]
      : []),
  ];

  return (
    <>
      <article>
        <PageHero
          variant="market"
          image="/images/hero-knowledge.png"
          badge={a.category}
          title={a.title}
          breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("دانش حقوقی"), href: "/knowledge" }, { label: a.category }]}
        >
          <div className="flex flex-wrap items-center gap-4 text-xs text-white/70">
            <span className="inline-flex items-center gap-1.5"><Icon name="user" className="h-4 w-4 text-[#eec97b]" /> {a.author} — {a.authorRole}</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="clock" className="h-4 w-4 text-[#eec97b]" /> {faNum(a.readTime)} {t("دقیقه مطالعه")}</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="star" className="h-4 w-4 text-[#eec97b]" /> {faNum(a.views.toLocaleString("en-US"))} {t("بازدید")}</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="document" className="h-4 w-4 text-[#eec97b]" /> {faNum(wordCount.toLocaleString("en-US"))} {t("واژه")}</span>
          </div>
        </PageHero>

        <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_300px]">
          <div className="max-w-2xl">
            {/* بلوک اعتماد E-E-A-T — نویسنده، تاریخ انتشار و بازبینی واقعی تحریریه */}
            <div
              aria-label="اطلاعات نویسنده و بازبینی"
              className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border bg-surface px-5 py-4 text-xs leading-6 text-muted"
            >
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <Icon name="user" className="h-4 w-4 text-primary" /> {a.author} — {a.authorRole}
              </span>
              {publishedLabel && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="calendar" className="h-4 w-4 text-primary" /> انتشار: {publishedLabel}
                </span>
              )}
              {reviewedLabel && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="clock" className="h-4 w-4 text-primary" /> آخرین بازبینی: {reviewedLabel}
                </span>
              )}
            </div>

            {/* تصویر شاخص مقاله */}
            {a.imageUrl && (
              <figure className="mb-6 overflow-hidden rounded-3xl border border-border">
                <Image
                  src={a.imageUrl}
                  alt={a.imageAlt || a.title}
                  width={1200}
                  height={630}
                  className="h-auto w-full object-cover"
                  priority
                />
                {a.imageAlt && (
                  <figcaption className="bg-surface px-4 py-2.5 text-xs leading-6 text-muted">{a.imageAlt}</figcaption>
                )}
              </figure>
            )}

            {/* پاسخ سریع (AEO — پاسخ مستقیم برای موتورهای پاسخ‌محور؛ هوک speakable: .aeo-quick-answer) */}
            {a.quickAnswer && (
              <div className="aeo-quick-answer mb-7 rounded-2xl border border-accent/30 bg-accent-soft/40 p-5">
                <p className="flex items-center gap-2 text-sm font-black text-foreground">
                  <Icon name="quote" className="h-4 w-4 text-accent-text" /> {t("پاسخ کوتاه")}
                </p>
                <p className="mt-2 text-[15px] leading-8 text-foreground-soft">{a.quickAnswer}</p>
              </div>
            )}

            <div className="space-y-4">
              <ArticleBody content={a.content} />
            </div>

            {/* پرسش‌های متداول (AEO/GEO) */}
            {faq.length > 0 && (
              <section aria-label={t("پرسش‌های متداول")} className="mt-10">
                <h2 className="border-r-4 border-accent pr-3 text-lg font-black text-foreground sm:text-xl">{t("پرسش‌های متداول")}</h2>
                <div className="mt-4 space-y-3">
                  {faq.map((f, i) => (
                    <details key={i} className="group rounded-2xl border border-border bg-surface p-4 open:border-primary/30">
                      <summary className="cursor-pointer list-none text-sm font-bold text-foreground marker:hidden">
                        <span className="inline-flex items-start gap-2">
                          <Icon name="plus" className="mt-0.5 h-4 w-4 shrink-0 text-accent-text transition-transform group-open:rotate-45" />
                          {f.q}
                        </span>
                      </summary>
                      <p className="mt-3 pr-6 text-sm leading-8 text-foreground-soft">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* اشتراک‌گذاری */}
            <div className="mt-8 border-t border-border pt-6">
              <ShareButtons title={a.title} path={`/knowledge/${a.slug}`} />
            </div>

            <Card hover={false} className="mt-8 bg-primary-soft/50">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Icon name="sparkles" className="h-4 w-4 text-accent-text" /> {t("سؤال حقوقی دارید؟")}
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-muted">
                {t("برای مشاوره تخصصی درباره این موضوع با وکیل متخصص صحبت کنید یا از دستیار هوش مصنوعی کمک بگیرید.")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href="/consultation" icon="chat" size="sm">{t("رزرو مشاوره")}</Button>
                <Button href="/ai-assistant" variant="outline" icon="sparkles" size="sm">{t("پرسیدن از دستیار")}</Button>
              </div>
            </Card>

            <p className="mt-6 text-center text-xs leading-5 text-muted">
              <Icon name="alert" className="ml-1 inline h-3.5 w-3.5 text-warning" />
              {t("این محتوا صرفاً جنبه آموزشی دارد و جایگزین مشاوره تخصصی وکیل نیست.")}
            </p>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <Card hover={false}>
              <h2 className="font-bold text-foreground">{t("مقالات مرتبط")}</h2>
              {related.length === 0 ? (
                <p className="mt-2 text-sm text-muted">{t("مقاله مرتبط یافت نشد.")}</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {related.map((r) => (
                    <Link key={r.slug} href={`/knowledge/${r.slug}`} className="block rounded-xl border border-border p-3 transition-colors hover:bg-surface-2">
                      <p className="text-xs text-accent-text">{r.category}</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-foreground">{r.title}</p>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
            <Card hover={false} className="bg-primary-soft/40">
              <h2 className="text-sm font-bold text-foreground">{t("لینک‌های مفید")}</h2>
              <div className="mt-3 flex flex-col gap-1.5 text-sm">
                <Link href="/lawyers" className="text-foreground-soft transition-colors hover:text-primary">{t("یافتن وکیل متخصص")}</Link>
                <Link href="/contracts/builder" className="text-foreground-soft transition-colors hover:text-primary">{t("قراردادساز دادورزان")}</Link>
                <Link href="/legal-forms" className="text-foreground-soft transition-colors hover:text-primary">{t("فرم‌های حقوقی")}</Link>
                <Link href="/qa" className="text-foreground-soft transition-colors hover:text-primary">{t("پرسش و پاسخ حقوقی")}</Link>
                <Link href="/laws" className="text-foreground-soft transition-colors hover:text-primary">{t("مرکز قوانین")}</Link>
                <Link href="/calculators" className="text-foreground-soft transition-colors hover:text-primary">{t("محاسبه‌گرهای حقوقی")}</Link>
                <Link href="/glossary" className="text-foreground-soft transition-colors hover:text-primary">{t("واژه‌نامه حقوقی")}</Link>
                <Link href="/fee-guide" className="text-foreground-soft transition-colors hover:text-primary">{t("جدول تعرفه وکالت")}</Link>
              </div>
            </Card>
          </aside>
        </Container>
      </article>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
    </>
  );
}
