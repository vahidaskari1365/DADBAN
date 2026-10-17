import type { Metadata } from "next";
import Link from "next/link";
import { Container, Button, Card } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { SeoLinkGrid } from "@/components/seo/link-grid";
import { safeJsonLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";
import { SPECIALTY_LANDINGS, CITY_LANDINGS } from "@/lib/seo-landings";

/** /lawyers/city — هاب شهرها («وکیل در [شهر]») — فاز اول ۱۵ شهر. */
export const metadata: Metadata = {
  title: "وکیل در شهرهای ایران | وکیل‌یابی آنلاین — دادورزان",
  description:
    "وکیل در تهران، کرج، مشهد، اصفهان، شیراز و سایر شهرهای ایران: وکلای احراز هویت‌شده با امتیاز واقعی کاربران، تعرفه شفاف ۱۴۰۵ و مشاوره آنلاین در دادورزان.",
  alternates: { canonical: "/lawyers/city" },
};

export default function CityHubPage() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/lawyers/city#page`,
        name: "وکیل در شهرهای ایران",
        url: `${SITE_URL}/lawyers/city`,
        inLanguage: "fa-IR",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "دادورزان", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "جستجوی وکیل", item: `${SITE_URL}/lawyers` },
          { "@type": "ListItem", position: 3, name: "شهرها", item: `${SITE_URL}/lawyers/city` },
        ],
      },
    ],
  };

  return (
    <main className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />

      <PageHero
        title="وکیل در شهرهای ایران"
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "جستجوی وکیل", href: "/lawyers" }, { label: "شهرها" }]}
        desc="شهر خود را انتخاب کنید و وکلای تأییدشده همان شهر را بر اساس تخصص، امتیاز و تعرفه مقایسه کنید."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/lawyers" icon="search">جستجوی پیشرفته وکلا</Button>
        </div>
      </PageHero>

      <Container className="mt-8 space-y-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CITY_LANDINGS.map((c) => (
            <Card key={c.slug} className="flex flex-col">
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Icon name="location" className="h-5.5 w-5.5" />
              </span>
              <h2 className="text-base font-black text-foreground">
                <Link href={`/lawyers/city/${c.slug}`} className="hover:text-primary transition-colors">
                  وکیل در {c.city}
                </Link>
              </h2>
              <p className="mt-1 text-xs text-muted">استان {c.province}</p>
              <p className="mt-2 line-clamp-3 flex-1 text-xs leading-6 text-muted">
                وکلای احراز هویت‌شده {c.city} با امتیاز واقعی موکلان، تعرفه شفاف و مشاوره متنی و صوتی و تصویری.
              </p>
            </Card>
          ))}
        </div>

        <SeoLinkGrid
          title="تخصص‌های وکالت"
          links={SPECIALTY_LANDINGS.map((s) => ({ label: s.h1, href: `/lawyers/specialty/${s.slug}` }))}
        />
      </Container>
    </main>
  );
}
