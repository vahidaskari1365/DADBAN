import type { Metadata } from "next";
import { db } from "@/db";
import { qaQuestions } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Container, Badge } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { AskForm } from "@/components/ask-form";
import { faNum } from "@/lib/data";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n/core";
import { tdyn } from "@/lib/i18n/dynamic";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // metadata با زبان جاری ساخته می‌شود (fallback: فارسی)
  const st = makeT(await getServerLocale());
  return {
    title: st("پرسش و پاسخ حقوقی"),
    description: st(
      "پاسخ وکلای متخصص به پرسش‌های رایج حقوقی: چک برگشتی، طلاق، ملک، قرارداد، کلاهبرداری و ارث. سؤال خود را بپرسید.",
    ),
    alternates: { canonical: "/qa" },
  };
}

export default async function QaPage() {
  const t = await getT();
  const locale = await getServerLocale();
  let all: typeof qaQuestions.$inferSelect[] = [];
  try {
    all = await db.select().from(qaQuestions).orderBy(desc(qaQuestions.helpful));
  } catch (err) {
    console.error("[dadban] qa list query failed:", err);
  }

  // ترجمهٔ سؤال/شرح/پاسخ/دسته/نام‌ونشان وکیل برای زبان غیرفارسی (موازی)
  const rows = await Promise.all(
    all.map(async (q) => {
      if (locale === "fa") return q;
      const [question, body, answer, category, lawyerName, lawyerTitle] = await Promise.all([
        tdyn(locale, q.question, 400),
        q.body ? tdyn(locale, q.body, 800) : Promise.resolve(q.body),
        tdyn(locale, q.answer, 1200),
        tdyn(locale, q.category, 200),
        tdyn(locale, q.lawyerName, 200),
        tdyn(locale, q.lawyerTitle, 200),
      ]);
      return { ...q, question, body, answer, category, lawyerName, lawyerTitle };
    }),
  );
  const categories = Array.from(new Set(rows.map((q) => q.category)));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: rows.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer, author: { "@type": "Person", name: q.lawyerName } },
    })),
  };

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-qa.png"
        title={t("پرسش و پاسخ حقوقی")}
        desc={t("پاسخ وکلای متخصص دادورزان به پرسش‌های رایج؛ دسته‌بندی‌شده و قابل جستجو. سؤال خود را هم بپرسید.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پرسش و پاسخ") }]}
      />

      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span key={c} className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground-soft">{c}</span>
            ))}
          </div>

          {rows.map((q) => (
            <div
              key={q.slug}
              id={q.slug}
              className="scroll-mt-20 rounded-2xl border border-border bg-surface p-5 card-shadow"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon name="chat" className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <h2 className="text-base font-bold leading-7 text-foreground">{q.question}</h2>
                  {q.body && <p className="mt-1 text-xs text-muted">{q.body}</p>}
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-surface-2 p-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-success/15 text-success">
                    <Icon name="check" className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-foreground">{q.lawyerName}</p>
                    <p className="text-[11px] text-muted">{q.lawyerTitle}</p>
                  </div>
                  {q.verified && <Badge tone="success" icon="badge">{t("تأییدشده")}</Badge>}
                </div>
                <p className="mt-3 text-sm leading-7 text-foreground-soft">{q.answer}</p>
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1"><Icon name="star" className="h-3.5 w-3.5 text-accent-text" /> {faNum(q.helpful)} {t("مفید")}</span>
                <span className="inline-flex items-center gap-1"><Icon name="book" className="h-3.5 w-3.5" /> {faNum(q.views.toLocaleString("en-US"))} {t("بازدید")}</span>
                <Badge tone="neutral">{q.category}</Badge>
              </div>
            </div>
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <AskForm />
          <div className="rounded-2xl border border-border bg-primary-soft/50 p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Icon name="bolt" className="h-4 w-4 text-accent-text" /> {t("پاسخ فوری می‌خواهید؟")}
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-muted">{t("برای پاسخ آنی و تخصصی، مشاوره آنلاین رزرو کنید.")}</p>
            <Link href="/consultation" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover">
              <Icon name="chat" className="h-4 w-4" /> {t("رزرو مشاوره آنلاین")}
            </Link>
          </div>
        </aside>
      </Container>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
