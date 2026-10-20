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
import { PageContentBlocks } from "@/components/page-content-blocks";
import Link from "next/link";
import { LAWS, LAW_CATEGORIES } from "@/lib/laws-content";

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
        desc={t("مقالات تخصصی و راهنماهای گام‌به‌گام برای آشنایی با حقوق خود؛ به قلم وکلای متخصص دادورزان.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("بانک دانش حقوقی") }]}
      />
      <PageContentBlocks page="knowledge" position="top" />

      <Container className="py-8">
        {/* جستجوی موضوعی + فیلتر دسته‌بندی */}
        <KnowledgeSearch items={searchItems} />
      </Container>

      {translated.length === 0 ? (
        <Container className="pb-16">
          <EmptyState
            title={t("مقاله‌ای موجود نیست")}
            icon="book"
            desc={t("در این میان می‌توانید سؤال حقوقی‌تان را از دستیار هوشمند دادورزان بپرسید.")}
            action={{ href: "/ai-assistant", label: t("پرسیدن از دستیار هوشمند") }}
          />
        </Container>
      ) : (
        featured && (
          <Container className="pb-10">
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

      {/* مرکز قوانین — زیربخش قوانین مجله (AEO: توضیح هر قانون به زبان ساده) */}
      <Container className="pb-14">
        <section aria-label="مرکز قوانین" className="rounded-3xl border border-border bg-surface p-6 card-shadow sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="mt-1 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Icon name="landmark" className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-lg font-black text-foreground sm:text-xl">{t("مرکز قوانین ایران")}</h2>
                <p className="mt-1 max-w-xl text-sm leading-7 text-muted">
                  {t(
                    "همه قوانین مهم کشور به زبان ساده در یک‌جا — همراه با مواد کلیدی، نکات عدددار و پرسش‌های متداول هر قانون.",
                  )}
                </p>
              </div>
            </div>
            <Link
              href="/laws"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {t("مشاهده همه قوانین")}
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
          <div className="nice-scroll mt-6 max-h-[560px] overflow-y-auto pr-1">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LAWS.map((l) => (
                <Link
                  key={l.slug}
                  href={`/laws/${l.slug}`}
                  className="group rounded-2xl border border-border bg-surface-2 p-4 transition-all hover:-translate-y-1 hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground">{l.name}</h3>
                    <span className="shrink-0 text-[10px] text-muted">{l.year}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted">{l.summary}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                    {t("توضیح کامل")}
                    <Icon name="arrow" className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] text-muted">
            {t(`${faNum(LAWS.length)} قانون در ${faNum(LAW_CATEGORIES.length)} دسته موضوعی — برای توضیح کامل هر قانون، صفحه آن را باز کنید.`)}
          </p>
        </section>
      </Container>
    </>
  );
}
