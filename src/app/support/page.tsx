import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { FAQ_ITEMS } from "@/lib/content";
import { getT } from "@/lib/i18n/server";

/** چندزبانه: تیتر/توضیح با generateMetadata و getT به زبان انتخابی کاربر می‌رود */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("پشتیبانی و مرکز راهنما"),
    description: t("مرکز راهنما، سؤالات متداول و ثبت تیکت پشتیبانی دادورزان."),
    alternates: { canonical: "/support" },
  };
}

export default async function SupportPage() {
  const t = await getT();
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
        variant="market"
        image="/images/hero-support.png"
        badge={t("پشتیبانی")}
        title={t("چگونه می‌توانیم کمکتان کنیم؟")}
        desc={t("مرکز راهنما، سؤالات متداول و ثبت تیکت؛ تیم پشتیبانی دادورزان ۲۴ ساعته در خدمت شماست.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پشتیبانی") }]}
      >
        <div className="flex flex-wrap gap-2">
          <Button href="/contact" variant="accent" icon="mail">{t("ثبت تیکت")}</Button>
          <Link href="/consultation" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-bold text-white transition-colors hover:bg-white/20"><Icon name="chat" className="h-4 w-4" />{t("گفتگوی آنلاین")}</Link>
        </div>
      </PageHero>

      <Container className="py-12">
        <h2 className="text-xl font-bold text-foreground">{t("سؤالات متداول")}</h2>
        <div className="mt-5 space-y-3">
          {FAQ_ITEMS.map((f, i) => (
            <Reveal key={f.q} delay={i * 30}>
              <details className="group rounded-2xl border border-border bg-surface p-4 [&_summary]:cursor-pointer">
                <summary className="flex items-center justify-between gap-3 text-sm font-bold text-foreground marker:content-['']">
                  <span className="flex items-center gap-2"><Icon name="chat" className="h-4 w-4 text-primary" /> {t(f.q)}</span>
                  <Icon name="chevron" className="h-4 w-4 rotate-180 text-muted transition-transform group-open:rotate-0" />
                </summary>
                <p className="mt-3 border-t border-border pt-3 text-sm leading-7 text-muted">{t(f.a)}</p>
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
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-text"><Icon name={c.icon} className="h-5 w-5" /></span>
                <div><p className="text-sm font-bold text-foreground">{t(c.title)}</p><p className="text-xs text-muted">{t(c.desc)}</p></div>
              </Card>
            </a>
          ))}
        </div>
      </Container>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
