import type { Metadata } from "next";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Container, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum, relativeTime } from "@/lib/data";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // ISR — هر ساعت آپدیت می‌شه

export const metadata: Metadata = {
  title: "بانک دانش و مقالات حقوقی",
  description:
    "مقالات و آموزش‌های حقوقی تخصصی در حوزه خانواده، ملک، کیفری، قراردادها، چک، ارث، کار و شرکت‌ها. راهنمای گام‌به‌گام مشکلات حقوقی.",
  alternates: { canonical: "/knowledge" },
};

export default async function KnowledgePage() {
  let all: typeof articles.$inferSelect[] = [];
  try {
    all = await db.select().from(articles).orderBy(desc(articles.publishedAt));
  } catch (err) {
    console.error("[dadban] knowledge list query failed:", err);
  }
  const categories = Array.from(new Set(all.map((a) => a.category)));
  const featured = all[0];
  const rest = all.slice(1);

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-surface-2/60 to-background py-8">
        <Container>
          <nav className="flex items-center gap-1.5 text-xs text-muted">
            <Link href="/" className="hover:text-primary">خانه</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <span className="text-foreground-soft">بانک دانش حقوقی</span>
          </nav>
          <h1 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">بانک دانش و آموزش حقوقی</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            مقالات تخصصی و راهنماهای گام‌به‌گام برای آشنایی با حقوق خود؛ به قلم وکلای متخصص دادبان.
          </p>
        </Container>
      </section>

      <Container className="py-8">
        {/* Categories */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c} className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-foreground-soft">
              {c}
            </span>
          ))}
        </div>

        {all.length === 0 ? (
          <EmptyState title="مقاله‌ای موجود نیست" icon="book" />
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <a
                href={`/knowledge/${featured.slug}`}
                className="group mb-8 grid overflow-hidden rounded-3xl border border-border bg-surface card-shadow transition-all hover:shadow-[var(--shadow-lift)] md:grid-cols-2"
              >
                <div className="flex flex-col justify-between gap-4 p-6 sm:p-8">
                  <div>
                    <Badge tone="accent" icon="star">مقاله ویژه</Badge>
                    <h2 className="mt-3 text-2xl font-extrabold leading-8 text-foreground">{featured.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-muted">{featured.excerpt}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><Icon name="user" className="h-3.5 w-3.5" /> {featured.author}</span>
                    <span className="inline-flex items-center gap-1"><Icon name="clock" className="h-3.5 w-3.5" /> {faNum(featured.readTime)} دقیقه</span>
                  </div>
                </div>
                <div className="relative min-h-[180px] bg-gradient-to-br from-primary to-primary-hover p-8 text-primary-foreground">
                  <Icon name="book" className="absolute -bottom-4 -left-4 h-40 w-40 opacity-10" />
                  <div className="relative flex h-full flex-col justify-center">
                    <p className="text-sm font-semibold opacity-80">{featured.category}</p>
                    <p className="mt-4 text-lg font-bold leading-8">آموزش گام‌به‌گام و کاربردی، همراه با مراحل، مدارک و ریسک‌ها.</p>
                    <span className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition-colors group-hover:bg-white/25">
                      مطالعه مقاله
                      <Icon name="arrow" className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </a>
            )}

            {/* Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((a) => (
                <a
                  key={a.slug}
                  href={`/knowledge/${a.slug}`}
                  className="group flex flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]"
                >
                  <div className="flex items-center gap-2 text-xs text-accent">
                    <Icon name="book" className="h-3.5 w-3.5" /> {a.category}
                  </div>
                  <h3 className="mt-2 flex-1 text-base font-bold leading-7 text-foreground">{a.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{a.excerpt}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><Icon name="user" className="h-3.5 w-3.5" /> {a.author}</span>
                    <span>{relativeTime(a.publishedAt)}</span>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </Container>
    </>
  );
}
