import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { desc, eq, ne } from "drizzle-orm";
import { Container, Button, Badge, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { ArticleBody } from "@/components/article-body";
import { ShareButtons } from "@/components/share-buttons";
import { faNum } from "@/lib/data";
import Link from "next/link";
import { SEO_BASE } from "@/lib/seo";

export const dynamic = "force-dynamic";

interface FaqItem { q: string; a: string }

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
  if (!a) return { title: "مقاله یافت نشد" };
  return {
    title: a.title,
    description: a.excerpt,
    alternates: { canonical: `/knowledge/${slug}` },
    authors: [{ name: a.author }],
    keywords: [a.category, ...a.title.split(" ").filter((w) => w.length > 3)].slice(0, 8),
    openGraph: {
      type: "article",
      title: a.title,
      description: a.excerpt,
      url: `/knowledge/${slug}`,
      images: a.imageUrl ? [{ url: a.imageUrl, alt: a.imageAlt || a.title }] : undefined,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) notFound();

  // مقالات مرتبط: ابتدا هم‌دسته، سپس تازه‌ترین مقالات دیگر (شبکه داخلی قوی‌تر)
  let related: typeof articles.$inferSelect[] = [];
  try {
    related = await db
      .select()
      .from(articles)
      .where(eq(articles.category, a.category))
      .orderBy(desc(articles.publishedAt))
      .then((r) => r.filter((x) => x.slug !== a.slug).slice(0, 3));
    if (related.length < 3) {
      const more = await db
        .select()
        .from(articles)
        .where(ne(articles.slug, a.slug))
        .orderBy(desc(articles.views))
        .then((r) => r.filter((x) => !related.some((y) => y.slug === x.slug)).slice(0, 3 - related.length));
      related = [...related, ...more];
    }
  } catch (err) {
    console.error("[dadban] related articles query failed:", err);
  }

  let faq: FaqItem[] = [];
  try {
    const parsed = JSON.parse(a.faq || "[]");
    if (Array.isArray(parsed)) faq = parsed.filter((f) => f?.q && f?.a);
  } catch {
    /* faq نامعتبر */
  }

  const wordCount = a.content.split(/\s+/).filter(Boolean).length;
  const articleUrl = `${SEO_BASE}/knowledge/${a.slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: a.title,
      description: a.excerpt,
      articleSection: a.category,
      inLanguage: "fa-IR",
      wordCount,
      author: { "@type": "Person", name: a.author, jobTitle: a.authorRole },
      publisher: { "@type": "Organization", name: "دادبان", url: SEO_BASE },
      datePublished: a.publishedAt,
      dateModified: a.publishedAt,
      mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
      image: a.imageUrl ? `${SEO_BASE}${a.imageUrl}` : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "خانه", item: SEO_BASE },
        { "@type": "ListItem", position: 2, name: "بانک دانش حقوقی", item: `${SEO_BASE}/knowledge` },
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
        <section className="border-b border-border bg-gradient-to-b from-surface-2/60 to-background py-8">
          <Container>
            <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted" aria-label="مسیر صفحه">
              <Link href="/" className="hover:text-primary">خانه</Link>
              <Icon name="chevron" className="h-3 w-3 rotate-180" />
              <Link href="/knowledge" className="hover:text-primary">دانش حقوقی</Link>
              <Icon name="chevron" className="h-3 w-3 rotate-180" />
              <span className="text-foreground-soft">{a.category}</span>
            </nav>
            <Badge tone="accent">{a.category}</Badge>
            <h1 className="mt-3 max-w-3xl text-2xl font-extrabold leading-9 text-foreground sm:text-3xl">{a.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5"><Icon name="user" className="h-4 w-4" /> {a.author} — {a.authorRole}</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="clock" className="h-4 w-4" /> {faNum(a.readTime)} دقیقه مطالعه</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="star" className="h-4 w-4" /> {faNum(a.views.toLocaleString("en-US"))} بازدید</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="document" className="h-4 w-4" /> {faNum(wordCount.toLocaleString("en-US"))} واژه</span>
            </div>
          </Container>
        </section>

        <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_300px]">
          <div className="max-w-2xl">
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

            {/* پاسخ سریع (AEO — پاسخ مستقیم برای موتورهای پاسخ‌محور) */}
            {a.quickAnswer && (
              <div className="mb-7 rounded-2xl border border-accent/30 bg-accent-soft/40 p-5">
                <p className="flex items-center gap-2 text-sm font-black text-foreground">
                  <Icon name="quote" className="h-4 w-4 text-accent" /> پاسخ کوتاه
                </p>
                <p className="mt-2 text-[15px] leading-8 text-foreground-soft">{a.quickAnswer}</p>
              </div>
            )}

            <div className="space-y-4">
              <ArticleBody content={a.content} />
            </div>

            {/* پرسش‌های متداول (AEO/GEO) */}
            {faq.length > 0 && (
              <section aria-label="پرسش‌های متداول" className="mt-10">
                <h2 className="border-r-4 border-accent pr-3 text-lg font-black text-foreground sm:text-xl">پرسش‌های متداول</h2>
                <div className="mt-4 space-y-3">
                  {faq.map((f, i) => (
                    <details key={i} className="group rounded-2xl border border-border bg-surface p-4 open:border-primary/30">
                      <summary className="cursor-pointer list-none text-sm font-bold text-foreground marker:hidden">
                        <span className="inline-flex items-start gap-2">
                          <Icon name="plus" className="mt-0.5 h-4 w-4 shrink-0 text-accent transition-transform group-open:rotate-45" />
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
                <Icon name="sparkles" className="h-4 w-4 text-accent" /> سؤال حقوقی دارید؟
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-muted">
                برای مشاوره تخصصی درباره این موضوع با وکیل متخصص صحبت کنید یا از دستیار هوش مصنوعی کمک بگیرید.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href="/consultation" icon="chat" size="sm">رزرو مشاوره</Button>
                <Button href="/ai-assistant" variant="outline" icon="sparkles" size="sm">پرسیدن از دستیار</Button>
              </div>
            </Card>

            <p className="mt-6 text-center text-xs leading-5 text-muted">
              <Icon name="alert" className="ml-1 inline h-3.5 w-3.5 text-warning" />
              این محتوا صرفاً جنبه آموزشی دارد و جایگزین مشاوره تخصصی وکیل نیست.
            </p>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <Card hover={false}>
              <h2 className="font-bold text-foreground">مقالات مرتبط</h2>
              {related.length === 0 ? (
                <p className="mt-2 text-sm text-muted">مقاله مرتبط یافت نشد.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {related.map((r) => (
                    <Link key={r.slug} href={`/knowledge/${r.slug}`} className="block rounded-xl border border-border p-3 transition-colors hover:bg-surface-2">
                      <p className="text-xs text-accent">{r.category}</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-foreground">{r.title}</p>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
            <Card hover={false} className="bg-primary-soft/40">
              <h2 className="text-sm font-bold text-foreground">لینک‌های مفید</h2>
              <div className="mt-3 flex flex-col gap-1.5 text-sm">
                <Link href="/lawyers" className="text-foreground-soft transition-colors hover:text-primary">یافتن وکیل متخصص</Link>
                <Link href="/contracts/builder" className="text-foreground-soft transition-colors hover:text-primary">قراردادساز دادبان</Link>
                <Link href="/legal-forms" className="text-foreground-soft transition-colors hover:text-primary">فرم‌های حقوقی</Link>
                <Link href="/qa" className="text-foreground-soft transition-colors hover:text-primary">پرسش و پاسخ حقوقی</Link>
                <Link href="/laws" className="text-foreground-soft transition-colors hover:text-primary">مرکز قوانین</Link>
              </div>
            </Card>
          </aside>
        </Container>
      </article>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
