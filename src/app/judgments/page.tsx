import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { Container, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";
import { JUDGMENTS } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("آرای قضایی"),
    description: t("مرور رویه قضایی و آرای قابل انتشار در موضوعات خانواده، ملک، کیفری، تجارت و کار."),
    alternates: { canonical: "/judgments" },
  };
}

export default async function JudgmentsPage() {
  const t = await getT();
  const locale = await getServerLocale();

  // ترجمهٔ عنوان/خلاصهٔ رأی برای زبان غیرفارسی (موازی، با کش) — متن کامل رأی verbatim می‌ماند
  const judgments = await Promise.all(
    JUDGMENTS.map(async (j) => {
      if (locale === "fa") return j;
      const [title, summary, court, subject] = await Promise.all([
        tdyn(locale, j.title, 400),
        tdyn(locale, j.summary, 700),
        tdyn(locale, j.court, 200),
        tdyn(locale, j.subject, 200),
      ]);
      return { ...j, title, summary, court, subject };
    }),
  );

  return (
    <>
      <PageHero
        badge={t("آرای قضایی")}
        title={t("رویه قضایی و آرای قابل انتشار")}
        desc={t("آرای دیوان عالی کشور و سایر مراجع در موضوعات مختلف، برای آشنایی با رویه‌ی قضایی.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("آرای قضایی") }]}
      />
      <Container className="py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {judgments.map((j, i) => (
            <Reveal key={j.slug} delay={(i % 6) * 40}>
              <Link href={`/judgments/${j.slug}`} className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name="gavel" className="h-5 w-5" /></span>
                  <Badge tone="accent">{j.subject}</Badge>
                </div>
                <h2 className="mt-3 text-sm font-bold leading-6 text-foreground">{j.title}</h2>
                <p className="mt-1 flex-1 text-xs leading-6 text-muted">{j.summary}</p>
                <p className="mt-3 text-[11px] text-muted">{j.court} • {j.date}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </>
  );
}
