import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";
import { GLOSSARY } from "@/lib/content";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await getT();
  const entry = GLOSSARY.find((x) => x.slug === slug);
  if (!entry) return { title: t("واژه یافت نشد") };
  const locale = await getServerLocale();
  const [term, simple] = await Promise.all([
    tdyn(locale, entry.term, 200),
    tdyn(locale, entry.simple, 600),
  ]);
  return {
    title: t("{term} — تعریف حقوقی").replace("{term}", term),
    description: simple,
    alternates: { canonical: `/glossary/${slug}` },
  };
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getT();
  const locale = await getServerLocale();
  const entry = GLOSSARY.find((x) => x.slug === slug);
  if (!entry) notFound();

  // ترجمهٔ اصطلاح/تعریف‌ها/مثال/مرتبط‌ها برای زبان غیرفارسی (موازی، با کش)
  let g = entry;
  if (locale !== "fa") {
    const [term, simple, pro, example, ...relatedRaw] = await Promise.all([
      tdyn(locale, entry.term, 200),
      tdyn(locale, entry.simple, 600),
      tdyn(locale, entry.pro, 900),
      tdyn(locale, entry.example, 700),
      ...entry.related.map((r) => tdyn(locale, r, 200)),
    ]);
    g = { ...entry, term, simple, pro, example, related: relatedRaw };
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: g.term,
    description: g.pro,
  };

  // واژه‌های مرتبط — فقط اصطلاح برای نمایش ترجمه می‌شود
  const relatedOriginal = GLOSSARY.filter((x) => x.slug !== slug).slice(0, 4);
  const related = await Promise.all(
    relatedOriginal.map(async (r) => {
      if (locale === "fa") return r;
      return { ...r, term: await tdyn(locale, r.term, 200) };
    }),
  );

  return (
    <>
      <PageHero title={t("واژه: {term}").replace("{term}", g.term)} desc={g.simple} breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("واژه‌نامه"), href: "/glossary" }, { label: g.term }]} />
      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card hover={false}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Icon name="book" className="h-5 w-5 text-accent-text" /> {t("تعریف تخصصی")}</h2>
            <p className="mt-3 text-sm leading-8 text-foreground-soft">{g.pro}</p>
          </Card>
          <Card hover={false} className="bg-primary-soft/40">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground"><Icon name="chat" className="h-4 w-4 text-primary" /> {t("مثال")}</h2>
            <p className="mt-2 text-sm leading-7 text-foreground-soft">{g.example}</p>
          </Card>
          <Card hover={false}>
            <h2 className="text-sm font-bold text-foreground">{t("قوانین و مفاهیم مرتبط")}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {g.related.map((r) => <Badge key={r} tone="neutral">{r}</Badge>)}
            </div>
          </Card>
        </div>
        <aside className="space-y-4">
          <Card hover={false} className="bg-gradient-to-br from-primary to-primary-hover text-primary-foreground">
            <h3 className="text-sm font-bold">{t("در این زمینه مشاوره می‌خواهید؟")}</h3>
            <p className="mt-1 text-xs text-white/80">{t("با وکیل متخصص صحبت کنید.")}</p>
            <Button href="/consultation" variant="accent" className="mt-3 w-full" size="sm">{t("رزرو مشاوره")}</Button>
          </Card>
          <Card hover={false}>
            <h3 className="text-sm font-bold text-foreground">{t("واژه‌های مرتبط")}</h3>
            <div className="mt-3 space-y-1.5">
              {related.map((r) => (
                <a key={r.slug} href={`/glossary/${r.slug}`} className="block rounded-lg px-2 py-1.5 text-sm text-foreground-soft transition-colors hover:bg-surface-2 hover:text-primary">{r.term}</a>
              ))}
            </div>
          </Card>
        </aside>
      </Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
