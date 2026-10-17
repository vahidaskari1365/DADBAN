import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { and, desc, eq, count } from "drizzle-orm";
import { Container, Button, Card, EmptyState } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { LawyerCard } from "@/components/lawyer-card";
import { FaqSection } from "@/components/seo/faq-section";
import { SeoLinkGrid } from "@/components/seo/link-grid";
import { safeJsonLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";
import { SITE_NAME } from "@/lib/brand";
import {
  SPECIALTY_LANDINGS,
  CITY_LANDINGS,
  getCityLanding,
} from "@/lib/seo-landings";

/**
 * /lawyers/city/[city] — صفحه فرود «وکیل در [شهر]».
 * وکلای واقعی شهر + تخصص‌های قابل انتخاب + FAQ شهر.
 */
export const dynamic = "force-dynamic";

type Params = Promise<{ city: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city } = await params;
  const c = getCityLanding(city);
  if (!c) return {};
  const title = `وکیل در ${c.city} | بهترین وکلای ${c.city} با تعرفه شفاف — دادورزان`;
  const description = `جستجوی وکیل در ${c.city} و استان ${c.province}: وکلای احراز هویت‌شده خانواده، کیفری، ملکی، چک و سایر تخصص‌ها با امتیاز واقعی کاربران، تعرفه شفاف ۱۴۰۵ و مشاوره آنلاین در دادورزان.`;
  return {
    title,
    description,
    keywords: [
      `وکیل در ${c.city}`, `بهترین وکیل ${c.city}`, `وکیل ${c.city}`,
      `مشاوره حقوقی ${c.city}`, `هزینه وکیل در ${c.city}`,
    ],
    alternates: { canonical: `/lawyers/city/${c.slug}` },
    openGraph: { title, description, url: `${SITE_URL}/lawyers/city/${c.slug}`, type: "website" },
  };
}

export default async function CityLandingPage({ params }: { params: Params }) {
  const { city } = await params;
  const c = getCityLanding(city);
  if (!c) notFound();

  let list: typeof lawyers.$inferSelect[] = [];
  let total = 0;
  try {
    const conds = [eq(lawyers.verified, true), eq(lawyers.city, c.city)];
    const [rows, totalRow] = await Promise.all([
      db.select().from(lawyers).where(and(...conds)).orderBy(desc(lawyers.rating), desc(lawyers.experienceYears)).limit(12),
      db.select({ c: count() }).from(lawyers).where(and(...conds)),
    ]);
    list = rows;
    total = totalRow[0]?.c ?? 0;
  } catch (err) {
    console.error("[dadban] city landing query failed:", err);
  }

  const canonical = `/lawyers/city/${c.slug}`;
  const h1 = `وکیل در ${c.city}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LegalService",
        "@id": `${SITE_URL}${canonical}#service`,
        name: `${h1} — ${SITE_NAME}`,
        description: `وکیل‌یابی آنلاین در ${c.city}: وکلای تأییدشده با تعرفه شفاف و مشاوره متنی و صوتی و تصویری.`,
        url: `${SITE_URL}${canonical}`,
        areaServed: { "@type": "City", name: c.city },
        address: {
          "@type": "PostalAddress",
          addressLocality: c.city,
          addressRegion: c.province,
          addressCountry: "IR",
        },
        provider: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "دادورزان", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "جستجوی وکیل", item: `${SITE_URL}/lawyers` },
          { "@type": "ListItem", position: 3, name: c.city, item: `${SITE_URL}${canonical}` },
        ],
      },
    ],
  };

  return (
    <main className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />

      <PageHero
        title={h1}
        badge={total > 0 ? `${total.toLocaleString("fa-IR")} وکیل تأییدشده` : `استان ${c.province}`}
        breadcrumb={[
          { label: "خانه", href: "/" },
          { label: "جستجوی وکیل", href: "/lawyers" },
          { label: c.city },
        ]}
        desc={c.introLead}
        chips={[
          { icon: "location", label: `استان ${c.province}` },
          { icon: "certificate", label: "پروانه احرازشده" },
          { icon: "star", label: "امتیاز واقعی موکلان" },
        ]}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href={`/lawyers?city=${encodeURIComponent(c.city)}`} icon="search">
            جستجوی پیشرفته وکلای {c.city}
          </Button>
          <Button href="/consultation" variant="outline" icon="chat">مشاوره آنلاین</Button>
        </div>
      </PageHero>

      <Container className="mt-8 space-y-8">
        <Card hover={false} className="border-primary/25 bg-surface-2">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-foreground">
            <Icon name="location" className="h-5 w-5 text-primary" />
            {`چطور وکیل خوب در ${c.city} پیدا کنیم؟`}
          </h2>
          <p className="text-sm leading-8 text-foreground-soft">{c.introLead}</p>
        </Card>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <section aria-label="معرفی" className="space-y-4">
            {c.intro.map((p, i) => (
              <p key={i} className="text-sm leading-8 text-foreground-soft">{p}</p>
            ))}
          </section>
          <Card hover={false}>
            <h2 className="mb-4 text-base font-black text-foreground">تخصص‌های موجود در {c.city}</h2>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_LANDINGS.map((s) => (
                <Link
                  key={s.slug}
                  href={`/lawyers/specialty/${s.slug}/${c.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-bold text-foreground-soft transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <Icon name={s.icon} className="h-3.5 w-3.5" />
                  {s.h1.replace("وکیل ", "")}
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <section aria-labelledby="city-lawyers">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="city-lawyers" className="text-lg font-black text-foreground sm:text-xl">
              وکلای {c.city} در دادورزان
            </h2>
            <Link href={`/lawyers?city=${encodeURIComponent(c.city)}`} className="text-sm font-bold text-primary hover:underline">
              مشاهده همه ←
            </Link>
          </div>
          {list.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((lw, i) => (
                <LawyerCard key={lw.id} lawyer={lw} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="user"
              title={`همین حالا وکیل فعال در ${c.city} نیست`}
              desc="وکلای این شهر به‌زودی اضافه می‌شوند؛ در همین حین می‌توانید از مشاوره آنلاین وکلای سایر شهرها استفاده کنید."
              action={{ href: "/consultation", label: "مشاوره آنلاین فوری" }}
            />
          )}
        </section>

        <FaqSection items={c.faqs} canonicalPath={canonical} />

        <SeoLinkGrid
          title={`تخصص‌های حقوقی در ${c.city}`}
          links={SPECIALTY_LANDINGS.map((s) => ({
            label: `${s.h1} در ${c.city}`,
            href: `/lawyers/specialty/${s.slug}/${c.slug}`,
          }))}
        />
        <SeoLinkGrid
          title="سایر شهرها"
          links={CITY_LANDINGS.filter((x) => x.slug !== c.slug).map((x) => ({
            label: `وکیل در ${x.city}`,
            href: `/lawyers/city/${x.slug}`,
          }))}
        />
      </Container>
    </main>
  );
}
