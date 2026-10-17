import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { and, desc, eq, sql, count } from "drizzle-orm";
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
  getSpecialtyLanding,
  getCityLanding,
  comboLanding,
} from "@/lib/seo-landings";

/**
 * /lawyers/specialty/[slug]/[city] — صفحه فرود ترکیبی «وکیل [تخصص] در [شهر]».
 * محتوا از داده‌های تخصص + شهر ساخته می‌شود و وکلای واقعی همان تخصص/شهر نمایش داده می‌شوند.
 * ۱۲ تخصص × ۱۵ شهر = ۱۸۰ صفحه هدف برای long-tail.
 */
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string; city: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, city } = await params;
  const sp = getSpecialtyLanding(slug);
  const c = getCityLanding(city);
  if (!sp || !c) return {};
  const title = `${sp.h1} در ${c.city} | تعرفه شفاف و رزرو آنلاین — دادورزان`;
  return {
    title,
    description: `جستجوی ${sp.h1} در ${c.city}: وکلای احراز هویت‌شده با امتیاز واقعی، تعرفه شفاف ۱۴۰۵، مشاوره متنی و صوتی و تصویری و ثبت پرونده آنلاین در دادورزان.`,
    keywords: [
      `${sp.h1} در ${c.city}`, `وکیل ${sp.sp} ${c.city}`,
      `بهترین ${sp.h1} ${c.city}`, `هزینه ${sp.h1} در ${c.city}`,
    ],
    alternates: { canonical: `/lawyers/specialty/${sp.slug}/${c.slug}` },
    openGraph: { title, description: sp.description, url: `${SITE_URL}/lawyers/specialty/${sp.slug}/${c.slug}`, type: "website" },
  };
}

export default async function SpecialtyCityPage({ params }: { params: Params }) {
  const { slug, city } = await params;
  const sp = getSpecialtyLanding(slug);
  const c = getCityLanding(city);
  if (!sp || !c) notFound();

  const cb = comboLanding(sp, c);

  let list: typeof lawyers.$inferSelect[] = [];
  let total = 0;
  try {
    const conds = [
      eq(lawyers.verified, true),
      sql`${lawyers.specialties} @> ARRAY[${sp.sp}]::text[]`,
      eq(lawyers.city, c.city),
    ];
    const [rows, totalRow] = await Promise.all([
      db.select().from(lawyers).where(and(...conds)).orderBy(desc(lawyers.rating), desc(lawyers.experienceYears)).limit(9),
      db.select({ c: count() }).from(lawyers).where(and(...conds)),
    ]);
    list = rows;
    total = totalRow[0]?.c ?? 0;
  } catch (err) {
    console.error("[dadban] combo landing query failed:", err);
  }

  const canonical = `/lawyers/specialty/${sp.slug}/${c.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LegalService",
        "@id": `${SITE_URL}${canonical}#service`,
        name: `${cb.h1} — ${SITE_NAME}`,
        description: cb.description,
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
          { "@type": "ListItem", position: 3, name: sp.h1, item: `${SITE_URL}/lawyers/specialty/${sp.slug}` },
          { "@type": "ListItem", position: 4, name: c.city, item: `${SITE_URL}${canonical}` },
        ],
      },
    ],
  };

  return (
    <main className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />

      <PageHero
        title={cb.h1}
        badge={total > 0 ? `${total.toLocaleString("fa-IR")} وکیل فعال در ${c.city}` : `خدمات ${sp.h1.replace("وکیل ", "")} در ${c.city}`}
        breadcrumb={[
          { label: "خانه", href: "/" },
          { label: "جستجوی وکیل", href: "/lawyers" },
          { label: sp.h1, href: `/lawyers/specialty/${sp.slug}` },
          { label: c.city },
        ]}
        desc={cb.introLead}
        chips={[
          { icon: "location", label: `استان ${c.province}` },
          { icon: "certificate", label: "پروانه احرازشده" },
          { icon: "coins", label: "تعرفه شفاف" },
        ]}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href={`/lawyers?sp=${encodeURIComponent(sp.sp)}&city=${encodeURIComponent(c.city)}`} icon="search">
            جستجوی پیشرفته در {c.city}
          </Button>
          <Button href="/case/new" variant="outline" icon="folder">ثبت پرونده در {c.city}</Button>
        </div>
      </PageHero>

      <Container className="mt-8 space-y-8">
        <Card hover={false} className="border-primary/25 bg-surface-2">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-foreground">
            <Icon name={sp.icon} className="h-5 w-5 text-primary" />
            {`${cb.h1} چه کاری انجام می‌دهد؟`}
          </h2>
          <p className="text-sm leading-8 text-foreground-soft">{cb.introLead}</p>
        </Card>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <section aria-label="معرفی" className="space-y-4">
            {sp.intro.map((p, i) => (
              <p key={i} className="text-sm leading-8 text-foreground-soft">{p}</p>
            ))}
            {c.intro.map((p, i) => (
              <p key={`c${i}`} className="text-sm leading-8 text-foreground-soft">{p}</p>
            ))}
          </section>
          <Card hover={false}>
            <h2 className="mb-4 text-base font-black text-foreground">خدمات در {c.city}</h2>
            <ul className="space-y-2.5">
              {sp.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm leading-7 text-foreground-soft">
                  <Icon name="check" className="mt-1.5 h-4 w-4 shrink-0 text-primary" />
                  {h}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <section aria-labelledby="combo-lawyers">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="combo-lawyers" className="text-lg font-black text-foreground sm:text-xl">
              وکلای {sp.h1.replace("وکیل ", "")} در {c.city}
            </h2>
            <Link href={`/lawyers?sp=${encodeURIComponent(sp.sp)}&city=${encodeURIComponent(c.city)}`} className="text-sm font-bold text-primary hover:underline">
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
              title={`همین حالا ${cb.h1} در دادورزان نیست`}
              desc={`وکلای ${c.city} این تخصص به‌زودی اضافه می‌شوند؛ با مشاوره آنلاین وکلای سایر شهرها هم می‌توانید پرونده خود را پیش ببرید.`}
              action={{ href: "/consultation", label: "مشاوره آنلاین فوری" }}
            />
          )}
        </section>

        <section aria-labelledby="combo-fees">
          <div className="mb-3 flex items-center gap-2">
            <h2 id="combo-fees" className="text-lg font-black text-foreground sm:text-xl">
              هزینه {sp.h1} در {c.city}
            </h2>
            <Link href="/fee-guide" className="text-sm font-bold text-primary hover:underline">
              جدول کامل تعرفه ←
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <table className="w-full text-right text-sm">
              <tbody>
                {sp.fees.map((r) => (
                  <tr key={r.label} className="border-b border-border/60 last:border-0">
                    <td className="p-3.5 leading-6 text-foreground">{r.label}</td>
                    <td className="whitespace-nowrap p-3.5 font-bold text-primary">{r.range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <FaqSection items={cb.faqs} canonicalPath={canonical} />

        <SeoLinkGrid
          title={`${sp.h1} در سایر شهرها`}
          links={CITY_LANDINGS.filter((x) => x.slug !== c.slug).map((x) => ({
            label: `${sp.h1} در ${x.city}`,
            href: `/lawyers/specialty/${sp.slug}/${x.slug}`,
          }))}
        />
        <SeoLinkGrid
          title={`سایر تخصص‌ها در ${c.city}`}
          links={SPECIALTY_LANDINGS.filter((x) => x.slug !== sp.slug).map((x) => ({
            label: `${x.h1} در ${c.city}`,
            href: `/lawyers/specialty/${x.slug}/${c.slug}`,
          }))}
        />
      </Container>
    </main>
  );
}
