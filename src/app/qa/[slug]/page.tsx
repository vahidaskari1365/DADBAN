import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { qaQuestions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Container, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/** metadata داینامیک برای سئو — عنوان = سؤال، توضیح = خلاصه پاسخ (با دادهٔ ترجمه‌شده در زبان غیرفارسی) */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const [q] = await db.select().from(qaQuestions).where(eq(qaQuestions.slug, slug)).limit(1);
    if (!q) {
      const t = await getT();
      return { title: t("پرسش یافت نشد") };
    }
    const locale = await getServerLocale();
    const [question, answer] = await Promise.all([
      tdyn(locale, q.question, 400),
      tdyn(locale, q.answer, 1200),
    ]);
    return {
      title: question,
      description: answer.slice(0, 155),
      alternates: { canonical: `/qa/${q.slug}` },
    };
  } catch {
    const t = await getT();
    return { title: t("پرسش و پاسخ حقوقی") };
  }
}

export default async function QaDetailPage({ params }: Props) {
  const { slug } = await params;
  const t = await getT();
  const locale = await getServerLocale();

  let original: typeof qaQuestions.$inferSelect | undefined;
  try {
    [original] = await db.select().from(qaQuestions).where(eq(qaQuestions.slug, slug)).limit(1);
  } catch {
    notFound();
  }
  if (!original) notFound();

  // شمارش بازدید — best-effort و بی‌صدا
  try {
    await db
      .update(qaQuestions)
      .set({ views: sql`${qaQuestions.views} + 1` })
      .where(eq(qaQuestions.id, original.id));
  } catch {
    /* ignore */
  }

  // ترجمهٔ سؤال/شرح/پاسخ/دسته/نام‌ونشان وکیل برای زبان غیرفارسی
  let q = original;
  if (locale !== "fa") {
    const [question, body, answer, category, lawyerName, lawyerTitle] = await Promise.all([
      tdyn(locale, original.question, 400),
      original.body ? tdyn(locale, original.body, 800) : Promise.resolve(original.body),
      tdyn(locale, original.answer, 1200),
      tdyn(locale, original.category, 200),
      tdyn(locale, original.lawyerName, 200),
      tdyn(locale, original.lawyerTitle, 200),
    ]);
    q = { ...original, question, body, answer, category, lawyerName, lawyerTitle };
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: q.question,
      text: q.body || q.question,
      answerCount: 1,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
        author: { "@type": "Person", name: q.lawyerName, jobTitle: q.lawyerTitle },
      },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="border-b border-border bg-gradient-to-b from-surface-2/60 to-background py-8">
        <Container>
          <nav className="flex items-center gap-1.5 text-xs text-muted" aria-label={t("مسیر")}>
            <Link href="/" className="hover:text-primary">{t("خانه")}</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <Link href="/qa" className="hover:text-primary">{t("پرسش و پاسخ")}</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <span className="text-foreground-soft">{t("پرسش حقوقی")}</span>
          </nav>
          <h1 className="mt-3 text-2xl font-extrabold leading-9 text-foreground sm:text-3xl">{q.question}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge>{q.category}</Badge>
            <span>{t("پاسخ از: {name} — {title}").replace("{name}", q.lawyerName).replace("{title}", q.lawyerTitle)}</span>
            <span aria-hidden>·</span>
            <span>{faNum(String(q.views))} {t("بازدید")}</span>
            <span aria-hidden>·</span>
            <span>{t("{n} نفر مفید بود").replace("{n}", faNum(String(q.helpful)))}</span>
          </div>
        </Container>
      </section>

      <Container className="py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {q.body ? (
            <article className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="mb-2 text-sm font-bold text-foreground">{t("شرح پرسش")}</h2>
              <p className="whitespace-pre-line text-sm leading-7 text-foreground-soft">{q.body}</p>
            </article>
          ) : null}

          <article className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="check" className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-foreground">{t("پاسخ وکیل")}</h2>
            </div>
            <p className="whitespace-pre-line text-sm leading-8 text-foreground">{q.answer}</p>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
              {q.lawyerName} — {q.lawyerTitle}
            </p>
          </article>

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground-soft">{t("پاسخ جنبه اطلاع‌رسانی دارد و جایگزین مشاوره حقوقی رسمی نیست.")}</p>
            <div className="flex shrink-0 gap-2">
              <Link
                href="/lawyers"
                className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90"
              >
                {t("دیدن وکلای متخصص")}
              </Link>
              <Link
                href="/qa"
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-surface-2"
              >
                {t("سایر پرسش‌ها")}
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
