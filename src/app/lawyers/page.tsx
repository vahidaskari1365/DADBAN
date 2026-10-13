import type { Metadata } from "next";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { and, desc, asc, eq, inArray, sql, count } from "drizzle-orm";
import { Container, Button, EmptyState, Badge } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { LawyerCard } from "@/components/lawyer-card";
import { PinMasonry } from "@/components/pin-masonry";
import { LawyerFilters } from "@/components/lawyer-filters";
import { LawyerDiscovery } from "@/components/amazon/recently-viewed";
import { StickyCta } from "@/components/amazon/sticky-cta";
import { LOCATIONS, faNum } from "@/lib/data";
import { getCurrentUser } from "@/lib/user-auth";
import { isLawyerSideRole } from "@/lib/roles";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { makeT, templateT } from "@/lib/i18n/core";
import { tdyn } from "@/lib/i18n/dynamic";
import Link from "next/link";
import { safeJsonLd } from "@/lib/jsonld";

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
        ? tf("وکیل {sp} در استان {city}", { sp: specialty, city })
        : tf("وکیل {sp} در {city}", { sp: specialty, city })
      : tf("وکیل {sp}", { sp: specialty })
    : city
      ? isProvince
        ? tf("وکیل در استان {city}", { city })
        : tf("وکیل در {city}", { city })
      : st("جستجوی وکیل متخصص");
  const description =
    [st("جستجو و رزرو وکیل"), specialty ? tf("متخصص {sp}", { sp: specialty }) : "", city ? tf("در شهر {city}", { city }) : ""]
      .filter(Boolean)
      .join(" ") +
    ". " +
    st("احراز هویت‌شده، با امتیاز کاربران و رزرو آنلاین مشاوره.");
  return {
    title,
    description,
    alternates: { canonical: "/lawyers" },
  };
}

export default async function LawyersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const t = await getT();
  const locale = await getServerLocale();
  const st = makeT(locale);
  const tf = templateT(t);
  const { sp, city, gender, sort, q, type } = params;
  // فیلتر نوع وکیل: همه | وکیل رسمی (wakil) | کارآموز (karamooz) — سمت سرور روی ستون lawyer_type
  const typeFilter = type === "karamooz" || type === "wakil" ? type : null;

  // نقش کاربر — برای وکیل/همکار: دایرکتوری همکاران (نه جریان «انتخاب وکیل» موکل‌ها)
  let meRole: string | null = null;
  try {
    const me = await getCurrentUser();
    meRole = me?.role ?? null;
  } catch {}
  const lawyerSide = isLawyerSideRole(meRole);

  const conds = [];
  // فقط وکلای احراز هویت‌شده (تأیید مدیر سایت) در فهرست عمومی دیده می‌شوند
  conds.push(eq(lawyers.verified, true));
  if (sp) conds.push(sql`${lawyers.specialties} @> ARRAY[${sp}]::text[]`);
  if (city) {
    // اگر پارامتر یک استان باشد، همه شهرهای آن استان جستجو می‌شود
    const prov = LOCATIONS.find((l) => l.province === city);
    if (prov) conds.push(inArray(lawyers.city, prov.cities));
    else conds.push(eq(lawyers.city, city));
  }
  if (gender) conds.push(eq(lawyers.gender, gender));
  if (typeFilter) conds.push(eq(lawyers.lawyerType, typeFilter));
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

  // ترجمهٔ داینامیک فیلدهای وکلا پیش از رسیدن به کارت‌ها (کارت کلاینت است):
  // نام/عنوان با tdyn (کش سه‌لایه) — شهر/استان/تخصص با واژه‌نامهٔ ایستا
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

  /** لینک چیپ فیلتر نوع — بقیهٔ فیلترهای فعال حفظ می‌شوند */
  const typeHref = (t: string) => {
    const qs = new URLSearchParams();
    if (sp) qs.set("sp", sp);
    if (city) qs.set("city", city);
    if (gender) qs.set("gender", gender);
    if (sort) qs.set("sort", sort);
    if (q) qs.set("q", q);
    if (t) qs.set("type", t);
    const s = qs.toString();
    return s ? `/lawyers?${s}` : "/lawyers";
  };
  const TYPE_CHIPS: { id: string; label: string }[] = [
    { id: "", label: "همه" },
    { id: "wakil", label: "وکیل رسمی" },
    { id: "karamooz", label: "کارآموز" },
  ];

  const heading = sp
    ? city
      ? isProvince
        ? tf("وکیل {sp} در استان {city}", { sp, city })
        : tf("وکیل {sp} در {city}", { sp, city })
      : tf("وکیل {sp}", { sp })
    : city
      ? isProvince
        ? tf("وکیل در استان {city}", { city })
        : tf("وکیل در {city}", { city })
      : t("همه وکلا");

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: sp ? tf("چگونه وکیل {sp} پیدا کنم؟", { sp }) : t("چگونه وکیل پیدا کنم؟"),
        acceptedAnswer: {
          "@type": "Answer",
          text: sp
            ? tf("از صفحه جستجوی وکیل دادورزان با فیلتر تخصص و شهر می‌توانید وکیل {sp} مناسب پیدا و مشاوره رزرو کنید.", { sp })
            : t("از صفحه جستجوی وکیل دادورزان با فیلتر تخصص و شهر می‌توانید وکیل مناسب پیدا و مشاوره رزرو کنید."),
        },
      },
      { "@type": "Question", name: t("آیا وکلای دادورزان احراز هویت شده‌اند؟"), acceptedAnswer: { "@type": "Answer", text: t("بله، هویت و پروانه همه وکلا توسط کارشناسان دادورزان راستی‌آزمایی می‌شود.") } },
    ],
  };

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-lawyers.png"
        title={lawyerSide ? (sp || city ? heading : t("دایرکتوری وکلا — جستجوی همکاران")) : heading}
        desc={lawyerSide
          ? t("فهرست وکلای احراز هویت‌شدهٔ دادورزان برای همکاران — جستجوی همکار برای ارجاع پرونده، همکاری تخصصی یا اطلاع از تعرفه‌ها؛ با فیلتر تخصص، شهر، سابقه و امتیاز.")
          : t("از میان وکلای پایه یک دادگستری، تأییدشده و متخصص انتخاب کنید؛ با فیلتر تخصص، شهر، سابقه و امتیاز.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("وکیل‌یابی") }]}
      >
        {lawyerSide && (
          <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/90">
            <Icon name="shield" className="h-3.5 w-3.5 text-[#eec97b]" />
            {t("نمای همکاران — روی کارت هر وکیل کلیک کنید و از پروفایل او «درخواست همکاری / ارجاع پرونده» را ثبت کنید")}
          </p>
        )}
      </PageHero>

      <Container className="py-8">
        <div className="sticky top-16 z-30 mb-6">
          <LawyerFilters initial={{ q, sp, city, gender, sort }} total={totalRow[0]?.c ?? 0} />
        </div>

        {/* فیلتر نوع — همه / وکیل رسمی / کارآموز (روی همان لیست فیلترشدهٔ سرور) */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted">{t("نوع:")}</span>
          {TYPE_CHIPS.map((tChips) => {
            const active = (typeFilter ?? "") === tChips.id;
            return (
              <Link
                key={tChips.id || "all"}
                href={typeHref(tChips.id)}
                aria-current={active ? "true" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "border border-border bg-surface text-foreground-soft hover:border-primary/40 hover:text-primary"
                }`}
              >
                {tChips.id === "karamooz" && <Icon name="book" className="h-3.5 w-3.5" />}
                {tChips.id === "wakil" && <Icon name="gavel" className="h-3.5 w-3.5" />}
                {t(tChips.label)}
              </Link>
            );
          })}
        </div>

        {list.length === 0 ? (
          <EmptyState
            title={t("وکیلی با این فیلترها یافت نشد")}
            desc={t("فیلترها را تغییر دهید یا همه وکلا را مشاهده کنید.")}
            icon="search"
            action={lawyerSide ? { href: "/support", label: t("تماس با پشتیبانی") } : { href: "/consultation", label: t("درخواست معرفی وکیل") }}
          />
        ) : (
          <PinMasonry>
            {list.map((l, i) => (
              <LawyerCard key={l.id} lawyer={l} index={i} priority={i === 0} />
            ))}
          </PinMasonry>
        )}

        {/* بازدیدهای اخیر + پیشنهاد برای شما (شخصی‌سازی، سبک آمازون) */}
        <div className="mt-10">
          <LawyerDiscovery />
        </div>
      </Container>

      {/* CTA چسبان موبایل — فقط برای موکل‌ها (برای همکاران جریان پروندهٔ موکل معنا ندارد) */}
      {!lawyerSide && (
        <StickyCta
          href="/case/new"
          label={t("پرونده‌ات را ثبت کن")}
          sub={t("ارزیابی اولیه • محرمانگی کامل • بدون هزینه اولیه")}
        />
      )}

      <Container className="py-12">
        <div className="rounded-3xl border border-border bg-surface p-8 text-center card-shadow">
          {lawyerSide ? (
            <>
              <h2 className="text-xl font-bold text-foreground">{t("همکار یا تخصص موردنظر را نیافتید؟")}</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
                {t("با پشتیبانی دادورزان تماس بگیرید یا پرونده‌های ارجاعی استان خود را در کارتابل پیشنهادها پیگیری کنید.")}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button href="/dashboard/lawyer#collab" icon="link">{t("همکاری و ارجاع من")}</Button>
                <Button href="/dashboard/lawyer#offers" variant="outline" icon="mail">{t("کارتابل پیشنهادهای پرونده")}</Button>
                <Button href="/support" variant="ghost" icon="shield">{t("پشتیبانی")}</Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-foreground">{t("وکیل مناسب خود را پیدا نکردید؟")}</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
                {t("پرونده خود را ثبت کنید تا سیستم آن را به وکلای مرتبط معرفی کند.")}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button href="/case/new" icon="folder">{t("ثبت پرونده")}</Button>
                <Button href="/consultation" variant="outline" icon="calendar">{t("رزرو مشاوره")}</Button>
              </div>
            </>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Badge tone="neutral">{faNum(totalRow[0]?.c ?? 0)} {t("وکیل فعال")}</Badge>
            <Badge tone="success" icon="badge">{t("احراز هویت‌شده")}</Badge>
            <Badge tone="accent">{t("رزرو آنلاین")}</Badge>
          </div>
        </div>
      </Container>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />
    </>
  );
}
