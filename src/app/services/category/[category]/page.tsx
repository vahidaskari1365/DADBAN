import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button, Badge, StarRating } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { or, sql } from "drizzle-orm";
import { SERVICE_CATEGORIES, SERVICE_STEPS } from "@/lib/content";
import { faNum } from "@/lib/data";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";
import { templateT } from "@/lib/i18n/core";
import Link from "next/link";
import { safeJsonLd } from "@/lib/jsonld";

export const dynamic = "force-dynamic";

const CATEGORY_SPECIALTIES: Record<string, string[]> = {
  family: ["خانواده", "ارث"],
  property: ["ملک"],
  criminal: ["کیفری"],
  commercial: ["قراردادها", "تجارت", "شرکت‌ها", "چک و اسناد"],
  administrative: ["کار", "مالیاتی"],
};

/** Keyword-rich metadata برای هر دسته — بر اساس Keyword Research. */
const CATEGORY_META: Record<string, {
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
}> = {
  family: {
    title: "وکیل خانواده | طلاق، مهریه، حضانت، نفقه و ارث",
    description:
      "وکیل متخصص دعاوی خانواده: طلاق توافقی و یک‌طرفه، مطالبه مهریه و اجرت‌المثل، حضانت فرزندان، نفقه و تقسیم ارث. مشاوره آنلاین و رزرو نوبت با بهترین وکلای خانواده ایران.",
    keywords: ["وکیل خانواده", "وکیل طلاق", "وکیل مهریه", "وکیل حضانت", "طلاق توافقی", "مطالبه مهریه", "نفقه", "ارث", "انحصار وراثت"],
    ogImage: "/og-family.jpg",
  },
  property: {
    title: "وکیل ملکی | تخلیه، تصرف عدوانی، اجاره، سند و سرقفلی",
    description:
      "وکیل متخصص دعاوی ملکی: تخلیه ملک، الزام به تنظیم سند رسمی، تصرف عدوانی و خلع ید، افراز و فروش، سرقفلی و اجاره. مشاوره آنلاین با وکلای ملکی دادورزان.",
    keywords: ["وکیل ملکی", "وکیل تخلیه", "وکیل تصرف عدوانی", "وکیل سرقفلی", "الزام به تنظیم سند", "اجاره", "افراز"],
    ogImage: "/og-property.jpg",
  },
  criminal: {
    title: "وکیل کیفری | کلاهبرداری، سرقت، خیانت در امانت و جعل",
    description:
      "وکیل متخصص دعاوی کیفری: کلاهبرداری، سرقت، خیانت در امانت، جعل و جرایم رایانه‌ای. دفاع تخصصی در مرحله دادسرا و دادگاه با وکلای کیفری دادورزان.",
    keywords: ["وکیل کیفری", "وکیل کلاهبرداری", "وکیل سرقت", "وکیل خیانت در امانت", "وکیل جعل", "دفاع کیفری"],
    ogImage: "/og-criminal.jpg",
  },
  commercial: {
    title: "وکیل تجاری | قراردادها، شرکت‌ها، چک و اسناد تجاری",
    description:
      "وکیل متخصص دعاوی تجاری: تنظیم و بررسی قراردادها، ثبت شرکت و تغییرات، چک برگشتی و اسناد تجاری، دعاوی تجاری و داوری. مشاوره با وکلای تجاری دادورزان.",
    keywords: ["وکیل تجاری", "وکیل قرارداد", "ثبت شرکت", "چک برگشتی", "اسناد تجاری", "داوری", "حقوق شرکت‌ها"],
    ogImage: "/og-commercial.jpg",
  },
  administrative: {
    title: "وکیل کار و مالیاتی | حقوق کارگر و کارفرما، مالیات",
    description:
      "وکیل متخصص دعاوی کار و مالیاتی: حقوق کارگر و کارفرما، تأخیر تأدیه، مالیات حقوقی و ارزش افزوده، اجرای احکام و امور اداری. مشاوره با وکلای کار و مالیاتی دادورزان.",
    keywords: ["وکیل کار", "وکیل مالیاتی", "حقوق کارگر", "حقوق کارفرما", "تأخیر تأدیه", "مالیات", "اجرای احکام"],
    ogImage: "/og-administrative.jpg",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const c = SERVICE_CATEGORIES.find((x) => x.slug === category);
  if (!c) return { title: (await getT())("خدمت یافت نشد") };
  const t = await getT();
  const meta = CATEGORY_META[category];
  if (!meta) {
    return {
      title: templateT(t)("خدمات حقوقی {name}", { name: c.name }),
      description: c.desc,
      alternates: { canonical: `/services/${category}` },
    };
  }
  const title = t(meta.title);
  const description = t(meta.description);
  return {
    title,
    description,
    keywords: meta.keywords,
    alternates: {
      canonical: `/services/category/${category}`,
      languages: { "fa-IR": `/services/category/${category}`, "x-default": `/services/category/${category}` },
    },
    openGraph: {
      title: `${title} | ${t("دادورزان")}`,
      description,
      url: `/services/category/${category}`,
      siteName: t("دادورزان"),
      locale: "fa_IR",
      type: "website",
      images: [{ url: meta.ogImage, width: 1200, height: 630, alt: title, type: "image/jpeg" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${t("دادورزان")}`,
      description,
      images: [meta.ogImage],
    },
    robots: { index: true, follow: true, googleBot: { "max-image-preview": "large", "max-snippet": -1 } },
  };
}

export default async function ServiceCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = SERVICE_CATEGORIES.find((x) => x.slug === category);
  if (!cat) return await notFoundUi();

  const t = await getT();
  const locale = await getServerLocale();
  const tt = templateT(t);

  // ترجمهٔ محتوای ایستای دسته و زیرخدمت‌ها (لایهٔ صفحه)
  const [catName, catDesc] = await Promise.all([tdyn(locale, cat.name, 200), tdyn(locale, cat.desc, 900)]);
  const catSubT = await Promise.all(cat.sub.map(async (s) => ({ ...s, name: await tdyn(locale, s.name, 150) })));

  const specs = CATEGORY_SPECIALTIES[category] ?? [];
  let lawyersList: (typeof lawyers.$inferSelect)[] = [];
  if (specs.length) {
    try {
      const rows = await db
        .select()
        .from(lawyers)
        .where(or(...specs.map((s) => sql`${lawyers.specialties} @> ARRAY[${s}]::text[]`)))
        .limit(4);
      lawyersList = await Promise.all(
        rows.map(async (l) => ({
          ...l,
          name: await tdyn(locale, l.name, 300),
          city: await tdyn(locale, l.city, 200),
        })),
      );
    } catch (err) {
      console.error("[dadban] category lawyers query failed:", err);
    }
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: tt("هزینه مشاوره {name} چقدر است؟", { name: catName }), acceptedAnswer: { "@type": "Answer", text: t("هزینه بسته به نوع مشاوره (متنی، صوتی، تصویری) متفاوت است و در هر پروفایل وکیل مشخص شده.") } },
      { "@type": "Question", name: t("چقدر طول می‌کشد؟"), acceptedAnswer: { "@type": "Answer", text: t("زمان بسته به پیچیدگی پرونده متغیر است؛ مشاوره اولیه معمولاً همان روز انجام می‌شود.") } },
    ],
  };

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-services.png"
        badge={tt("خدمات {name}", { name: catName })}
        title={tt("وکیل و مشاوره تخصصی {name}", { name: catName })}
        desc={catDesc}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("خدمات"), href: "/services" }, { label: catName }]}
      >
        <div className="flex flex-wrap gap-2">
          <Button href="/consultation" variant="accent" icon="chat">{t("درخواست مشاوره")}</Button>
          <Link href="/case/new" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-bold text-white transition-colors hover:bg-white/20"><Icon name="folder" className="h-4 w-4" />{t("ثبت پرونده")}</Link>
        </div>
      </PageHero>

      <Container className="py-12">
        {/* Sub-services */}
        <h2 className="text-xl font-bold text-foreground">{t("خدمات این حوزه")}</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {catSubT.map((s, i) => (
            <Reveal key={s.name} delay={i * 50}>
              <Link href={s.href} className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                  <Icon name={cat.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-foreground">{s.name}</h3>
                <span className="mt-auto pt-4 text-xs font-semibold text-primary">{t("شروع ←")}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>

      {/* Process */}
      <Container className="py-6">
        <h2 className="text-xl font-bold text-foreground">{t("مراحل کار")}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {SERVICE_STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-border bg-surface p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">{faNum(i + 1)}</span>
              <h3 className="mt-2 text-sm font-bold text-foreground">{t(s.title)}</h3>
            </div>
          ))}
        </div>
      </Container>

      {/* Required docs */}
      <Container className="py-6">
        <Card hover={false}>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Icon name="folder" className="h-5 w-5 text-primary" /> {t("مدارک معمول موردنیاز")}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {["مدارک هویتی", "اسناد و قراردادهای مرتبط", "مدارک موضوع پرونده", "استشهادیه (در صورت نیاز)"].map((d) => (
              <Badge key={d} tone="neutral">{t(d)}</Badge>
            ))}
          </div>
        </Card>
      </Container>

      {/* Specialist lawyers */}
      {lawyersList.length > 0 && (
        <Container className="py-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">{tt("وکلای متخصص {name}", { name: catName })}</h2>
            <Button href="/lawyers" variant="outline" size="sm" icon="arrow" className="">{t("همه وکلا")}</Button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {lawyersList.map((l) => (
              <Link key={l.id} href={`/lawyers/${l.slug}`} className="rounded-2xl border border-border bg-surface p-4 card-shadow transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white" style={{ background: l.avatarColor }}>{l.name.slice(0, 1)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{l.name}</p>
                    <p className="text-[11px] text-muted">{l.city}</p>
                  </div>
                </div>
                <div className="mt-2"><StarRating rating={l.rating} count={l.reviewCount} /></div>
              </Link>
            ))}
          </div>
        </Container>
      )}

      <Container className="py-12">
        <Reveal>
          <div className="rounded-3xl border border-border bg-gradient-to-br from-primary to-primary-hover p-8 text-center text-primary-foreground">
            <h2 className="text-xl font-bold">{tt("در زمینه‌ی {name} نیاز به مشاوره دارید؟", { name: catName })}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-white/85">{t("همین حالا مشاوره رزرو کنید یا پرونده‌تان را ثبت نمایید.")}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button href="/consultation" variant="accent" icon="chat">{t("رزرو مشاوره")}</Button>
              <Button href="/case/new" className="bg-white/15 text-white hover:bg-white/25" icon="folder">{t("ثبت پرونده")}</Button>
            </div>
          </div>
        </Reveal>
      </Container>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />
    </>
  );
}

async function notFoundUi() {
  const t = await getT();
  return (
    <Container className="py-20 text-center">
      <h1 className="text-2xl font-bold text-foreground">{t("خدمت یافت نشد")}</h1>
      <p className="mt-2 text-muted">{t("دسته‌بندی موردنظر وجود ندارد.")}</p>
      <Button href="/services" className="mt-6">{t("بازگشت به خدمات")}</Button>
    </Container>
  );
}
