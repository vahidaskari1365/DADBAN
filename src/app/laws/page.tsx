import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { Container, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { LAWS } from "@/lib/content";

export const metadata: Metadata = {
  title: "مرکز قوانین",
  description: "جستجو و مطالعه‌ی قوانین ایران: قانون مدنی، حمایت خانواده، تجارت، مجازات اسلامی، کار و آیین‌های دادرسی.",
  alternates: { canonical: "/laws" },
};

export default function LawsPage() {
  return (
    <>
      <PageHero
        badge="مرکز قوانین"
        title="قوانین و مقررات، در دسترس شما"
        desc="مهم‌ترین قوانین کشور را جستجو و مطالعه کنید؛ همراه با موضوعات مرتبط و خلاصه‌ی کاربردی."
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "قوانین" }]}
      />
      <Container className="py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LAWS.map((l, i) => (
            <Reveal key={l.slug} delay={(i % 6) * 40}>
              <Link href={`/laws/${l.slug}`} className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name="landmark" className="h-5 w-5" /></span>
                  <Badge tone={l.status === "معتبر" ? "success" : "accent"}>{l.status}</Badge>
                </div>
                <h2 className="mt-3 text-base font-bold text-foreground">{l.name}</h2>
                <p className="mt-1 flex-1 text-xs leading-6 text-muted">{l.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {l.subjects.slice(0, 3).map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}
                </div>
                <p className="mt-3 text-[11px] text-muted">تصویب {l.year} • {l.authority}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </>
  );
}
