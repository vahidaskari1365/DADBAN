import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LEGAL_FORMS } from "@/lib/content";
import { faNum } from "@/lib/data";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = LEGAL_FORMS.find((x) => x.slug === slug);
  if (!f) return { title: "فرم یافت نشد" };
  return { title: `تنظیم ${f.name}`, description: f.desc, alternates: { canonical: `/legal-forms/${slug}` } };
}

export default async function LegalFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = LEGAL_FORMS.find((x) => x.slug === slug);
  if (!f) notFound();

  return (
    <>
      <PageHero title={`تنظیم ${f.name}`} desc={f.desc} breadcrumb={[{ label: "خانه", href: "/" }, { label: "فرم‌های حقوقی", href: "/legal-forms" }, { label: f.name }]}>
        <div className="flex flex-wrap gap-2">
          <Button href="/consultation" icon="document">ساخت فرم با وکیل</Button>
          <Button href="/contracts/builder" variant="outline" icon="sparkles">قراردادساز</Button>
        </div>
      </PageHero>
      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card hover={false}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Icon name="folder" className="h-5 w-5 text-primary" /> مدارک موردنیاز</h2>
            <div className="mt-3 space-y-2">
              {f.docs.map((d) => (
                <div key={d} className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground-soft">
                  <Icon name="file" className="h-4 w-4 text-primary" /> {d}
                </div>
              ))}
            </div>
          </Card>
          <Card hover={false}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Icon name="bolt" className="h-5 w-5 text-accent" /> مراحل تنظیم</h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {f.steps.map((s, i) => (
                <li key={s} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{faNum(i + 1)}</span>
                  <span className="text-sm font-medium text-foreground">{s}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card hover={false}>
            <h3 className="font-bold text-foreground">تنظیم تخصصی</h3>
            <p className="mt-1 text-xs text-muted">{f.name} شما توسط وکیل متخصص تنظیم و بازبینی می‌شود.</p>
            <Button href="/consultation" className="mt-3 w-full" icon="user">درخواست تنظیم</Button>
          </Card>
          <Card hover={false} className="bg-primary-soft/50">
            <p className="flex items-start gap-2 text-xs leading-6 text-foreground-soft"><Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-success" /> همه‌ی اسناد توسط وکلای عضو کانون تنظیم و مطابق قوانین روز هستند.</p>
            <div className="mt-3"><Badge tone="success" icon="lock">محرمانگی</Badge></div>
          </Card>
        </aside>
      </Container>
    </>
  );
}
