import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LAWS } from "@/lib/content";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const l = LAWS.find((x) => x.slug === slug);
  if (!l) return { title: "قانون یافت نشد" };
  return { title: l.name, description: l.summary, alternates: { canonical: `/laws/${slug}` } };
}

export default async function LawPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = LAWS.find((x) => x.slug === slug);
  if (!l) notFound();

  return (
    <>
      <PageHero title={l.name} desc={l.summary} breadcrumb={[{ label: "خانه", href: "/" }, { label: "قوانین", href: "/laws" }, { label: l.name }]} />
      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Card hover={false}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { k: "مرجع تصویب", v: l.authority },
                { k: "سال تصویب", v: l.year },
                { k: "وضعیت", v: l.status },
                { k: "موضوعات", v: l.subjects.length.toString() },
              ].map((x) => (
                <div key={x.k}>
                  <p className="text-xs text-muted">{x.k}</p>
                  <p className="mt-0.5 text-sm font-bold text-foreground">{x.v}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card hover={false}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Icon name="landmark" className="h-5 w-5 text-primary" /> موضوعات تحت این قانون</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {l.subjects.map((s) => <Badge key={s} tone="primary">{s}</Badge>)}
            </div>
          </Card>
          <Card hover={false} className="bg-surface-2">
            <p className="text-sm leading-8 text-foreground-soft">{l.summary} متن کامل قانون شامل مواد و تبصره‌ها در منابع رسمی قابل دسترسی است. برای تفسیر و کاربرد قانون در پرونده‌ی خود با وکیل متخصص مشورت کنید.</p>
          </Card>
        </div>
        <aside>
          <Card hover={false} className="bg-gradient-to-br from-primary to-primary-hover text-primary-foreground">
            <h3 className="text-sm font-bold">تفسیر این قانون در پرونده‌ی شما</h3>
            <p className="mt-1 text-xs text-white/80">برای کاربرد دقیق قانون، با وکیل مشورت کنید.</p>
            <Button href="/lawyers" variant="accent" className="mt-3 w-full" size="sm">پیدا کردن وکیل</Button>
          </Card>
        </aside>
      </Container>
    </>
  );
}
