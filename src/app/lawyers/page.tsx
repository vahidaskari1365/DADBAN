import type { Metadata } from "next";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { and, desc, asc, eq, inArray, sql, count } from "drizzle-orm";
import { Container, Button, EmptyState, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LawyerCard } from "@/components/lawyer-card";
import { LawyerFilters } from "@/components/lawyer-filters";
import { LawyerDiscovery } from "@/components/amazon/recently-viewed";
import { StickyCta } from "@/components/amazon/sticky-cta";
import { LOCATIONS, faNum } from "@/lib/data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ sp?: string; city?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const specialty = sp.sp;
  const city = sp.city;
  const title = specialty
    ? city
      ? `وکیل ${specialty} در ${city}`
      : `وکیل ${specialty}`
    : city
      ? `وکیل در ${city}`
      : "جستجوی وکیل متخصص";
  return {
    title,
    description: `جستجو و رزرو وکیل${specialty ? ` متخصص ${specialty}` : ""}${city ? ` در شهر ${city}` : ""}. احراز هویت‌شده، با امتیاز کاربران و رزرو آنلاین مشاوره.`,
    alternates: { canonical: "/lawyers" },
  };
}

export default async function LawyersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { sp, city, gender, sort, q } = params;

  const conds = [];
  if (sp) conds.push(sql`${lawyers.specialties} @> ARRAY[${sp}]::text[]`);
  if (city) {
    // اگر پارامتر یک استان باشد، همه شهرهای آن استان جستجو می‌شود
    const prov = LOCATIONS.find((l) => l.province === city);
    if (prov) conds.push(inArray(lawyers.city, prov.cities));
    else conds.push(eq(lawyers.city, city));
  }
  if (gender) conds.push(eq(lawyers.gender, gender));
  if (q) conds.push(sql`${lawyers.name} ilike ${`%${q}%`}`);

  const order =
    sort === "experience"
      ? desc(lawyers.experienceYears)
      : sort === "cases"
        ? desc(lawyers.caseCount)
        : sort === "priceLow"
          ? asc(lawyers.priceChat)
          : sort === "reviews"
            ? desc(lawyers.reviewCount)
            : desc(lawyers.rating);

  let list: typeof lawyers.$inferSelect[] = [];
  let totalRow: { c: number }[] = [{ c: 0 }];
  try {
    [list, totalRow] = await Promise.all([
      db.select().from(lawyers).where(conds.length ? and(...conds) : undefined).orderBy(order, desc(lawyers.verified)),
      db.select({ c: count() }).from(lawyers).where(conds.length ? and(...conds) : undefined),
    ]);
  } catch (err) {
    console.error("[dadban] lawyers list query failed:", err);
  }

  const isProvince = city ? LOCATIONS.some((l) => l.province === city) : false;
  const heading = sp
    ? city
      ? `وکیل ${sp} در ${isProvince ? `استان ${city}` : city}`
      : `وکیل ${sp}`
    : city
      ? `وکیل در ${isProvince ? `استان ${city}` : city}`
      : "همه وکلا";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: `چگونه وکیل${sp ? ` ${sp}` : ""} پیدا کنم؟`, acceptedAnswer: { "@type": "Answer", text: `از صفحه جستجوی وکیل دادبان با فیلتر تخصص و شهر می‌توانید وکیل${sp ? ` ${sp}` : ""} مناسب پیدا و مشاوره رزرو کنید.` } },
      { "@type": "Question", name: "آیا وکلای دادبان احراز هویت شده‌اند؟", acceptedAnswer: { "@type": "Answer", text: "بله، هویت و پروانه همه وکلا توسط کارشناسان دادبان راستی‌آزمایی می‌شود." } },
    ],
  };

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-surface-2/60 to-background py-8">
        <Container>
          <nav className="flex items-center gap-1.5 text-xs text-muted">
            <Link href="/" className="hover:text-primary">خانه</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <span className="text-foreground-soft">وکیل‌یابی</span>
          </nav>
          <h1 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">{heading}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            از میان وکلای پایه یک دادگستری، تأییدشده و متخصص انتخاب کنید؛ با فیلتر تخصص، شهر، سابقه و امتیاز.
          </p>
        </Container>
      </section>

      <Container className="py-8">
        <div className="sticky top-16 z-30 mb-6">
          <LawyerFilters initial={{ q, sp, city, gender, sort }} total={totalRow[0]?.c ?? 0} />
        </div>

        {list.length === 0 ? (
          <EmptyState
            title="وکیلی با این فیلترها یافت نشد"
            desc="فیلترها را تغییر دهید یا همه وکلا را مشاهده کنید."
            icon="search"
          />
        ) : (
          <div className="pin-columns">
            {list.map((l, i) => (
              <LawyerCard key={l.id} lawyer={l} index={i} priority={i === 0} className="pin-item" />
            ))}
          </div>
        )}

        {/* بازدیدهای اخیر + پیشنهاد برای شما (شخصی‌سازی، سبک آمازون) */}
        <div className="mt-10">
          <LawyerDiscovery />
        </div>
      </Container>

      {/* CTA چسبان موبایل — همیشه یک اقدام بعدی در دسترس */}
      <StickyCta
        href="/case/new"
        label="پرونده‌ات را ثبت کن"
        sub="ارزیابی اولیه • محرمانگی کامل • بدون هزینه اولیه"
      />

      <Container className="py-12">
        <div className="rounded-3xl border border-border bg-surface p-8 text-center card-shadow">
          <h2 className="text-xl font-bold text-foreground">وکیل مناسب خود را پیدا نکردید؟</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
            پرونده خود را ثبت کنید تا سیستم آن را به وکلای مرتبط معرفی کند.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button href="/case/new" icon="folder">ثبت پرونده</Button>
            <Button href="/consultation" variant="outline" icon="calendar">رزرو مشاوره</Button>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Badge tone="neutral">{faNum(totalRow[0]?.c ?? 0)} وکیل فعال</Badge>
            <Badge tone="success" icon="badge">احراز هویت‌شده</Badge>
            <Badge tone="accent">رزرو آنلاین</Badge>
          </div>
        </div>
      </Container>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
