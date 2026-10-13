import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";
import { getGlossary } from "@/lib/content-store";

export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("واژه‌نامه حقوقی"),
    description: t("تعریف ساده و تخصصی اصطلاحات حقوقی مانند اعسار، واخواهی، تجدیدنظر، خیانت در امانت و... با مثال و قوانین مرتبط."),
    alternates: { canonical: "/glossary" },
  };
}

export default async function GlossaryPage() {
  const t = await getT();
  const locale = await getServerLocale();

  // منبع: دیتابیس (ویرایش ادمین) با fallback تحریریه — سپس ترجمه برای زبان غیرفارسی
  const glossary = await getGlossary();
  const translated = await Promise.all(
    glossary.map(async (g) => {
      if (locale === "fa") return g;
      const [term, simple] = await Promise.all([
        tdyn(locale, g.term, 200),
        tdyn(locale, g.simple, 600),
      ]);
      return { ...g, term, simple };
    }),
  );
  const sorted = [...translated].sort((a, b) => a.term.localeCompare(b.term, locale));

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-glossary.png"
        badge={t("واژه‌نامه حقوقی")}
        title={t("اصطلاحات حقوقی، به زبان ساده")}
        desc={t("تعریف ساده و تخصصی اصطلاحات حقوقی همراه با مثال و قوانین مرتبط؛ مرجعی برای دانش حقوقی شما.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("واژه‌نامه حقوقی") }]}
      />
      <Container className="py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((g, i) => (
            <Reveal key={g.slug} delay={(i % 6) * 40}>
              <Link
                href={`/glossary/${g.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">{g.term}</h2>
                  <Icon name="book" className="h-4 w-4 text-accent-text" />
                </div>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted">{g.simple}</p>
                <span className="mt-3 text-xs font-semibold text-primary">{t("مشاهده تعریف کامل ←")}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </>
  );
}
