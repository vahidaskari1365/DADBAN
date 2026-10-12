import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { Container, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { TRUST_PAGES } from "@/lib/content";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "قوانین، حریم خصوصی و شفافیت",
  description:
    "قوانین استفاده، حریم خصوصی، سیاست بازگشت وجه، قوانین وکلا، امنیت و شفافیت پلتفرم دادورزان.",
  alternates: { canonical: "/legal" },
};

export default async function LegalIndexPage() {
  const t = await getT();
  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-legal.png"
        badge={t("قوانین")}
        title={t("قوانین، حریم خصوصی و شفافیت")}
        desc={t("همه‌ی قوانین و سیاست‌های دادورزان در یک نگاه — شفاف، خوانا و قابل استناد.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("قوانین") }]}
      />
      <Container className="py-12">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          {TRUST_PAGES.map((p) => (
            <Link key={p.slug} href={`/legal/${p.slug}`} className="group">
              <Card className="h-full transition-all group-hover:border-primary/40">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon name="balance" className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-foreground group-hover:text-primary">{t(p.title)}</h2>
                    <p className="mt-1.5 text-xs leading-6 text-muted">{t(p.desc)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}
