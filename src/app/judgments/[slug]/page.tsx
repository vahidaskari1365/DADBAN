import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { JUDGMENTS } from "@/lib/content";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const j = JUDGMENTS.find((x) => x.slug === slug);
  if (!j) return { title: "رأی یافت نشد" };
  return { title: j.title, description: j.summary, alternates: { canonical: `/judgments/${slug}` } };
}

export default async function JudgmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const j = JUDGMENTS.find((x) => x.slug === slug);
  if (!j) notFound();
  const related = JUDGMENTS.filter((x) => x.slug !== slug).slice(0, 3);

  return (
    <>
      <PageHero title={j.title} desc={j.summary} breadcrumb={[{ label: "خانه", href: "/" }, { label: "آرای قضایی", href: "/judgments" }, { label: j.subject }]} />
      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Card hover={false}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div><p className="text-xs text-muted">مرجع</p><p className="mt-0.5 text-sm font-bold text-foreground">{j.court}</p></div>
              <div><p className="text-xs text-muted">تاریخ</p><p className="mt-0.5 text-sm font-bold text-foreground">{j.date}</p></div>
              <div><p className="text-xs text-muted">موضوع</p><p className="mt-0.5"><Badge tone="accent">{j.subject}</Badge></p></div>
            </div>
          </Card>
          <Card hover={false}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Icon name="gavel" className="h-5 w-5 text-primary" /> خلاصه‌ی رأی</h2>
            <p className="mt-3 text-sm leading-8 text-foreground-soft">{j.summary}</p>
            <p className="mt-3 text-xs leading-6 text-muted">این خلاصه صرفاً برای آشنایی با رویه‌ی قضایی است و مشاوره‌ی حقوقی محسوب نمی‌شود. متن کامل رأی در منابع رسمی قابل دسترسی است.</p>
          </Card>
        </div>
        <aside className="space-y-4">
          <Card hover={false}>
            <h3 className="text-sm font-bold text-foreground">آرای مرتبط</h3>
            <div className="mt-3 space-y-2">
              {related.map((r) => (
                <a key={r.slug} href={`/judgments/${r.slug}`} className="block rounded-lg p-2 transition-colors hover:bg-surface-2">
                  <p className="text-xs font-semibold text-foreground">{r.title}</p>
                  <p className="text-[11px] text-muted">{r.court}</p>
                </a>
              ))}
            </div>
          </Card>
          <Button href="/lawyers" variant="soft" icon="user" className="w-full">مشاوره با وکیل</Button>
        </aside>
      </Container>
    </>
  );
}
