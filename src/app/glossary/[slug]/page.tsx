import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { GLOSSARY } from "@/lib/content";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = GLOSSARY.find((x) => x.slug === slug);
  if (!t) return { title: "واژه یافت نشد" };
  return {
    title: `${t.term} — تعریف حقوقی`,
    description: t.simple,
    alternates: { canonical: `/glossary/${slug}` },
  };
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = GLOSSARY.find((x) => x.slug === slug);
  if (!t) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: t.term,
    description: t.pro,
  };

  const related = GLOSSARY.filter((x) => x.slug !== slug).slice(0, 4);

  return (
    <>
      <PageHero title={`واژه: ${t.term}`} desc={t.simple} breadcrumb={[{ label: "خانه", href: "/" }, { label: "واژه‌نامه", href: "/glossary" }, { label: t.term }]} />
      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card hover={false}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Icon name="book" className="h-5 w-5 text-accent" /> تعریف تخصصی</h2>
            <p className="mt-3 text-sm leading-8 text-foreground-soft">{t.pro}</p>
          </Card>
          <Card hover={false} className="bg-primary-soft/40">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground"><Icon name="chat" className="h-4 w-4 text-primary" /> مثال</h2>
            <p className="mt-2 text-sm leading-7 text-foreground-soft">{t.example}</p>
          </Card>
          <Card hover={false}>
            <h2 className="text-sm font-bold text-foreground">قوانین و مفاهیم مرتبط</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {t.related.map((r) => <Badge key={r} tone="neutral">{r}</Badge>)}
            </div>
          </Card>
        </div>
        <aside className="space-y-4">
          <Card hover={false} className="bg-gradient-to-br from-primary to-primary-hover text-primary-foreground">
            <h3 className="text-sm font-bold">در این زمینه مشاوره می‌خواهید؟</h3>
            <p className="mt-1 text-xs text-white/80">با وکیل متخصص صحبت کنید.</p>
            <Button href="/consultation" variant="accent" className="mt-3 w-full" size="sm">رزرو مشاوره</Button>
          </Card>
          <Card hover={false}>
            <h3 className="text-sm font-bold text-foreground">واژه‌های مرتبط</h3>
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
