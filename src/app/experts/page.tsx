import type { Metadata } from "next";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { and, desc, asc, eq, inArray, sql, count } from "drizzle-orm";
import { Container, Button, EmptyState, Badge } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { LawyerCard } from "@/components/lawyer-card";
import { LawyerFilters } from "@/components/lawyer-filters";
import { LOCATIONS, faNum } from "@/lib/data";
import { getCurrentUser } from "@/lib/user-auth";
import { isLawyerSideRole } from "@/lib/roles";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { makeT, templateT } from "@/lib/i18n/core";
import { tdyn } from "@/lib/i18n/dynamic";
import Link from "next/link";
import { safeJsonLd } from "@/lib/jsonld";
import { PageContentBlocks } from "@/components/page-content-blocks";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ sp?: string; city?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const specialty = sp.sp;
  const city = sp.city;
  const locale = await getServerLocale();
  const st = makeT(locale);
  const tf = templateT(st);
  const isProvince = city ? LOCATIONS.some((l) => l.province === city) : false;
  const title = specialty
    ? city
      ? isProvince
        ? tf("کارشناس حقوقی {sp} در استان {city}", { sp: specialty, city })
        : tf("کارشناس حقوقی {sp} در {city}", { sp: specialty, city })
      : tf("کارشناس حقوقی {sp}", { sp: specialty })
    : city
      ? isProvince
        ? tf("کارشناس حقوقی در استان {city}", { city })
        : tf("کارشناس حقوقی در {city}", { city })
      : st("کارشناسان حقوقی — مشاوره، قرارداد و اسناد");
  const description =
    [st("فهرست کارشناسان حقوقی دادورزان"), specialty ? tf("متخصص {sp}", { sp: specialty }) : "", city ? tf("در {city}", { city }) : ""]
      .filter(Boolean)
      .join(" ") +
    ". " +
    st("مشاوره حقوقی، تنظیم و بازبینی قرارداد و کمک به اسناد — بدون وکالت در دادگاه؛ با فیلتر تخصص، استان و شهر.");
  return {
    title,
    description,
    alternates: { canonical: "/experts" },
  };
}

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const t = await getT();
  const locale = await getServerLocale();
  const st = makeT(locale);
  const tf = templateT(t);
  const { sp, city, gender, sort, q } = params;

  // نقش کاربر — برای همکاران پیام متفاوتی نمایش داده می‌شود
  let meRole: string | null = null;
  try {
    const me = await getCurrentUser();
    meRole = me?.role ?? null;
  } catch {}
  const lawyerSide = isLawyerSideRole(meRole);

  // فقط کارشناسان حقوقی تأییدشده (lawyer_type = "expert")
  const conds = [eq(lawyers.verified, true), eq(lawyers.lawyerType, "expert")];
  if (sp) conds.push(sql`${lawyers.specialties} @> ARRAY[${sp}]::text[]`);
  if (city) {
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
      db.select().from(lawyers).where(and(...conds)).orderBy(order, desc(lawyers.verified)),
      db.select({ c: count() }).from(lawyers).where(and(...conds)),
    ]);
  } catch (err) {
    console.error("[dadban] experts list query failed:", err);
  }

  // ترجمهٔ داینامیک فیلدها پیش از رسیدن به کارت‌ها (کارت کلاینت است)
  list = await Promise.all(
    list.map(async (l) => ({
      ...l,
      name: await tdyn(locale, l.name, 300),
      title: await tdyn(locale, l.title, 300),
      city: st(l.city),
      province: st(l.province),
      specialties: l.specialties.map((s) => st(s)),
    })),
  );

  const heading = sp
    ? city
      ? tf("کارشناس حقوقی {sp} در {city}", { sp, city })
      : tf("کارشناس حقوقی {sp}", { sp })
    : city
      ? tf("کارشناس حقوقی در {city}", { city })
      : t("کارشناسان حقوقی");

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: t("کارشناس حقوقی چه کاری انجام می‌دهد؟"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t("کارشناس حقوقی مشاوره تخصصی، تنظیم و بازبینی قرارداد و کمک به اسناد ارائه می‌دهد؛ برخلاف وکیل دادگستری، وکالت در دادگاه ندارد."),
        },
      },
      {
        "@type": "Question",
        name: t("چگونه کارشناس حقوقی مناسب پیدا کنم؟"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t("از این صفحه با فیلتر تخصص، استان و شهر می‌توانید کارشناس حقوقی مناسب پیدا و مشاوره رزرو کنید."),
        },
      },
    ],
  };

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-lawyers.png"
        title={heading}
        desc={t("مشاوره تخصصی، تنظیم و بازبینی قرارداد و کمک به اسناد توسط کارشناسان حقوقی تأییدشدهٔ دادورزان — با فیلتر تخصص، استان و شهر.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("وکیل‌یابی"), href: "/lawyers" }, { label: t("کارشناسان حقوقی") }]}
      >
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/90">
          <Icon name="certificate" className="h-3.5 w-3.5 text-[#eec97b]" />
          {t("کارشناس حقوقی: مشاوره، قرارداد و اسناد — بدون وکالت در دادگاه")}
        </p>
      </PageHero>

      <PageContentBlocks page="experts" position="top" />

      <Container className="py-8">
        <div className="mb-6">
          <LawyerFilters initial={{ q, sp, city, gender, sort }} total={totalRow[0]?.c ?? 0} basePath="/experts" />
        </div>

        {/* دسترسی سریع بین دو دایرکتوری */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted">{t("دایرکتوری‌ها:")}</span>
          <Link
            href="/lawyers"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-bold text-foreground-soft transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Icon name="gavel" className="h-3.5 w-3.5" />
            {t("وکلا")}
          </Link>
          <span
            aria-current="true"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-md"
          >
            <Icon name="certificate" className="h-3.5 w-3.5" />
            {t("کارشناسان حقوقی")}
          </span>
        </div>

        {list.length === 0 ? (
          <EmptyState
            title={t("کارشناس حقوقی با این فیلترها یافت نشد")}
            desc={t("فیلترها را تغییر دهید یا همه کارشناسان را مشاهده کنید.")}
            icon="certificate"
            action={{ href: "/register?role=expert", label: t("عضویت کارشناس حقوقی") }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((l, i) => (
              <LawyerCard key={l.id} lawyer={l} priority={i === 0} />
            ))}
          </div>
        )}
      </Container>

      <Container className="py-12">
        <div className="rounded-3xl border border-border bg-surface p-8 text-center card-shadow">
          {lawyerSide ? (
            <>
              <h2 className="text-xl font-bold text-foreground">{t("کارشناس همکار موردنظر را نیافتید؟")}</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
                {t("با پشتیبانی دادورزان تماس بگیرید یا از دایرکتوری وکلا برای ارجاع پرونده‌های قضایی استفاده کنید.")}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button href="/lawyers" icon="gavel">{t("دایرکتوری وکلا")}</Button>
                <Button href="/support" variant="ghost" icon="shield">{t("پشتیبانی")}</Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-foreground">{t("کارشناس حقوقی مناسب را پیدا نکردید؟")}</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
                {t("می‌توانید مستقیماً با دستیار حقوقی هوشمند شروع کنید یا پرونده خود را ثبت کنید تا به متخصص مناسب معرفی شود.")}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button href="/ai-assistant" icon="sparkles">{t("دستیار حقوقی هوشمند")}</Button>
                <Button href="/case/new" variant="outline" icon="folder">{t("ثبت پرونده")}</Button>
              </div>
            </>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Badge tone="neutral">{faNum(totalRow[0]?.c ?? 0)} {t("کارشناس فعال")}</Badge>
            <Badge tone="success" icon="badge">{t("احراز هویت‌شده")}</Badge>
            <Badge tone="accent" icon="certificate">{t("قرارداد و اسناد")}</Badge>
          </div>
        </div>
      </Container>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />
    </>
  );
}
