import type { Metadata } from "next";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { and, desc, asc, eq, sql, count } from "drizzle-orm";
import { Container, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LawyerCard } from "@/components/lawyer-card";
import { LawyerFilters } from "@/components/lawyer-filters";
import { SPECIALTIES, ALL_CITIES, ALL_PROVINCES, faNum } from "@/lib/data";
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
  if (city) conds.push(eq(lawyers.city, city));
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
    console.error("[dadpayo] lawyers list query failed:", err);
  }

  const heading = sp ? (city ? `وکیل ${sp} در ${city}` : `وکیل ${sp}`) : city ? `وکیل در ${city}` : "وکیل‌یابی";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: `چگونه وکیل${sp ? ` ${sp}` : ""} پیدا کنم؟`, acceptedAnswer: { "@type": "Answer", text: `از صفحه جستجوی وکیل دادپیو با فیلتر تخصص و شهر می‌توانید وکیل${sp ? ` ${sp}` : ""} مناسب پیدا و مشاوره رزرو کنید.` } },
      { "@type": "Question", name: "آیا وکلای دادپیو احراز هویت شده‌اند؟", acceptedAnswer: { "@type": "Answer", text: "بله، هویت و پروانه همه وکلا توسط کارشناسان دادپیو راستی‌آزمایی می‌شود." } },
    ],
  };

  return (
    <>
      {/* هدر سرمه‌ای — مطابق هویت دادپیو */}
      <section style={{ background: "linear-gradient(150deg, #101b35 0%, #17264a 60%, #0b1328 100%)" }}>
        <Container className="py-8 sm:py-10">
          <nav className="flex items-center gap-1.5 text-xs text-white/55">
            <Link href="/" className="transition-colors hover:text-white">خانه</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <span className="text-white/85">وکیل‌یابی</span>
          </nav>
          <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">{heading}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/65">
            از میان وکلای پایه یک دادگستری، تأییدشده و متخصص انتخاب کنید؛ با فیلتر تخصص، شهر، سابقه و امتیاز.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-white/85">
              <Icon name="badge" className="h-3.5 w-3.5 text-[color:var(--gold)]" />
              وکلای راستی‌آزمایی‌شده
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-white/85">
              <Icon name="star" className="h-3.5 w-3.5 text-[color:var(--gold)]" />
              امتیاز شفاف کاربران
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-white/85">
              <Icon name="calendar" className="h-3.5 w-3.5 text-[color:var(--gold)]" />
              رزرو آنلاین مشاوره
            </span>
          </div>
        </Container>
      </section>

      <Container className="py-8">
        <div className="sticky top-16 z-30 mb-6 lg:top-[72px]">
          <LawyerFilters initial={{ q, sp, city, gender, sort }} total={totalRow[0]?.c ?? 0} />
        </div>

        {list.length === 0 ? (
          <EmptyState
            title="وکیلی با این فیلترها یافت نشد"
            desc="فیلترها را تغییر دهید یا همه وکلا را مشاهده کنید."
            icon="search"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((l) => (
              <LawyerCard key={l.id} lawyer={l} />
            ))}
          </div>
        )}
      </Container>

      {/* SEO: تخصص‌ها */}
      <section id="specialties" className="mt-8 scroll-mt-24 border-t border-border py-12">
        <Container>
          <h2 className="text-xl font-bold text-foreground">وکیل بر اساس حوزه تخصص</h2>
          <p className="mt-2 text-sm text-muted">وکلای متخصص هر حوزه حقوقی را انتخاب کنید.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {SPECIALTIES.map((s) => (
              <a
                key={s}
                href={`/lawyers?sp=${encodeURIComponent(s)}`}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground-soft transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:text-primary card-shadow"
              >
                <Icon name="scale" className="h-4 w-4 text-accent" />
                وکیل {s}
              </a>
            ))}
          </div>
        </Container>
      </section>

      {/* SEO: استان‌ها و شهرها */}
      <section id="cities" className="scroll-mt-24 border-t border-border py-12">
        <Container>
          <h2 className="text-xl font-bold text-foreground">وکیل بر اساس استان و شهر</h2>
          <p className="mt-2 text-sm text-muted">وکلای شهر خود را پیدا کنید.</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_PROVINCES.map((p) => (
              <div key={p} className="rounded-2xl border border-border bg-surface p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Icon name="location" className="h-4 w-4 text-accent" />
                  استان {p}
                </h3>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {ALL_CITIES.map((c) => (
              <a
                key={c}
                href={`/lawyers?city=${encodeURIComponent(c)}`}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground-soft transition-colors hover:border-accent/50 hover:bg-accent-soft hover:text-[#8a6420]"
              >
                وکیل در {c}
              </a>
            ))}
          </div>
        </Container>
      </section>

      <Container className="py-12">
        <div className="relative overflow-hidden rounded-3xl p-8 text-center sm:p-10" style={{ background: "linear-gradient(150deg, #101b35 0%, #17264a 55%, #0b1328 100%)" }}>
          <div aria-hidden className="pointer-events-none absolute -top-16 right-1/3 h-48 w-48 rounded-full blur-3xl" style={{ background: "radial-gradient(closest-side, rgba(213,168,76,.3), transparent)" }} />
          <h2 className="relative text-xl font-black text-white sm:text-2xl">وکیل مناسب خود را پیدا نکردید؟</h2>
          <p className="relative mx-auto mt-2 max-w-lg text-sm leading-7 text-white/70">
            پرونده خود را ثبت کنید تا سیستم آن را به وکلای مرتبط معرفی کند.
          </p>
          <div className="relative mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/case/new"
              className="btn-gold inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-5 text-sm font-bold transition-all duration-200 hover:brightness-105 active:scale-[.97]"
            >
              <Icon name="folder" className="h-4 w-4" />
              ثبت پرونده
            </Link>
            <Link
              href="/consultation"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Icon name="calendar" className="h-4 w-4" />
              رزرو مشاوره
            </Link>
          </div>
          <div className="relative mt-6 flex flex-wrap justify-center gap-2 text-xs">
            <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-white/85">{faNum(totalRow[0]?.c ?? 0)} وکیل فعال</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-white/85">
              <Icon name="badge" className="h-3.5 w-3.5 text-[color:var(--gold)]" />
              احراز هویت‌شده
            </span>
            <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-white/85">رزرو آنلاین</span>
          </div>
        </div>
      </Container>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
