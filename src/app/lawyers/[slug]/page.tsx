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
import { LawyerViewRecorder, LawyerDiscovery } from "@/components/amazon/recently-viewed";
import { StickyCta } from "@/components/amazon/sticky-cta";
import { TrustLine } from "@/components/amazon/trust-line";
import { FavoriteButton } from "@/components/profile/favorites-panel";
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

  const badges = [
    l.verified && { label: "وکیل تأییدشده", icon: "badge" as const, tone: "primary" as const },
    l.topRated && { label: "وکیل برتر", icon: "star" as const, tone: "accent" as const },
    l.fastResponder && { label: "پاسخ‌گویی سریع", icon: "bolt" as const, tone: "success" as const },
    l.contractExpert && { label: "متخصص قراردادها", icon: "document" as const, tone: "neutral" as const },
  ].filter(Boolean) as { label: string; icon: "badge" | "star" | "bolt" | "document"; tone: "primary" | "accent" | "success" | "neutral" }[];

  const pricing = [
    { key: "chat", label: "مشاوره متنی", price: l.priceChat, icon: "chat" as const, features: ["پاسخ مکتوب", "ارسال فایل"] },
    { key: "voice", label: "مشاوره صوتی", price: l.priceVoice, icon: "phone" as const, features: ["تماس تلفنی", "۳۰ دقیقه"] },
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
      {/* ثبت بازدید برای شخصی‌سازی (بازدیدهای اخیر / پیشنهاد برای شما) */}
      <LawyerViewRecorder
        lawyer={{
          id: l.id,
          slug: l.slug,
          name: l.name,
          title: l.title,
          city: l.city,
          rating: l.rating,
          reviewCount: l.reviewCount,
          caseCount: l.caseCount,
          priceChat: l.priceChat,
          experienceYears: l.experienceYears,
          verified: l.verified,
          specialties: l.specialties,
          avatarColor: l.avatarColor,
          photoUrl: l.photoUrl,
        }}
      />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-primary-soft/40 to-background">
        <Container className="py-8">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <Link href="/" className="hover:text-primary">خانه</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <Link href="/lawyers" className="hover:text-primary">وکلا</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <span className="text-foreground-soft">{l.name}</span>
          </nav>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <LawyerPhoto name={l.name} color={l.avatarColor} photoUrl={l.photoUrl} size="xl" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">{l.name}</h1>
                  {l.verified && <Icon name="badge" className="h-6 w-6 text-primary" />}
                </div>
                <p className="mt-1 text-sm text-foreground-soft">{l.title}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
                  <StarRating rating={l.rating} count={l.reviewCount} size="md" />
                  <span className="inline-flex items-center gap-1.5"><Icon name="location" className="h-4 w-4" /> {l.city} — {l.province}</span>
                  <span className="inline-flex items-center gap-1.5"><Icon name="briefcase" className="h-4 w-4" /> {faNum(l.experienceYears)} سال سابقه</span>
                  <span className="inline-flex items-center gap-1.5"><Icon name="folder" className="h-4 w-4" /> {faNum(l.caseCount)} پرونده</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
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
              <Icon name="scale" className="h-5 w-5 text-accent" /> حوزه‌های تخصص
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {l.specialties.map((s) => (
                <a key={s} href={`/lawyers?sp=${encodeURIComponent(s)}`}>
                  <Badge tone="primary">{s}</Badge>
                </a>
              ))}
            </div>
          </section>

          {/* About */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Icon name="user" className="h-5 w-5 text-primary" /> درباره وکیل
            </h2>
            <p className="mt-3 text-sm leading-8 text-foreground-soft">{l.about}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="text-xs text-muted">پروانه</p>
                <p className="mt-1 text-sm font-bold text-foreground" dir="ltr">{l.licenseNo}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="text-xs text-muted">زمان پاسخ</p>
                <p className="mt-1 text-sm font-bold text-foreground">{l.responseTime}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="text-xs text-muted">امتیاز</p>
                <p className="mt-1 text-sm font-bold text-foreground">{faNum(l.rating.toFixed(1))}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="text-xs text-muted">بازدید</p>
                <p className="mt-1 text-sm font-bold text-foreground">{faNum(l.views.toLocaleString("en-US"))}</p>
              </div>
            </div>
          </section>

          {/* Services */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Icon name="check" className="h-5 w-5 text-success" /> خدمات
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {l.services.map((s) => (
                <div key={s} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground-soft">
                  <Icon name="check" className="h-4 w-4 text-success" /> {s}
                </div>
              ))}
            </div>
          </section>

          {/* Reviews */}
          <section>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Icon name="star" className="h-5 w-5 text-accent" /> نظرات کاربران
              </h2>
              <span className="text-sm text-muted">{faNum(lawyerReviews.length)} نظر</span>
            </div>
            {lawyerReviews.length === 0 ? (
              <div className="mt-3"><EmptyState title="هنوز نظری ثبت نشده است" icon="chat" /></div>
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
            <h3 className="font-bold text-foreground">تعرفه مشاوره</h3>
            <div className="space-y-2">
              {pricing.map((p) => (
                <div key={p.key} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icon name={p.icon} className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{p.label}</p>
                    <p className="text-xs text-muted">{p.features.join(" • ")}</p>
                  </div>
                  <p className="text-sm font-bold text-foreground">{faPrice(p.price)}</p>
                </div>
              ))}
            </div>
            <FavoriteButton lawyerId={l.id} lawyerName={l.name} />
            <Button href={`/consultation?lawyer=${l.slug}`} icon="calendar" className="w-full">
              رزرو مشاوره
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button href={`/consultation?lawyer=${l.slug}&type=chat`} variant="outline" size="sm" icon="chat">
                پیام
              </Button>
              <Button href={`/case/new?lawyer=${l.slug}`} variant="outline" size="sm" icon="folder">
                درخواست وکالت
              </Button>
            </div>
            <TrustLine compact className="justify-start pt-1" />
          </Card>

          <Card hover={false}>
            <h3 className="flex items-center gap-2 font-bold text-foreground">
              <Icon name="clock" className="h-4 w-4 text-accent" /> زمان‌های آزاد
            </h3>
            <div className="mt-3">
              <AvailabilityPanel lawyerSlug={l.slug} />
            </div>
          </Card>

          <Card hover={false} className="bg-primary-soft/50">
            <p className="flex items-start gap-2 text-xs leading-6 text-foreground-soft">
              <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              هویت و پروانه این وکیل توسط کارشناسان دادبان راستی‌آزمایی شده است. مبلغ نهایی پیش از
              پرداخت مشخص است و بازگشت وجه طبق سیاست شفاف انجام می‌شود.
            </p>
          </Card>
        </aside>
      </Container>

      {/* Related */}
      {related.length > 0 && (
        <Container className="pb-12">
          <h2 className="text-xl font-bold text-foreground">وکلای مرتبط</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => {
              const relatedLawyer = r;
              return (
                <a key={relatedLawyer.id} href={`/lawyers/${relatedLawyer.slug}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                  <LawyerPhoto name={relatedLawyer.name} color={relatedLawyer.avatarColor} photoUrl={relatedLawyer.photoUrl} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{relatedLawyer.name}</p>
                    <p className="text-xs text-muted">{relatedLawyer.city} • {faNum(relatedLawyer.experienceYears)} سال</p>
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

      {/* CTA چسبان موبایل — رزرو همیشه در دسترس */}
      <StickyCta
        href={`/consultation?lawyer=${l.slug}`}
        label={`رزرو مشاوره با ${l.name}`}
        sub={`از ${faPrice(l.priceChat)} • پرداخت امن • ضمانت بازگشت وجه`}
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumbLd]) }} />
    </>
  );
}
