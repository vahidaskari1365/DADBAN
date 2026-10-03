import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { qaQuestions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Container, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/** metadata داینامیک برای سئو — عنوان = سؤال، توضیح = خلاصه پاسخ */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const [q] = await db.select().from(qaQuestions).where(eq(qaQuestions.slug, slug)).limit(1);
    if (!q) return { title: "پرسش یافت نشد" };
    return {
      title: q.question,
      description: q.answer.slice(0, 155),
      alternates: { canonical: `/qa/${q.slug}` },
    };
  } catch {
    return { title: "پرسش و پاسخ حقوقی" };
  }
}

export default async function QaDetailPage({ params }: Props) {
  const { slug } = await params;

  let q: typeof qaQuestions.$inferSelect | undefined;
  try {
    [q] = await db.select().from(qaQuestions).where(eq(qaQuestions.slug, slug)).limit(1);
  } catch {
    notFound();
  }
  if (!q) notFound();

  // شمارش بازدید — best-effort و بی‌صدا
  try {
    await db
      .update(qaQuestions)
      .set({ views: sql`${qaQuestions.views} + 1` })
      .where(eq(qaQuestions.id, q.id));
  } catch {
    /* ignore */
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
          <nav className="flex items-center gap-1.5 text-xs text-muted" aria-label="مسیر">
            <Link href="/" className="hover:text-primary">خانه</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <Link href="/qa" className="hover:text-primary">پرسش و پاسخ</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <span className="text-foreground-soft">پرسش حقوقی</span>
          </nav>
          <h1 className="mt-3 text-2xl font-extrabold leading-9 text-foreground sm:text-3xl">{q.question}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge>{q.category}</Badge>
            <span>پاسخ از: {q.lawyerName} — {q.lawyerTitle}</span>
            <span aria-hidden>·</span>
            <span>{faNum(String(q.views))} بازدید</span>
            <span aria-hidden>·</span>
            <span>{faNum(String(q.helpful))} نفر مفید بود</span>
          </div>
        </Container>
      </section>

      <Container className="py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {q.body ? (
            <article className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="mb-2 text-sm font-bold text-foreground">شرح پرسش</h2>
              <p className="whitespace-pre-line text-sm leading-7 text-foreground-soft">{q.body}</p>
            </article>
          ) : null}

          <article className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="check" className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-foreground">پاسخ وکیل</h2>
            </div>
            <p className="whitespace-pre-line text-sm leading-8 text-foreground">{q.answer}</p>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
              {q.lawyerName} — {q.lawyerTitle}
            </p>
          </article>

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground-soft">پاسخ جنبه اطلاع‌رسانی دارد و جایگزین مشاوره حقوقی رسمی نیست.</p>
            <div className="flex shrink-0 gap-2">
              <Link
                href="/lawyers"
                className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90"
              >
                دیدن وکلای متخصص
              </Link>
              <Link
                href="/qa"
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-surface-2"
              >
                سایر پرسش‌ها
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
