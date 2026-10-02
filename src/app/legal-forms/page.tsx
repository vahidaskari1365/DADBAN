import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { LEGAL_FORMS } from "@/lib/content";

export const metadata: Metadata = {
  title: "فرم‌های حقوقی",
  description: "فرم‌های آماده‌ی حقوقی: دادخواست، شکواییه، اظهارنامه، لایحه، درخواست و توافق‌نامه با مدارک و مراحل.",
  alternates: { canonical: "/legal-forms" },
};

export default function LegalFormsPage() {
  return (
    <>
      <PageHero
        badge="فرم‌های حقوقی"
        title="فرم‌های حقوقی آماده، گام‌به‌گام"
        desc="از دادخواست و شکواییه تا اظهارنامه و لایحه؛ فرم را مرحله‌به‌مرحله پر کنید و سند نهایی را دریافت نمایید."
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "فرم‌های حقوقی" }]}
      />
      <Container className="py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LEGAL_FORMS.map((f, i) => (
            <Reveal key={f.slug} delay={(i % 6) * 40}>
              <Link href={`/legal-forms/${f.slug}`} className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name={f.icon} className="h-5 w-5" /></span>
                <h2 className="mt-3 text-base font-bold text-foreground">{f.name}</h2>
                <p className="mt-1 flex-1 text-xs leading-6 text-muted">{f.desc}</p>
                <span className="mt-3 text-xs font-semibold text-primary">ساخت فرم ←</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </>
  );
}
