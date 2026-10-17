import type { Metadata } from "next";
import Link from "next/link";
import { Container, Button, Card } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { SeoLinkGrid } from "@/components/seo/link-grid";
import { safeJsonLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";
import { SPECIALTY_LANDINGS, CITY_LANDINGS } from "@/lib/seo-landings";

/** /lawyers/specialty — هاب تخصص‌های وکالت (نقطه ورود long-tail). */
export const metadata: Metadata = {
  title: "تخصص‌های وکالت | وکیل متخصص هر حوزه حقوقی — دادورزان",
  description:
    "فهرست کامل تخصص‌های وکالت: وکیل طلاق و خانواده، کیفری، ملکی، چک برگشتی، ارث، قرارداد، کار، مالیاتی، ثبت شرکت و برند. هر تخصص با وکلای تأییدشده، تعرفه شفاف و سوالات متداول.",
  alternates: { canonical: "/lawyers/specialty" },
};

export default function SpecialtyHubPage() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/lawyers/specialty#page`,
        name: "تخصص‌های وکالت",
        url: `${SITE_URL}/lawyers/specialty`,
        inLanguage: "fa-IR",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "دادورزان", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "جستجوی وکیل", item: `${SITE_URL}/lawyers` },
          { "@type": "ListItem", position: 3, name: "تخصص‌ها", item: `${SITE_URL}/lawyers/specialty` },
        ],
      },
    ],
  };

  return (
    <main className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />

      <PageHero
        title="تخصص‌های وکالت"
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "جستجوی وکیل", href: "/lawyers" }, { label: "تخصص‌ها" }]}
        desc="برای هر دعوا، وکیل متخصص همان حوزه را انتخاب کنید — هر تخصص با وکلای تأییدشده، جدول هزینه و پرسش‌های متداول."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/fee-guide" variant="outline" icon="coins">جدول تعرفه وکالت ۱۴۰۵</Button>
        </div>
      </PageHero>

      <Container className="mt-8 space-y-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIALTY_LANDINGS.map((s) => (
            <Card key={s.slug} className="flex flex-col">
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Icon name={s.icon} className="h-5.5 w-5.5" />
              </span>
              <h2 className="text-base font-black text-foreground">
                <Link href={`/lawyers/specialty/${s.slug}`} className="hover:text-primary transition-colors">
                  {s.h1}
                </Link>
              </h2>
              <p className="mt-2 line-clamp-3 flex-1 text-xs leading-6 text-muted">{s.introLead}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
                <Link href={`/lawyers?sp=${encodeURIComponent(s.sp)}`} className="font-bold text-primary hover:underline">
                  وکلای فعال
                </Link>
                <span className="text-muted">•</span>
                <Link href="/fee-guide" className="text-foreground-soft hover:text-primary">هزینه‌ها</Link>
              </div>
            </Card>
          ))}
        </div>

        <SeoLinkGrid
          title="وکیل در شهرهای ایران"
          links={CITY_LANDINGS.map((c) => ({ label: `وکیل در ${c.city}`, href: `/lawyers/city/${c.slug}` }))}
        />
      </Container>
    </main>
  );
}
