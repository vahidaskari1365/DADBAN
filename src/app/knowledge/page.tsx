import type { Metadata } from "next";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Container, Badge, EmptyState } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { KnowledgeSearch, type KnowledgeItem } from "@/components/knowledge-search";
import { faNum } from "@/lib/data";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n/core";
import { tdyn } from "@/lib/i18n/dynamic";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // ISR — هر ساعت آپدیت می‌شه

export async function generateMetadata(): Promise<Metadata> {
  // metadata با زبان جاری ساخته می‌شود (fallback: فارسی)
  const st = makeT(await getServerLocale());
  return {
    title: st("بانک دانش و مقالات حقوقی"),
    description: st(
      "مقالات و آموزش‌های حقوقی تخصصی در حوزه خانواده، ملک، کیفری، قراردادها، چک، ارث، کار و شرکت‌ها. راهنمای گام‌به‌گام مشکلات حقوقی.",
    ),
    alternates: { canonical: "/knowledge" },
  };
}

export default async function KnowledgePage() {
  const t = await getT();
  const locale = await getServerLocale();
  let all: typeof articles.$inferSelect[] = [];
  try {
    all = await db.select().from(articles).orderBy(desc(articles.publishedAt));
  } catch (err) {
    console.error("[dadban] knowledge list query failed:", err);
  }

  // ترجمهٔ فیلدهای نمایشی مقالات برای زبان غیرفارسی (موازی) — محتوای کامل اینجا لود نمی‌شود
  const translated = await Promise.all(
    all.map(async (a) => {
      if (locale === "fa") return a;
      const [title, category, excerpt, author] = await Promise.all([
        tdyn(locale, a.title, 400),
        tdyn(locale, a.category, 200),
        tdyn(locale, a.excerpt, 800),
        tdyn(locale, a.author, 300),
      ]);
      return { ...a, title, category, excerpt, author };
    }),
  );
  const featured = translated[0];
  const searchItems: KnowledgeItem[] = translated.map((a) => ({
    slug: a.slug,
    title: a.title,
    category: a.category,
    excerpt: a.excerpt,
    author: a.author,
    readTime: a.readTime,
    views: a.views,
    publishedAt: a.publishedAt,
  }));

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-knowledge.png"
        title={t("بانک دانش و آموزش حقوقی")}
        desc={t("مقالات تخصصی و راهنماهای گام‌به‌گام برای آشنایی با حقوق خود؛ به قلم وکلای متخصص دادبان.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("بانک دانش حقوقی") }]}
      />

      <Container className="py-8">
        {/* جستجوی موضوعی + فیلتر دسته‌بندی */}
        <KnowledgeSearch items={searchItems} />
      </Container>

      {translated.length === 0 ? (
        <Container className="pb-16">
          <EmptyState
            title={t("مقاله‌ای موجود نیست")}
            icon="book"
            desc={t("در این میان می‌توانید سؤال حقوقی‌تان را از دستیار هوشمند دادبان بپرسید.")}
            action={{ href: "/ai-assistant", label: t("پرسیدن از دستیار هوشمند") }}
          />
        </Container>
      ) : (
        featured && (
          <Container className="pb-16">
            {/* Featured */}
            <a
              href={`/knowledge/${featured.slug}`}
              className="group grid overflow-hidden rounded-3xl border border-border bg-surface card-shadow transition-all hover:shadow-[var(--shadow-lift)] md:grid-cols-2"
            >
              <div className="flex flex-col justify-between gap-4 p-6 sm:p-8">
                <div>
                  <Badge tone="accent" icon="star">{t("مقاله ویژه")}</Badge>
                  <h2 className="mt-3 text-2xl font-extrabold leading-8 text-foreground">{featured.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-muted">{featured.excerpt}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><Icon name="user" className="h-3.5 w-3.5" /> {featured.author}</span>
                  <span className="inline-flex items-center gap-1"><Icon name="clock" className="h-3.5 w-3.5" /> {faNum(featured.readTime)} {t("دقیقه")}</span>
                </div>
              </div>
              <div className="relative min-h-[180px] bg-gradient-to-br from-primary to-primary-hover p-8 text-primary-foreground">
                <Icon name="book" className="absolute -bottom-4 -left-4 h-40 w-40 opacity-10" />
                <div className="relative flex h-full flex-col justify-center">
                  <p className="text-sm font-semibold opacity-80">{featured.category}</p>
                  <p className="mt-4 text-lg font-bold leading-8">{t("آموزش گام‌به‌گام و کاربردی، همراه با مراحل، مدارک و ریسک‌ها.")}</p>
                  <span className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition-colors group-hover:bg-white/25">
                    {t("مطالعه مقاله")}
                    <Icon name="arrow" className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </a>
          </Container>
        )
      )}
    </>
  );
}
