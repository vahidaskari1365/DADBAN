import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { Container, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { JUDGMENTS } from "@/lib/content";

export const metadata: Metadata = {
  title: "آرای قضایی",
  description: "مرور رویه قضایی و آرای قابل انتشار در موضوعات خانواده، ملک، کیفری، تجارت و کار.",
  alternates: { canonical: "/judgments" },
};

export default function JudgmentsPage() {
  return (
    <>
      <PageHero
        badge="آرای قضایی"
        title="رویه قضایی و آرای قابل انتشار"
        desc="آرای دیوان عالی کشور و سایر مراجع در موضوعات مختلف، برای آشنایی با رویه‌ی قضایی."
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "آرای قضایی" }]}
      />
      <Container className="py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {JUDGMENTS.map((j, i) => (
            <Reveal key={j.slug} delay={(i % 6) * 40}>
              <Link href={`/judgments/${j.slug}`} className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name="gavel" className="h-5 w-5" /></span>
                  <Badge tone="accent">{j.subject}</Badge>
                </div>
                <h2 className="mt-3 text-sm font-bold leading-6 text-foreground">{j.title}</h2>
                <p className="mt-1 flex-1 text-xs leading-6 text-muted">{j.summary}</p>
                <p className="mt-3 text-[11px] text-muted">{j.court} • {j.date}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </>
  );
}
