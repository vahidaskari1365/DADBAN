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
} from "@/lib/seo-landings";

/**
 * /lawyers/specialty/[slug] — صفحه فرود «وکیل [تخصص]».
 * محتوا + تعرفه + FAQ سئو با وکلای واقعی تأییدشده‌ی همان تخصص (فیلتر DB) ترکیب می‌شود.
 */
export const dynamic = "force-dynamic";

/**
 * حلقه لینک داخلی تخصص→مقاله (گام ۵ Hub/Spoke) — راهنمای عمیق مرتبط با هر تخصص.
 * تخصص‌های بدون مپ از پیش‌فرض عمومی استفاده می‌کنند.
 */
const SPEC_RELATED_ARTICLES: Record<string, { label: string; href: string }[]> = {
  "talaq-khanavadeh": [
    { label: "مراحل طلاق توافقی", href: "/knowledge/marahel-talaq-tavafoghi" },
    { label: "حضانت فرزند پس از جدایی", href: "/knowledge/hazant-farzand-pas-az-jodayi" },
    { label: "تکلیف قانونی مهریه", href: "/knowledge/mehrieh-taklif-ghanooni" },
    { label: "هزینه وکیل طلاق و تعرفه", href: "/knowledge/hazine-vakil-tarefe-vekalat" },
  ],
  "mahriyeh": [
    { label: "تکلیف قانونی مهریه", href: "/knowledge/mehrieh-taklif-ghanooni" },
    { label: "اجرای حکم مهریه و اعسار از محکوم‌به", href: "/knowledge/hagh-ejra-ahkam" },
    { label: "هزینه وکیل و تعرفه وکالت", href: "/knowledge/hazine-vakil-tarefe-vekalat" },
  ],
  "hezanat": [
    { label: "حضانت فرزند پس از جدایی", href: "/knowledge/hazant-farzand-pas-az-jodayi" },
    { label: "مراحل طلاق توافقی", href: "/knowledge/marahel-talaq-tavafoghi" },
  ],
  "keifari": [
    { label: "شکایت کیفری: شرایط و مراحل", href: "/knowledge/sharayet-shekat-keifari" },
    { label: "خیانت در امانت", href: "/knowledge/khiyanat-amanat-jorm" },
    { label: "شکایت کلاهبرداری", href: "/knowledge/shakayat-kolahbardari" },
    { label: "اجرای احکام مدنی", href: "/knowledge/hagh-ejra-ahkam" },
  ],
  "melki": [
    { label: "اجاره‌نامه امانی چه خطرهایی دارد؟", href: "/knowledge/aghrarname-ejare-amin" },
    { label: "اجرای احکام مدنی و توقیف اموال", href: "/knowledge/hagh-ejra-ahkam" },
  ],
  "chek": [
    { label: "چک برگشتی چگونه وصول می‌شود؟", href: "/knowledge/check-bargasht-che-konim" },
    { label: "شکایت کیفری چک: شرایط و مراحل", href: "/knowledge/sharayet-shekat-keifari" },
    { label: "اجرای حکم چک و توقیف اموال", href: "/knowledge/hagh-ejra-ahkam" },
  ],
  "ers": [
    { label: "راهنمای انحصار وراثت", href: "/knowledge/anhesar-verasat-rahnama" },
    { label: "تقسیم ارث چگونه است؟", href: "/knowledge/taghsim-ers" },
  ],
  "gharardad": [
    { label: "اجاره‌نامه امانی چه خطرهایی دارد؟", href: "/knowledge/aghrarname-ejare-amin" },
    { label: "تفاوت وکیل پایه یک و مشاور حقوقی", href: "/knowledge/tafavot-vakil-payeh-yek-moshaver" },
  ],
};

const SPEC_DEFAULT_ARTICLES = [
  { label: "تفاوت وکیل پایه یک و مشاور حقوقی", href: "/knowledge/tafavot-vakil-payeh-yek-moshaver" },
  { label: "هزینه وکیل و تعرفه وکالت ۱۴۰۵", href: "/knowledge/hazine-vakil-tarefe-vekalat" },
  { label: "مشاوره حقوقی با هوش مصنوعی", href: "/knowledge/moshaver-hoghoghi-hoosh-masnooie" },
];

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const l = getSpecialtyLanding(slug);
  if (!l) return {};
  return {
    // absolute — عنوان داده‌ای خودش برند «دادورزان» را دارد؛ قالب `%s | دادورزان` در layout ریشه
    // در غیر این صورت برند دوبار تکرار می‌شود (تشخیص stuffing در SERP).
    title: { absolute: l.title },
    description: l.description,
    keywords: l.keywords,
    alternates: {
      canonical: `/lawyers/specialty/${l.slug}`,
      types: {
        "application/rss+xml": `${SITE_URL}/knowledge/feed`,
      },
    },
    openGraph: {
      title: l.title,
      description: l.description,
      url: `${SITE_URL}/lawyers/specialty/${l.slug}`,
      type: "website",
    },
  };
}

export default async function SpecialtyLandingPage({ params }: { params: Params }) {
  const { slug } = await params;
  const landing = getSpecialtyLanding(slug);
  if (!landing) notFound();

  // وکلای واقعی تأییدشده‌ی این تخصص — حداکثر ۹ نفر بر اساس امتیاز
  let list: typeof lawyers.$inferSelect[] = [];
  let total = 0;
  try {
    const conds = [
      eq(lawyers.verified, true),
      sql`${lawyers.specialties} @> ARRAY[${landing.sp}]::text[]`,
    ];
    const [rows, totalRow] = await Promise.all([
      db.select().from(lawyers).where(and(...conds)).orderBy(desc(lawyers.rating), desc(lawyers.experienceYears)).limit(9),
      db.select({ c: count() }).from(lawyers).where(and(...conds)),
    ]);
    list = rows;
    total = totalRow[0]?.c ?? 0;
  } catch (err) {
    console.error("[dadban] specialty landing query failed:", err);
  }

  const canonical = `/lawyers/specialty/${landing.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LegalService",
        "@id": `${SITE_URL}${canonical}#service`,
        name: `${landing.h1} — ${SITE_NAME}`,
        description: landing.description,
        url: `${SITE_URL}${canonical}`,
        areaServed: { "@type": "Country", name: "ایران" },
        provider: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "دادورزان", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "جستجوی وکیل", item: `${SITE_URL}/lawyers` },
          { "@type": "ListItem", position: 3, name: landing.h1, item: `${SITE_URL}${canonical}` },
        ],
      },
      ...(list.length
        ? [{
            "@type": "ItemList",
            "@id": `${SITE_URL}${canonical}#lawyers`,
            name: `وکلای ${landing.h1}`,
            numberOfItems: list.length,
            itemListElement: list.map((lw, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: lw.name,
              url: `${SITE_URL}/lawyers/${lw.slug}`,
            })),
          }]
        : []),
    ],
  };

  return (
    <main className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />

      <PageHero
        title={landing.h1}
        badge={total > 0 ? `${total.toLocaleString("fa-IR")} وکیل تأییدشده` : "تأیید پروانه توسط دادورزان"}
        breadcrumb={[
          { label: "خانه", href: "/" },
          { label: "جستجوی وکیل", href: "/lawyers" },
          { label: landing.h1 },
        ]}
        desc={landing.introLead}
        chips={[
          { icon: "certificate", label: "پروانه احرازشده" },
          { icon: "coins", label: "تعرفه شفاف" },
          { icon: "chat", label: "مشاوره آنلاین" },
        ]}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href={`/lawyers?sp=${encodeURIComponent(landing.sp)}`} icon="search">
            مشاهده همه وکلای {landing.h1}
          </Button>
          <Button href="/case/new" variant="outline" icon="folder">ثبت پرونده {landing.h1.replace("وکیل ", "")}</Button>
        </div>
      </PageHero>

      <Container className="mt-8 space-y-8">
        {/* بلوک پاسخ خودکفا — AEO */}
        <Card hover={false} className="border-primary/25 bg-surface-2">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-foreground">
            <Icon name={landing.icon} className="h-5 w-5 text-primary" />
            {`${landing.h1} چه کاری انجام می‌دهد؟`}
          </h2>
          <p className="text-sm leading-8 text-foreground-soft">{landing.introLead}</p>
        </Card>

        {/* محتوای اصلی */}
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <section aria-label="معرفی" className="space-y-4">
            {landing.intro.map((p, i) => (
              <p key={i} className="text-sm leading-8 text-foreground-soft">{p}</p>
            ))}
          </section>
          <Card hover={false}>
            <h2 className="mb-4 text-base font-black text-foreground">خدمات وکیل {landing.h1.replace("وکیل ", "")}</h2>
            <ul className="space-y-2.5">
              {landing.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm leading-7 text-foreground-soft">
                  <Icon name="check" className="mt-1.5 h-4 w-4 shrink-0 text-primary" />
                  {h}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* وکلای واقعی */}
        <section aria-labelledby="landing-lawyers">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="landing-lawyers" className="text-lg font-black text-foreground sm:text-xl">
              وکلای {landing.h1.replace("وکیل ", "")} در دادورزان
            </h2>
            <Link href={`/lawyers?sp=${encodeURIComponent(landing.sp)}`} className="text-sm font-bold text-primary hover:underline">
              مشاهده همه ←
            </Link>
          </div>
          {list.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((lw, i) => (
                <LawyerCard key={lw.id} lawyer={lw} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="user"
              title={`همین حالا وکیل ${landing.h1.replace("وکیل ", "")} نیست`}
              desc="وکلای این تخصص به‌زودی اضافه می‌شوند. می‌توانید پرونده ثبت کنید تا وکلای متخصص پیشنهاد شوند."
              action={{ href: "/case/new", label: "ثبت پرونده و دریافت پیشنهاد وکیل" }}
            />
          )}
        </section>

        {/* تعرفه این تخصص */}
        <section aria-labelledby="landing-fees">
          <div className="mb-3 flex items-center gap-2">
            <h2 id="landing-fees" className="text-lg font-black text-foreground sm:text-xl">
              هزینه وکیل {landing.h1.replace("وکیل ", "")}
            </h2>
            <Link href="/fee-guide" className="text-sm font-bold text-primary hover:underline">
              جدول کامل تعرفه ←
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <table className="w-full text-right text-sm">
              <tbody>
                {landing.fees.map((r) => (
                  <tr key={r.label} className="border-b border-border/60 last:border-0">
                    <td className="p-3.5 leading-6 text-foreground">{r.label}</td>
                    <td className="whitespace-nowrap p-3.5 font-bold text-primary">{r.range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ + schema */}
        <FaqSection items={landing.faqs} canonicalPath={canonical} />

        {/* لینک‌های داخلی */}
        <SeoLinkGrid
          title={`${landing.h1} در شهرهای ایران`}
          links={CITY_LANDINGS.map((c) => ({
            label: c.city, // لنگر = نام شهر — کلیدواژه کامل در عنوان گرید است (ضد تکرار زنجیره‌ای)
            href: `/lawyers/specialty/${landing.slug}/${c.slug}`,
          }))}
        />
        <SeoLinkGrid
          title="تخصص‌های دیگر"
          links={SPECIALTY_LANDINGS.filter((s) => s.slug !== landing.slug).map((s) => ({
            label: s.h1.replace("وکیل ", ""),
            href: `/lawyers/specialty/${s.slug}`,
          }))}
        />

        {/* حلقه لینک تخصص→راهنمای مجله (گام ۵ Hub/Spoke) */}
        <SeoLinkGrid
          title={`راهنماهای تخصصی ${landing.h1.replace("وکیل ", "")}`}
          links={SPEC_RELATED_ARTICLES[landing.slug] ?? SPEC_DEFAULT_ARTICLES}
        />
      </Container>
    </main>
  );
}
