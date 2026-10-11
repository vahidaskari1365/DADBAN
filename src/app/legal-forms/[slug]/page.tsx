import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LEGAL_FORMS } from "@/lib/content";
import { faNum } from "@/lib/data";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";
import { templateT } from "@/lib/i18n/core";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = LEGAL_FORMS.find((x) => x.slug === slug);
  const t = await getT();
  if (!f) return { title: t("فرم یافت نشد") };
  const locale = await getServerLocale();
  const [fName, fDesc] = await Promise.all([tdyn(locale, f.name, 150), tdyn(locale, f.desc, 300)]);
  return {
    title: templateT(t)("تنظیم {name}", { name: fName }),
    description: fDesc,
    alternates: { canonical: `/legal-forms/${slug}` },
  };
}

export default async function LegalFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = LEGAL_FORMS.find((x) => x.slug === slug);
  if (!f) notFound();

  const t = await getT();
  const locale = await getServerLocale();
  const tt = templateT(t);

  // ترجمهٔ محتوای فرم (عنوان/توضیح/مدارک/مراحل) در لایهٔ صفحه
  const [fName, fDesc] = await Promise.all([tdyn(locale, f.name, 150), tdyn(locale, f.desc, 300)]);
  const docsT = await Promise.all(f.docs.map((d) => tdyn(locale, d, 120)));
  const stepsT = await Promise.all(f.steps.map((s) => tdyn(locale, s, 120)));

  return (
    <>
      <PageHero variant="market" image="/images/hero-forms.png" title={tt("تنظیم {name}", { name: fName })} desc={fDesc} breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("فرم‌های حقوقی"), href: "/legal-forms" }, { label: fName }]}>
        <div className="flex flex-wrap gap-2">
          <Button href="/consultation" variant="accent" icon="document">{t("ساخت فرم با وکیل")}</Button>
          <Link href={`/legal-forms/${slug}/draft`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-bold text-white transition-colors hover:bg-white/20"><Icon name="sparkles" className="h-4 w-4" />{t("ساخت هوشمند سند")}</Link>
          <Link href="/contracts/builder" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-bold text-white transition-colors hover:bg-white/20"><Icon name="sparkles" className="h-4 w-4" />{t("قراردادساز")}</Link>
        </div>
      </PageHero>
      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card hover={false}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Icon name="folder" className="h-5 w-5 text-primary" /> {t("مدارک موردنیاز")}</h2>
            <div className="mt-3 space-y-2">
              {docsT.map((d) => (
                <div key={d} className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground-soft">
                  <Icon name="file" className="h-4 w-4 text-primary" /> {d}
                </div>
              ))}
            </div>
          </Card>
          <Card hover={false}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Icon name="bolt" className="h-5 w-5 text-accent-text" /> {t("مراحل تنظیم")}</h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {stepsT.map((s, i) => (
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
            <h3 className="font-bold text-foreground">{t("تنظیم تخصصی")}</h3>
            <p className="mt-1 text-xs text-muted">{tt("{name} شما توسط وکیل متخصص تنظیم و بازبینی می‌شود.", { name: fName })}</p>
            <Button href="/consultation" className="mt-3 w-full" icon="user">{t("درخواست تنظیم")}</Button>
            <Button href={`/legal-forms/${slug}/draft`} variant="outline" className="mt-2 w-full" icon="sparkles">{t("ساخت هوشمند سند")}</Button>
          </Card>
          <Card hover={false} className="bg-primary-soft/50">
            <p className="flex items-start gap-2 text-xs leading-6 text-foreground-soft"><Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {t("همه‌ی اسناد توسط وکلای عضو کانون تنظیم و مطابق قوانین روز هستند.")}</p>
            <div className="mt-3"><Badge tone="success" icon="lock">{t("محرمانگی")}</Badge></div>
          </Card>
        </aside>
      </Container>
    </>
  );
}
