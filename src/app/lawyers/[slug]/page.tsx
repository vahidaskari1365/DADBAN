import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { lawyers, reviews } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { Container, Button, Avatar, Badge, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { formatToman, formatJalali } from "@/lib/money";
import { AvailabilityPanel } from "@/components/availability-panel";
import { LawyerProfileTabs } from "@/components/lawyer-profile-tabs";
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
    console.error("[dadpayo] lawyer metadata query failed:", err);
  }
  if (!l) return { title: "وکیل یافت نشد" };
  return {
    title: `${l.name} — ${l.title} در ${l.city}`,
    description: `${l.name}، ${l.title} متخصص ${l.specialties.join("، ")} در ${l.city} با ${l.experienceYears} سال سابقه و امتیاز ${l.rating}. رزرو مشاوره آنلاین.`,
    alternates: { canonical: `/lawyers/${slug}` },
  };
}

export default async function LawyerProfile({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let l: typeof lawyers.$inferSelect | undefined;
  try {
    const rows = await db.select().from(lawyers).where(eq(lawyers.slug, slug)).limit(1);
    l = rows[0];
  } catch (err) {
    console.error("[dadpayo] lawyer profile query failed:", err);
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
    console.error("[dadpayo] lawyer extras query failed:", err);
  }

  // Increment views (non-blocking)
  db.update(lawyers).set({ views: sql`${lawyers.views} + 1` }).where(eq(lawyers.id, l.id)).then().catch(() => {});

  // درصد رضایت از امتیاز واقعی وکیل (۵ ستاره → ۱۰۰٪)
  const satisfaction = Math.min(100, Math.round((l.rating / 5) * 100));

  const badges = [
    l.verified && { label: "وکیل تأییدشده", icon: "badge" as const, tone: "accent" as const },
    l.topRated && { label: "وکیل برتر", icon: "star" as const, tone: "accent" as const },
    l.fastResponder && { label: "پاسخ‌گویی سریع", icon: "bolt" as const, tone: "success" as const },
    l.contractExpert && { label: "متخصص قراردادها", icon: "document" as const, tone: "neutral" as const },
  ].filter(Boolean) as { label: string; icon: "badge" | "star" | "bolt" | "document"; tone: "accent" | "success" | "neutral" }[];

  const pricing = [
    { key: "chat", label: "مشاوره متنی", price: l.priceChat, icon: "chat" as const, features: ["پاسخ مکتوب", "ارسال فایل"] },
    { key: "voice", label: "مشاوره تلفنی", price: l.priceVoice, icon: "phone" as const, features: ["تماس تلفنی", "۳۰ دقیقه"] },
    { key: "video", label: "مشاوره تصویری", price: l.priceVideo, icon: "video" as const, features: ["جلسه ویدئویی", "اشتراک فایل"] },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Attorney",
    "@id": `/lawyers/${l.slug}#lawyer`,
    name: l.name,
    jobTitle: l.title,
    description: l.bio || `${l.name}، ${l.title} متخصص ${l.specialties.join("، ")} در ${l.city} با ${l.experienceYears} سال سابقه.`,
    url: `/lawyers/${l.slug}`,
    telephone: "+98-21-66921500",
    address: {
      "@type": "PostalAddress",
      addressLocality: l.city,
      addressRegion: l.province,
      addressCountry: "IR",
    },
    knowsAbout: l.specialties,
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      name: `پروانه وکالت شماره ${l.licenseNo}`,
      recognizedBy: "کانون وکلای دادگستری",
    },
    aggregateRating: l.reviewCount > 0 ? {
      "@type": "AggregateRating",
      ratingValue: l.rating,
      reviewCount: l.reviewCount,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    worksFor: { "@id": "/#organization" },
    areaServed: { "@type": "Country", name: "ایران" },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: "/" },
      { "@type": "ListItem", position: 2, name: "وکلا", item: "/lawyers" },
      { "@type": "ListItem", position: 3, name: l.name, item: `/lawyers/${l.slug}` },
    ],
  };

  return (
    <>
      {/* هدر کارت وکیل — سرمه‌ای */}
      <section style={{ background: "linear-gradient(150deg, #101b35 0%, #17264a 60%, #0b1328 100%)" }}>
        <Container className="py-8 sm:py-10">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-white/55">
            <Link href="/" className="transition-colors hover:text-white">خانه</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <Link href="/lawyers" className="transition-colors hover:text-white">وکلا</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <span className="text-white/85">{l.name}</span>
          </nav>

          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* آواتار بزرگ در قاب طلایی */}
            <div className="relative shrink-0 rounded-3xl border border-[rgba(213,168,76,.5)] p-1.5">
              <Avatar name={l.name} color={l.avatarColor} size="xl" />
              {l.verified && (
                <span className="absolute -left-1.5 -top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#101b35] bg-accent text-[#1b2334]" title="وکیل تأییدشده">
                  <Icon name="badge" className="h-4 w-4" />
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black text-white sm:text-3xl">{l.name}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white/90">
                  <Icon name="id" className="h-3.5 w-3.5 text-[color:var(--gold)]" />
                  {l.title}
                </span>
              </div>

              {/* امتیاز ستاره‌ای + شهر + سابقه */}
              <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm">
                <span className="inline-flex items-center gap-1.5" aria-label={`امتیاز ${l.rating} از ۵`}>
                  <Icon name="star" className="h-5 w-5 text-[color:var(--gold)]" />
                  <span className="text-base font-extrabold text-white">{faNum(l.rating.toFixed(1))}</span>
                  {l.reviewCount > 0 && <span className="text-xs text-white/55">({faNum(l.reviewCount)} نظر)</span>}
                </span>
                <span className="inline-flex items-center gap-1.5 text-white/75">
                  <Icon name="location" className="h-4 w-4 text-[color:var(--gold)]" />
                  {l.city}، استان {l.province}
                </span>
                <span className="inline-flex items-center gap-1.5 text-white/75">
                  <Icon name="briefcase" className="h-4 w-4 text-[color:var(--gold)]" />
                  {faNum(l.experienceYears)} سال سابقه
                </span>
              </div>

              {/* تگ‌های تخصص */}
              <div className="mt-4 flex flex-wrap gap-2">
                {l.specialties.map((s) => (
                  <Link
                    key={s}
                    href={`/lawyers?sp=${encodeURIComponent(s)}`}
                    className="rounded-full border border-white/20 bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/90 transition-colors hover:border-[rgba(213,168,76,.5)] hover:text-[color:var(--gold)]"
                  >
                    {s}
                  </Link>
                ))}
              </div>

              {/* بج‌ها */}
              {badges.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {badges.map((b) => (
                    <Badge key={b.label} tone={b.tone} icon={b.icon}>{b.label}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Container>
      </section>

      <Container className="grid gap-8 py-8 lg:grid-cols-[1fr_360px]">
        {/* ستون اصلی — آمار + تب‌ها */}
        <div className="min-w-0 space-y-6">
          {/* سه باکس آمار */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border bg-surface p-4 text-center card-shadow">
              <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Icon name="folder" className="h-4.5 w-4.5" />
              </span>
              <p className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">{faNum(l.caseCount)}</p>
              <p className="mt-0.5 text-xs text-muted">پرونده موفق</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4 text-center card-shadow">
              <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon name="star" className="h-4.5 w-4.5" />
              </span>
              <p className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">{faNum(satisfaction)}٪</p>
              <p className="mt-0.5 text-xs text-muted">رضایت موکلان</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4 text-center card-shadow">
              <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Icon name="briefcase" className="h-4.5 w-4.5" />
              </span>
              <p className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">{faNum(l.experienceYears)}</p>
              <p className="mt-0.5 text-xs text-muted">سال سابقه</p>
            </div>
          </div>

          {/* تب‌ها: اطلاعات | تخصص‌ها | سوابق | نظرات */}
          <LawyerProfileTabs
            about={l.about || l.bio || "معرفی‌ای برای این وکیل ثبت نشده است."}
            licenseNo={l.licenseNo}
            responseTime={l.responseTime}
            views={l.views}
            specialties={l.specialties}
            services={l.services}
            pricing={pricing}
            caseCount={l.caseCount}
            satisfaction={satisfaction}
            experienceYears={l.experienceYears}
            reviews={lawyerReviews.map((r) => ({
              id: r.id,
              clientName: r.clientName,
              rating: r.rating,
              comment: r.comment,
              service: r.service,
              dateFa: formatJalali(r.createdAt),
            }))}
          />
        </div>

        {/* سایدبار — تعرفه و اقدامات */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card hover={false} className="space-y-3">
            <h3 className="flex items-center gap-2 font-bold text-foreground">
              <Icon name="money" className="h-5 w-5 text-accent" /> تعرفه مشاوره
            </h3>
            <div className="space-y-2">
              {pricing.map((p) => (
                <div key={p.key} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon name={p.icon} className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{p.label}</p>
                    <p className="text-xs text-muted">{p.features.join(" • ")}</p>
                  </div>
                  <p className="dp-money text-sm">{formatToman(p.price)}</p>
                </div>
              ))}
            </div>

            <Button href={`/consultation?lawyer=${l.slug}&type=chat`} icon="chat" className="w-full">
              درخواست مشاوره متنی
            </Button>
            <Link
              href={`/consultation?lawyer=${l.slug}&type=video`}
              className="btn-gold flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-200 hover:brightness-105 active:scale-[.98]"
            >
              <Icon name="video" className="h-4 w-4" />
              درخواست مشاوره تصویری
            </Link>
            <Button href={`/case/new?lawyer=${l.slug}`} variant="outline" icon="folder" className="w-full">
              ارسال پرونده به این وکیل
            </Button>
          </Card>

          <Card hover={false}>
            <h3 className="flex items-center gap-2 font-bold text-foreground">
              <Icon name="clock" className="h-4 w-4 text-accent" /> زمان‌های آزاد
            </h3>
            <div className="mt-3">
              <AvailabilityPanel lawyerSlug={l.slug} />
            </div>
          </Card>

          <Card hover={false} className="border-accent/30 bg-accent-soft/50">
            <p className="flex items-start gap-2 text-xs leading-6 text-foreground-soft">
              <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              هویت و پروانه این وکیل توسط کارشناسان دادپیو راستی‌آزمایی شده است. مبلغ نهایی پیش از
              پرداخت مشخص است و بازگشت وجه طبق سیاست شفاف انجام می‌شود.
            </p>
          </Card>
        </aside>
      </Container>

      {/* وکلای مشابه */}
      {related.length > 0 && (
        <Container className="pb-12">
          <h2 className="text-xl font-bold text-foreground">وکلای مشابه</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/lawyers/${r.slug}`}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--shadow-lift)]"
              >
                <Avatar name={r.name} color={r.avatarColor} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{r.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{r.city} • {faNum(r.experienceYears)} سال سابقه</p>
                  <p className="dp-money mt-1 text-xs">مشاوره از {formatToman(r.priceChat)}</p>
                </div>
                <Icon name="chevron" className="h-4 w-4 shrink-0 rotate-180 text-muted transition-colors group-hover:text-accent" />
              </Link>
            ))}
          </div>
        </Container>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumbLd]) }} />
    </>
  );
}
