import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { lawyers, reviews } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { Container, Button, StarRating, Avatar, Badge, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LawyerPhoto } from "@/components/lawyer-photo";
import { faNum, faPrice, relativeTime } from "@/lib/data";
import { AvailabilityPanel } from "@/components/availability-panel";
import { BackButton } from "@/components/back-button";
import { LawyerViewRecorder, LawyerDiscovery } from "@/components/amazon/recently-viewed";
import { StickyCta } from "@/components/amazon/sticky-cta";
import { TrustLine } from "@/components/amazon/trust-line";
import { FavoriteButton } from "@/components/profile/favorites-panel";
import { getCurrentUser } from "@/lib/user-auth";
import { isLawyerSideRole } from "@/lib/roles";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { makeT, templateT } from "@/lib/i18n/core";
import { tdyn, tdynLong } from "@/lib/i18n/dynamic";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let l: typeof lawyers.$inferSelect | undefined;
  try {
    const rows = await db.select().from(lawyers).where(eq(lawyers.slug, slug)).limit(1);
    l = rows[0];
  } catch (err) {
    console.error("[dadban] lawyer metadata query failed:", err);
  }
  const locale = await getServerLocale();
  const st = makeT(locale);
  if (!l) return { title: st("وکیل یافت نشد") };
  const tf = templateT(st);
  const [dName, dTitle] = await Promise.all([tdyn(locale, l.name, 300), tdyn(locale, l.title, 300)]);
  const dCity = st(l.city);
  const dSpecialties = l.specialties.map((s) => st(s));
  const sep = locale === "fa" || locale === "ar" ? "، " : ", ";
  return {
    title: tf("{name} — {title} در {city}", { name: dName, title: dTitle, city: dCity }),
    description: tf("{name}، {title} متخصص {sp} در {city} با {years} سال سابقه و امتیاز {rating}. رزرو مشاوره آنلاین.", {
      name: dName,
      title: dTitle,
      sp: dSpecialties.join(sep),
      city: dCity,
      years: String(l.experienceYears),
      rating: String(l.rating),
    }),
    alternates: { canonical: `/lawyers/${slug}` },
  };
}

export default async function LawyerProfile({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getT();
  let l: typeof lawyers.$inferSelect | undefined;
  try {
    const rows = await db.select().from(lawyers).where(eq(lawyers.slug, slug)).limit(1);
    l = rows[0];
  } catch (err) {
    console.error("[dadban] lawyer profile query failed:", err);
  }
  if (!l) notFound();

  let lawyerReviews: typeof reviews.$inferSelect[] = [];
  let related: typeof lawyers.$inferSelect[] = [];
  try {
    [lawyerReviews, related] = await Promise.all([
      db.select().from(reviews).where(eq(reviews.lawyerId, l.id)).orderBy(desc(reviews.createdAt)),
      db
        .select()
        .from(lawyers)
        .where(sql`${lawyers.specialties} && ARRAY[${l.specialties[0]}]::text[] AND ${lawyers.id} <> ${l.id}`)
        .limit(3),
    ]);
  } catch (err) {
    console.error("[dadban] lawyer extras query failed:", err);
  }

  // Increment views (non-blocking)
  db.update(lawyers).set({ views: sql`${lawyers.views} + 1` }).where(eq(lawyers.id, l.id)).then().catch(() => {});

  // ترجمهٔ فیلدهای وکیل برای نمایش — name/title/bio/about با tdyn (کش سه‌لایه)،
  // city/province/specialties/services با واژه‌نامهٔ ایستا؛ نظرات کاربران ترجمه نمی‌شوند
  const locale = await getServerLocale();
  const st = makeT(locale);
  const tf = templateT(t);
  const [dName, dTitle, dBio, dAbout] = await Promise.all([
    tdyn(locale, l.name, 300),
    tdyn(locale, l.title, 300),
    l.bio ? tdyn(locale, l.bio, 900) : Promise.resolve(""),
    tdynLong(locale, l.about ?? ""),
  ]);
  const dCity = st(l.city);
  const dProvince = st(l.province);
  const dSpecialties = l.specialties.map((s) => st(s));
  const dServices = l.services.map((s) => st(s));
  const dRelated = await Promise.all(
    related.map(async (r) => ({ ...r, name: await tdyn(locale, r.name, 300), city: st(r.city) })),
  );

  // نقش بیننده: مالک پروفایل؟ وکیل‌سمت (جریان همکاری)؟ موکل (جریان رزرو)؟
  let me: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    me = await getCurrentUser();
  } catch {}
  // ستون lawyerType به‌زودی به جدول lawyers اضافه می‌شود؛ تا آن زمان با cast امن خوانده می‌شود تا tsc نشکند
  const lawyerType = (l as { lawyerType?: string }).lawyerType;
  const isKaramooz = lawyerType === "karamooz";
  const isOwner =
    !!me &&
    ((me.role === "lawyer" && me.lawyerId === l.id) || (me.role === "team" && me.parentLawyerId === l.id));
  const isLawyerViewer = !!me && !isOwner && isLawyerSideRole(me.role);

  const badges = [
    l.verified && { label: t("وکیل تأییدشده"), icon: "badge" as const, tone: "primary" as const },
    l.topRated && { label: t("وکیل برتر"), icon: "star" as const, tone: "accent" as const },
    l.fastResponder && { label: t("پاسخ‌گویی سریع"), icon: "bolt" as const, tone: "success" as const },
    l.contractExpert && { label: t("متخصص قراردادها"), icon: "document" as const, tone: "neutral" as const },
  ].filter(Boolean) as { label: string; icon: "badge" | "star" | "bolt" | "document"; tone: "primary" | "accent" | "success" | "neutral" }[];

  const pricing = [
    { key: "chat", label: t("مشاوره متنی"), price: l.priceChat, icon: "chat" as const, features: [t("پاسخ مکتوب"), t("ارسال فایل")] },
    { key: "voice", label: t("مشاوره صوتی"), price: l.priceVoice, icon: "phone" as const, features: [t("تماس تلفنی"), t("۳۰ دقیقه")] },
    { key: "video", label: t("مشاوره تصویری"), price: l.priceVideo, icon: "video" as const, features: [t("جلسه ویدئویی"), t("اشتراک فایل")] },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Attorney",
    "@id": `/lawyers/${l.slug}#lawyer`,
    name: dName,
    jobTitle: dTitle,
    description: dBio || tf("{name}، {title} متخصص {sp} در {city} با {years} سال سابقه.", {
      name: dName,
      title: dTitle,
      sp: dSpecialties.join(locale === "fa" || locale === "ar" ? "، " : ", "),
      city: dCity,
      years: String(l.experienceYears),
    }),
    url: `/lawyers/${l.slug}`,
    telephone: "+98-21-66921500",
    address: {
      "@type": "PostalAddress",
      addressLocality: dCity,
      addressRegion: dProvince,
      addressCountry: "IR",
    },
    knowsAbout: dSpecialties,
    /* کارآموز وکالت پروانهٔ رسمی ندارد — hasCredential فقط برای وکیل رسمی صادر می‌شود */
    ...(isKaramooz
      ? {}
      : {
          hasCredential: {
            "@type": "EducationalOccupationalCredential" as const,
            name: tf("پروانه وکالت شماره {no}", { no: l.licenseNo }),
            recognizedBy: st("کانون وکلای دادگستری"),
          },
        }),
    aggregateRating: l.reviewCount > 0 ? {
      "@type": "AggregateRating",
      ratingValue: l.rating,
      reviewCount: l.reviewCount,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    worksFor: { "@id": "/#organization" },
    areaServed: { "@type": "Country", name: st("ایران") },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: st("خانه"), item: "/" },
      { "@type": "ListItem", position: 2, name: st("وکلا"), item: "/lawyers" },
      { "@type": "ListItem", position: 3, name: dName, item: `/lawyers/${l.slug}` },
    ],
  };

  return (
    <>
      {/* ثبت بازدید برای شخصی‌سازی (بازدیدهای اخیر / پیشنهاد برای شما) */}
      <LawyerViewRecorder
        lawyer={{
          id: l.id,
          slug: l.slug,
          name: dName,
          title: dTitle,
          city: dCity,
          rating: l.rating,
          reviewCount: l.reviewCount,
          caseCount: l.caseCount,
          priceChat: l.priceChat,
          experienceYears: l.experienceYears,
          verified: l.verified,
          specialties: dSpecialties,
          avatarColor: l.avatarColor,
          photoUrl: l.photoUrl,
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary-soft/60 via-surface-2/40 to-background">
        <span aria-hidden className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-accent-soft/70 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -right-10 top-24 h-40 w-40 rounded-full bg-primary-soft/70 blur-2xl" />
        <Container className="py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <Link href="/" className="hover:text-primary">{t("خانه")}</Link>
              <Icon name="chevron" className="h-3 w-3 rotate-180" />
              <Link href="/lawyers" className="hover:text-primary">{t("وکلا")}</Link>
              <Icon name="chevron" className="h-3 w-3 rotate-180" />
              <span className="text-foreground-soft">{dName}</span>
            </nav>
            <BackButton variant="bar" label={t("بازگشت به فهرست وکلا")} fallback="/lawyers" />
          </div>

          <div className="relative mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <span className="rounded-3xl ring-4 ring-background shadow-[var(--shadow-lift)]">
                <LawyerPhoto name={dName} color={l.avatarColor} photoUrl={l.photoUrl} size="xl" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">{dName}</h1>
                  {l.verified && <Icon name="badge" className="h-6 w-6 text-primary" />}
                  {isKaramooz && (
                    <span
                      title={t("کارآموز وکالت — تحت نظارت وکیل پایه یک")}
                      className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent-text ring-1 ring-accent/30"
                    >
                      <Icon name="sparkles" className="h-3 w-3" />
                      {t("کارآموز وکالت")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-foreground-soft">{dTitle}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { icon: "location" as const, text: `${dCity} — ${dProvince}` },
                    { icon: "briefcase" as const, text: `${faNum(l.experienceYears)} ${t("سال سابقه")}` },
                    { icon: "folder" as const, text: `${faNum(l.caseCount)} ${t("پرونده")}` },
                  ].map((c) => (
                    <span key={c.text} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground-soft">
                      <Icon name={c.icon} className="h-3.5 w-3.5 text-primary" />
                      {c.text}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <StarRating rating={l.rating} count={l.reviewCount} size="md" />
                  {badges.map((b) => (
                    <Badge key={b.label} tone={b.tone} icon={b.icon}>{b.label}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
        {/* Main */}
        <div className="space-y-8">
          {/* Specialties */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Icon name="scale" className="h-5 w-5 text-accent-text" /> {t("حوزه‌های تخصص")}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {l.specialties.map((s, i) => (
                <a key={s} href={`/lawyers?sp=${encodeURIComponent(s)}`}>
                  <Badge tone="primary">{dSpecialties[i]}</Badge>
                </a>
              ))}
            </div>
          </section>

          {/* About */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Icon name="user" className="h-5 w-5 text-primary" /> {t("درباره وکیل")}
            </h2>
            <p className="mt-3 text-sm leading-8 text-foreground-soft">{dAbout}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                isKaramooz
                  ? { icon: "book" as const, label: t("وضعیت"), value: t("کارآموز وکالت"), ltr: false }
                  : { icon: "certificate" as const, label: t("پروانه"), value: l.licenseNo, ltr: true },
                { icon: "clock" as const, label: t("زمان پاسخ"), value: l.responseTime, ltr: false },
                { icon: "star" as const, label: t("امتیاز"), value: faNum(l.rating.toFixed(1)), ltr: false },
                { icon: "search" as const, label: t("بازدید"), value: faNum(l.views.toLocaleString("en-US")), ltr: false },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-border bg-surface p-3 text-center transition-colors hover:border-primary/30">
                  <Icon name={c.icon} className="mx-auto h-4 w-4 text-accent-text" />
                  <p className="mt-1 text-xs text-muted">{c.label}</p>
                  <p className="mt-0.5 text-sm font-bold text-foreground" dir={c.ltr ? "ltr" : undefined}>{c.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Services */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Icon name="check" className="h-5 w-5 text-success" /> {t("خدمات")}
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {l.services.map((s, i) => (
                <div key={s} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground-soft">
                  <Icon name="check" className="h-4 w-4 text-success" /> {dServices[i]}
                </div>
              ))}
            </div>
          </section>

          {/* پرداخت قسطی حق‌الوکاله — باکس فشرده نزدیک خدمات/تعرفه */}
          <section aria-label={t("پرداخت قسطی حق‌الوکاله")}>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent-soft/50 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon name="balance" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {t("پرداخت قسطی حق‌الوکاله برای این وکیل در دسترس است")}
                  </p>
                  <p className="mt-0.5 text-xs leading-6 text-foreground-soft">
                    {t("با توافق وکیل، حق‌الوکاله را می‌توانید یکجا، قسطی یا مرحله‌ای بپردازید؛ شرایط نهایی در قرارداد ثبت می‌شود.")}
                  </p>
                </div>
              </div>
              <Link
                href="/fee-payment"
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 px-1 text-sm font-bold text-accent-text transition-colors hover:text-accent-hover"
              >
                {t("جزئیات پرداخت قسطی")}
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
          </section>

          {/* Reviews */}
          <section>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Icon name="star" className="h-5 w-5 text-accent-text" /> {t("نظرات کاربران")}
              </h2>
              <span className="text-sm text-muted">{faNum(lawyerReviews.length)} {t("نظر")}</span>
            </div>
            {lawyerReviews.length === 0 ? (
              <div className="mt-3"><EmptyState title={t("هنوز نظری ثبت نشده است")} icon="chat" /></div>
            ) : (
              <div className="mt-3 space-y-3">
                {lawyerReviews.map((r) => (
                  <Card key={r.id} hover={false} className="flex gap-3">
                    <Avatar name={r.clientName} color="#64748b" size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-foreground">{r.clientName}</p>
                        <span className="text-xs text-muted">{relativeTime(r.createdAt)}</span>
                      </div>
                      <StarRating rating={r.rating} />
                      <p className="mt-1.5 text-sm leading-6 text-foreground-soft">{r.comment}</p>
                      {r.service && <Badge tone="neutral">{r.service}</Badge>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card hover={false} className="space-y-3">
            <h3 className="font-bold text-foreground">{t("تعرفه مشاوره")}</h3>
            <div className="space-y-2">
              {pricing.map((p, i) => (
                <div
                  key={p.key}
                  className={`relative flex items-center gap-3 rounded-xl border p-3 ${
                    i === 0 ? "border-primary/40 bg-primary-soft/40" : "border-border bg-surface-2"
                  }`}
                >
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${i === 0 ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"}`}>
                    <Icon name={p.icon} className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {p.label}
                      {i === 0 && <span className="mr-2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">{t("شروع قیمت")}</span>}
                    </p>
                    <p className="text-xs text-muted">{p.features.join(" • ")}</p>
                  </div>
                  <p className="text-sm font-bold text-foreground">{faPrice(p.price)}</p>
                </div>
              ))}
            </div>
            <FavoriteButton lawyerId={l.id} lawyerName={dName} />
            {isOwner ? (
              <Button href="/dashboard/lawyer/profile" icon="badge" className="w-full">
                {t("ویرایش پروفایل من")}
              </Button>
            ) : isLawyerViewer ? (
              <>
                <Button
                  href={`/lawyers/${l.slug}/refer`}
                  icon="link"
                  className="w-full"
                  data-testid="refer-cta"
                >
                  {t("درخواست همکاری / ارجاع پرونده")}
                </Button>
                <p className="flex items-start gap-1.5 text-[10px] leading-5 text-muted">
                  <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  {t("درخواست در کارتابل «همکاری و ارجاع» این همکار ثبت می‌شود؛ پاسخ او در پنل شما نمایش داده می‌شود.")}
                </p>
              </>
            ) : (
              <>
                <Button href={`/consultation/book?lawyer=${l.slug}`} icon="calendar" className="w-full">
                  {t("رزرو مشاوره")}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button href={`/consultation/book?lawyer=${l.slug}&type=chat`} variant="outline" size="sm" icon="chat">
                    {t("پیام")}
                  </Button>
                  <Button href={`/case/new?lawyer=${l.slug}`} variant="outline" size="sm" icon="folder">
                    {t("درخواست وکالت")}
                  </Button>
                </div>
              </>
            )}
            <TrustLine compact className="justify-start pt-1" />
          </Card>

          <Card hover={false}>
            <h3 className="flex items-center gap-2 font-bold text-foreground">
              <Icon name="clock" className="h-4 w-4 text-accent-text" /> {t("زمان‌های آزاد")}
            </h3>
            <div className="mt-3">
              <AvailabilityPanel lawyerSlug={l.slug} />
            </div>
          </Card>

          <Card hover={false} className="bg-primary-soft/50">
            <p className="flex items-start gap-2 text-xs leading-6 text-foreground-soft">
              <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              {t("هویت و پروانه این وکیل توسط کارشناسان دادبان راستی‌آزمایی شده است. مبلغ نهایی پیش از پرداخت مشخص است و بازگشت وجه طبق سیاست شفاف انجام می‌شود.")}
            </p>
          </Card>
        </aside>
      </Container>

      {/* Related */}
      {related.length > 0 && (
        <Container className="pb-12">
          <h2 className="text-xl font-bold text-foreground">{t("وکلای مرتبط")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dRelated.map((relatedLawyer) => {
              return (
                <a key={relatedLawyer.id} href={`/lawyers/${relatedLawyer.slug}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                  <LawyerPhoto name={relatedLawyer.name} color={relatedLawyer.avatarColor} photoUrl={relatedLawyer.photoUrl} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{relatedLawyer.name}</p>
                    <p className="text-xs text-muted">{relatedLawyer.city} • {faNum(relatedLawyer.experienceYears)} {t("سال")}</p>
                  </div>
                  <Icon name="chevron" className="mr-auto h-4 w-4 rotate-180 text-muted" />
                </a>
              );
            })}
          </div>
        </Container>
      )}

      {/* شخصی‌سازی: بازدیدهای اخیر + پیشنهاد بر اساس همین پروفایل (سبک آمازون) */}
      <Container className="pb-6">
        <LawyerDiscovery excludeSlug={l.slug} />
      </Container>

      {/* CTA چسبان موبایل — نقش‌محور: وکیل‌سمت ← درخواست همکاری، موکل ← رزرو */}
      {!isOwner && (
        <StickyCta
          href={isLawyerViewer ? `/lawyers/${l.slug}/refer` : `/consultation/book?lawyer=${l.slug}`}
          label={isLawyerViewer ? tf("درخواست همکاری با {name}", { name: dName }) : tf("رزرو مشاوره با {name}", { name: dName })}
          sub={
            isLawyerViewer
              ? t("ارجاع کامل پرونده، مشورت تخصصی یا همکاری مشترک")
              : tf("از {price} • پرداخت امن • ضمانت بازگشت وجه", { price: faPrice(l.priceChat) })
          }
        />
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumbLd]) }} />
    </>
  );
}
