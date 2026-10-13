import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { getLegalForms } from "@/lib/content-store";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";

export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("فرم‌های حقوقی"),
    description: t("فرم‌های آماده‌ی حقوقی: دادخواست، شکواییه، اظهارنامه، لایحه، درخواست و توافق‌نامه با مدارک و مراحل."),
    alternates: { canonical: "/legal-forms" },
  };
}

export default async function LegalFormsPage() {
  const t = await getT();
  const locale = await getServerLocale();
  // منبع: دیتابیس (ویرایش ادمین) با fallback تحریریه؛ سپس ترجمهٔ عنوان/توضیح هر فرم
  const formsT = await Promise.all(
    (await getLegalForms()).map(async (f) => ({ ...f, name: await tdyn(locale, f.name, 150), desc: await tdyn(locale, f.desc, 300) })),
  );

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-forms.png"
        badge={t("فرم‌های حقوقی")}
        title={t("فرم‌های حقوقی آماده، گام‌به‌گام")}
        desc={t("از دادخواست و شکواییه تا اظهارنامه و لایحه؛ فرم را مرحله‌به‌مرحله پر کنید و سند نهایی را دریافت نمایید.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("فرم‌های حقوقی") }]}
      />
      <Container className="py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {formsT.map((f, i) => (
            <Reveal key={f.slug} delay={(i % 6) * 40}>
              <Link href={`/legal-forms/${f.slug}`} className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name={f.icon} className="h-5 w-5" /></span>
                <h2 className="mt-3 text-base font-bold text-foreground">{f.name}</h2>
                <p className="mt-1 flex-1 text-xs leading-6 text-muted">{f.desc}</p>
                <span className="mt-3 text-xs font-semibold text-primary">{t("ساخت فرم ←")}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </>
  );
}
