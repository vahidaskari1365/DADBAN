import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";
import { getJudgmentEntry, getJudgments } from "@/lib/content-store";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getT();
  const judgment = await getJudgmentEntry(slug);
  if (!judgment) return { title: t("رأی یافت نشد") };
  const locale = await getServerLocale();
  const [title, summary] = await Promise.all([
    tdyn(locale, judgment.title, 400),
    tdyn(locale, judgment.summary, 700),
  ]);
  return { title, description: summary, alternates: { canonical: `/judgments/${slug}` } };
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

  // آرای مرتبط — فقط عنوان و مرجع برای نمایش ترجمه می‌شود
  const relatedOriginal = (await getJudgments()).filter((x) => x.slug !== slug).slice(0, 3);
  const related = await Promise.all(
    relatedOriginal.map(async (r) => {
      if (locale === "fa") return r;
      const [title, court] = await Promise.all([
        tdyn(locale, r.title, 400),
        tdyn(locale, r.court, 200),
      ]);
      return { ...r, title, court };
    }),
  );

  return (
    <>
      <PageHero variant="market" image="/images/hero-judgments.png" title={j.title} desc={j.summary} breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("آرای قضایی"), href: "/judgments" }, { label: j.subject }]} />
      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Card hover={false}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div><p className="text-xs text-muted">{t("مرجع")}</p><p className="mt-0.5 text-sm font-bold text-foreground">{j.court}</p></div>
              <div><p className="text-xs text-muted">{t("تاریخ")}</p><p className="mt-0.5 text-sm font-bold text-foreground">{j.date}</p></div>
              <div><p className="text-xs text-muted">{t("موضوع")}</p><p className="mt-0.5"><Badge tone="accent">{j.subject}</Badge></p></div>
            </div>
          </Card>
          <Card hover={false}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Icon name="gavel" className="h-5 w-5 text-primary" /> {t("خلاصه‌ی رأی")}</h2>
            <p className="mt-3 text-sm leading-8 text-foreground-soft">{j.summary}</p>
            <p className="mt-3 text-xs leading-6 text-muted">{t("این خلاصه صرفاً برای آشنایی با رویه‌ی قضایی است و مشاوره‌ی حقوقی محسوب نمی‌شود. متن کامل رأی در منابع رسمی قابل دسترسی است.")}</p>
          </Card>
        </div>
        <aside className="space-y-4">
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
          <Button href="/lawyers" variant="soft" icon="user" className="w-full">{t("مشاوره با وکیل")}</Button>
        </aside>
      </Container>
    </>
  );
}
