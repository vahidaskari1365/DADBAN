import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Container, Button, Badge, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let a: typeof articles.$inferSelect | undefined;
  try {
    const rows = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
    a = rows[0];
  } catch (err) {
    console.error("[dadban] article metadata query failed:", err);
  }
  if (!a) return { title: "مقاله یافت نشد" };
  return {
    title: a.title,
    description: a.excerpt,
    alternates: { canonical: `/knowledge/${slug}` },
    authors: [{ name: a.author }],
    openGraph: { type: "article", title: a.title, description: a.excerpt },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let a: typeof articles.$inferSelect | undefined;
  try {
    const rows = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
    a = rows[0];
  } catch (err) {
    console.error("[dadban] article page query failed:", err);
  }
  if (!a) notFound();

  const paragraphs = a.content.split("\n\n").filter(Boolean);
  let related: typeof articles.$inferSelect[] = [];
  try {
    related = await db
      .select()
      .from(articles)
      .where(eq(articles.category, a.category))
      .then((r) => r.filter((x) => x.slug !== a.slug).slice(0, 3));
  } catch (err) {
    console.error("[dadban] related articles query failed:", err);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.excerpt,
    articleSection: a.category,
    author: { "@type": "Person", name: a.author, jobTitle: a.authorRole },
    publisher: { "@type": "Organization", name: "دادبان" },
    datePublished: a.publishedAt,
  };

  return (
    <>
      <article>
        <section className="border-b border-border bg-gradient-to-b from-surface-2/60 to-background py-8">
          <Container>
            <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
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
            </div>
          </Container>
        </section>

        <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_300px]">
          <div className="max-w-2xl">
            <div className="space-y-5">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-[15px] leading-9 text-foreground-soft">{p}</p>
              ))}
            </div>

            <Card hover={false} className="mt-8 bg-primary-soft/50">
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Icon name="sparkles" className="h-4 w-4 text-accent" /> سؤال حقوقی دارید؟
              </h3>
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
              <h3 className="font-bold text-foreground">مقالات مرتبط</h3>
              {related.length === 0 ? (
                <p className="mt-2 text-sm text-muted">مقاله مرتبط یافت نشد.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {related.map((r) => (
                    <a key={r.slug} href={`/knowledge/${r.slug}`} className="block rounded-xl border border-border p-3 transition-colors hover:bg-surface-2">
                      <p className="text-xs text-accent">{r.category}</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-foreground">{r.title}</p>
                    </a>
                  ))}
                </div>
              )}
            </Card>
          </aside>
        </Container>
      </article>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
