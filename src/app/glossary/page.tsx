import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { GLOSSARY } from "@/lib/content";

export const metadata: Metadata = {
  title: "واژه‌نامه حقوقی",
  description: "تعریف ساده و تخصصی اصطلاحات حقوقی مانند اعسار، واخواهی، تجدیدنظر، خیانت در امانت و... با مثال و قوانین مرتبط.",
  alternates: { canonical: "/glossary" },
};

export default function GlossaryPage() {
  const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term, "fa"));
  return (
    <>
      <PageHero
        badge="واژه‌نامه حقوقی"
        title="اصطلاحات حقوقی، به زبان ساده"
        desc="تعریف ساده و تخصصی اصطلاحات حقوقی همراه با مثال و قوانین مرتبط؛ مرجعی برای دانش حقوقی شما."
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "واژه‌نامه حقوقی" }]}
      />
      <Container className="py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((t, i) => (
            <Reveal key={t.slug} delay={(i % 6) * 40}>
              <Link
                href={`/glossary/${t.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">{t.term}</h2>
                  <Icon name="book" className="h-4 w-4 text-accent" />
                </div>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted">{t.simple}</p>
                <span className="mt-3 text-xs font-semibold text-primary">مشاهده تعریف کامل ←</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </>
  );
}
