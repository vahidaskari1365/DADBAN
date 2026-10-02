import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { FAQ_ITEMS } from "@/lib/content";

export const metadata: Metadata = {
  title: "پشتیبانی و مرکز راهنما",
  description: "مرکز راهنما، سؤالات متداول و ثبت تیکت پشتیبانی دادبان.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <PageHero
        badge="پشتیبانی"
        title="چگونه می‌توانیم کمکتان کنیم؟"
        desc="مرکز راهنما، سؤالات متداول و ثبت تیکت؛ تیم پشتیبانی دادبان ۲۴ ساعته در خدمت شماست."
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "پشتیبانی" }]}
      >
        <div className="flex flex-wrap gap-2">
          <Button href="/contact" icon="mail">ثبت تیکت</Button>
          <Button href="/consultation" variant="outline" icon="chat">گفتگوی آنلاین</Button>
        </div>
      </PageHero>

      <Container className="py-12">
        <h2 className="text-xl font-bold text-foreground">سؤالات متداول</h2>
        <div className="mt-5 space-y-3">
          {FAQ_ITEMS.map((f, i) => (
            <Reveal key={f.q} delay={i * 30}>
              <details className="group rounded-2xl border border-border bg-surface p-4 [&_summary]:cursor-pointer">
                <summary className="flex items-center justify-between gap-3 text-sm font-bold text-foreground marker:content-['']">
                  <span className="flex items-center gap-2"><Icon name="chat" className="h-4 w-4 text-primary" /> {f.q}</span>
                  <Icon name="chevron" className="h-4 w-4 rotate-180 text-muted transition-transform group-open:rotate-0" />
                </summary>
                <p className="mt-3 border-t border-border pt-3 text-sm leading-7 text-muted">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </Container>

      <Container className="py-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "مرکز راهنما", desc: "آموزش استفاده از امکانات سایت.", icon: "book" as const, href: "/knowledge" },
            { title: "ثبت تیکت", desc: "مشکل خود را ثبت کنید.", icon: "mail" as const, href: "/contact" },
            { title: "گفتگوی آنلاین", desc: "مشاوره فوری دریافت کنید.", icon: "chat" as const, href: "/consultation" },
          ].map((c) => (
            <a key={c.title} href={c.href}>
              <Card className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon name={c.icon} className="h-5 w-5" /></span>
                <div><p className="text-sm font-bold text-foreground">{c.title}</p><p className="text-xs text-muted">{c.desc}</p></div>
              </Card>
            </a>
          ))}
        </div>
      </Container>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
