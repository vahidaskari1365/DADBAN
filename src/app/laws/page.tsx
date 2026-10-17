import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { Container, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { FaqSection } from "@/components/seo/faq-section";
import { safeJsonLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";
import { getLaws } from "@/lib/content-store";
import { LAW_CATEGORIES, LAWS_UPDATED, type Law, type LawCategory } from "@/lib/laws-content";

export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: "مرکز قوانین ایران | متن، توضیح و مواد کلیدی ۲۹ قانون",
    description:
      "مجموعه کامل قوانین ایران به زبان ساده: قانون مدنی، حمایت خانواده، مجازات اسلامی، صدور چک، کار، تجارت، مالیات و قوانین جدید املاک — همراه با مواد کلیدی، پاسخ سوالات متداول و راهنمای کاربرد در پرونده.",
    alternates: { canonical: "/laws" },
    openGraph: {
      title: "مرکز قوانین ایران | دادورزان",
      description: "۲۹ قانون مهم ایران با توضیح کامل، مواد کلیدی و پرسش‌های متداول به زبان ساده.",
      url: `${SITE_URL}/laws`,
    },
  };
}

const HUB_INTRO_LEAD =
  "مرکز قوانین دادورزان، مجموعه مرجع ۲۹ قانون مهم ایران در ۷ دسته است: از قانون مدنی و حمایت خانواده تا مجازات اسلامی، صدور چک، کار، تجارت، مالیات و قوانین جدید املاک ۱۴۰۳. هر قانون با توضیح ساده، جدول مواد کلیدی، نکات عدددار و پرسش‌های متداول ارائه می‌شود تا پیش از مشورت با وکیل، تصویر درستی از حقوق و تعهدات خود داشته باشید. متن قوانین در منابع رسمی در دسترس است؛ تفسیر کاربردی آن در پرونده شما کار وکیل متخصص است.";

const HUB_FAQS = [
  {
    q: "مرکز قوانین دادورزان چه کمکی به من می‌کند؟",
    a: "هر قانون مهم ایران را به زبان ساده توضیح داده‌ایم: چه چیزی را مقرر می‌کند، کدام مواد آن در پرونده‌های واقعی بیشترین استناد را دارند و برای مسیر بعدی (وکیل، محاسبه‌گر، ثبت پرونده) چه گزینه‌هایی دارید. این مرکز برای پیش‌مطالعه پیش از مشورت حقوقی طراحی شده است، نه جایگزین آن.",
  },
  {
    q: "متن کامل قوانین را کجا می‌توانم ببینم؟",
    a: "متن رسمی همه قوانین در سامانه‌های رسمی مانند مرکز پژوهش‌های مجلس و روزنامه رسمی کشور در دسترس است. در دادورزان، به‌جای تکرار متن خام، توضیح کاربردی هر قانون، جدول مواد کلیدی و پاسخ سوالات رایج را ارائه می‌کنیم — چیزی که در پرونده واقعاً به کار شما می‌آید.",
  },
  {
    q: "برای هر مشکل حقوقی کدام قانون را بخوانم؟",
    a: "قانون‌گذاری تخصص‌محور است: مهریه و طلاق → قانون حمایت خانواده ۱۳۹۱ و قانون مدنی؛ چک برگشتی → قانون صدور چک ۱۳۸۲؛ اخراج و حقوق → قانون کار ۱۳۶۹؛ اجاره و سند → قانون روابط موجر و مستأجر ۱۳۷۶ و قوانین ثبت. در هر صفحه قانون، مسیرهای مرتبط (وکیل تخصصی و محاسبه‌گر) هم معرفی شده است.",
  },
  {
    q: "آیا توضیحات قوانین به‌روز است؟",
    a: "بله؛ محتوای مرکز قوانین به‌صورت دوره‌ای بازبینی می‌شود و آخرین به‌روزرسانی آن مهر ۱۴۰۵ است — شامل قوانین جدید مانند الزام به ثبت رسمی معاملات املاک (۱۴۰۳). در صفحه هر قانون، تاریخ بازبینی درج شده است.",
  },
];

function LawCard({ law, index }: { law: Law; index: number }) {
  return (
    <Reveal delay={(index % 6) * 40}>
      <Link
        href={`/laws/${law.slug}`}
        className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon name="landmark" className="h-5 w-5" />
          </span>
          <Badge tone={law.status === "معتبر" ? "success" : "accent"}>{law.status}</Badge>
        </div>
        <h3 className="mt-3 text-base font-bold text-foreground">{law.name}</h3>
        <p className="mt-1 line-clamp-3 flex-1 text-xs leading-6 text-muted">{law.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {law.subjects.slice(0, 3).map((s) => (
            <Badge key={s} tone="neutral">{s}</Badge>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted">
          مصوب {law.year} • {law.authority} • به‌روزرسانی {law.updated}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">
          توضیح کامل و مواد کلیدی
          <Icon name="arrow" className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
        </span>
      </Link>
    </Reveal>
  );
}

export default async function LawsPage() {
  const t = await getT();
  const locale = await getServerLocale();

  const laws = await Promise.all(
    (await getLaws()).map(async (l) => {
      if (locale === "fa") return l;
      const [name, summary, authority, ...subjects] = await Promise.all([
        tdyn(locale, l.name, 300),
        tdyn(locale, l.summary, 700),
        tdyn(locale, l.authority, 200),
        ...l.subjects.map((s) => tdyn(locale, s, 200)),
      ]);
      return { ...l, name, summary, authority, subjects };
    }),
  );

  const byCategory = (cat: LawCategory) => laws.filter((l) => l.category === cat.slug);

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/laws#page`,
        name: "مرکز قوانین ایران — دادورزان",
        description:
          "توضیح کامل ۲۹ قانون مهم ایران به زبان ساده با جدول مواد کلیدی، نکات عدددار و پرسش‌های متداول؛ همراه با مسیرهای وکیل تخصصی و محاسبه‌گرهای حقوقی.",
        url: `${SITE_URL}/laws`,
        isPartOf: { "@id": `${SITE_URL}/#organization` },
        dateModified: LAWS_UPDATED,
        inLanguage: "fa-IR",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "دادورزان", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "مرکز قوانین", item: `${SITE_URL}/laws` },
        ],
      },
      {
        "@type": "ItemList",
        "@id": `${SITE_URL}/laws#items`,
        name: "قوانین ایران در مرکز قوانین دادورزان",
        numberOfItems: laws.length,
        itemListElement: laws.map((l, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: l.name,
          url: `${SITE_URL}/laws/${l.slug}`,
        })),
      },
    ],
  };

  return (
    <main className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />

      <PageHero
        variant="market"
        image="/images/hero-laws.png"
        badge="مرکز قوانین"
        title="قوانین ایران، به زبان ساده و کاربردی"
        desc="۲۹ قانون مهم کشور در ۷ دسته — همراه با توضیح کامل، جدول مواد کلیدی و پاسخ پرسش‌های رایج."
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("قوانین") }]}
        chips={[
          { icon: "landmark", label: `${laws.length} قانون مصوب` },
          { icon: "book", label: `${LAW_CATEGORIES.length} دسته موضوعی` },
          { icon: "clock", label: `آخرین بازبینی: ${LAWS_UPDATED}` },
        ]}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/lawyers" icon="search">{t("پیدا کردن وکیل متخصص")}</Button>
          <Button href="/consultation" variant="outline" icon="chat">{t("مشاوره حقوقی فوری")}</Button>
        </div>
      </PageHero>

      <Container className="py-10">
        {/* بلوک citation-ready — پاسخ مستقیم قابل نقل (AEO/GEO) */}
        <section
          aria-label="پاسخ کوتاه درباره مرکز قوانین"
          className="rounded-3xl border border-primary/20 bg-primary-soft p-6 sm:p-8"
        >
          <div className="flex items-start gap-4">
            <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Icon name="quote" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-black text-foreground sm:text-base">پاسخ کوتاه</h2>
              <p className="mt-2 text-sm leading-8 text-foreground-soft">{HUB_INTRO_LEAD}</p>
            </div>
          </div>
        </section>

        {/* فهرست سریع دسته‌ها */}
        <nav aria-label="دسته‌بندی قوانین" className="mt-8 flex flex-wrap gap-2">
          {LAW_CATEGORIES.map((c) => (
            <a
              key={c.slug}
              href={`#cat-${c.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft"
            >
              <Icon name={c.icon} className="h-3.5 w-3.5 text-primary" />
              {c.label}
              <span className="text-muted">({byCategory(c).length})</span>
            </a>
          ))}
        </nav>

        {/* بخش‌های دسته‌بندی */}
        {LAW_CATEGORIES.map((cat) => {
          const items = byCategory(cat);
          if (!items.length) return null;
          return (
            <section key={cat.slug} id={`cat-${cat.slug}`} className="mt-12 scroll-mt-24" aria-label={cat.label}>
              <div className="mb-5 flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Icon name={cat.icon} className="h-5.5 w-5.5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-foreground sm:text-xl">{cat.label}</h2>
                    <p className="mt-0.5 text-xs text-muted">{cat.desc}</p>
                  </div>
                </div>
                <Badge tone="neutral">{items.length} قانون</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((l, i) => (
                  <LawCard key={l.slug} law={l} index={i} />
                ))}
              </div>
            </section>
          );
        })}

        {/* FAQ مرکز قوانین + FAQPage schema */}
        <div className="mt-14">
          <FaqSection items={HUB_FAQS} title="پرسش‌های متداول درباره مرکز قوانین" canonicalPath="/laws" />
        </div>

        {/* لینک‌های داخلی SXO */}
        <section aria-label="مسیرهای مرتبط" className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { href: "/calculators", icon: "calculator" as const, title: "محاسبه‌گرهای حقوقی", desc: "مهریه، دیه، سنوات و خسارات را دقیق حساب کنید." },
            { href: "/legal-forms", icon: "document" as const, title: "فرم‌های حقوقی", desc: "دادخواست، شکواییه و اظهارنامه با راهنمای گام‌به‌گام." },
            { href: "/judgments", icon: "scale" as const, title: "بانک آرای قضایی", desc: "رویه قضایی واقعی درباره چک، مهریه و اخراج." },
          ].map((x) => (
            <Link
              key={x.href}
              href={x.href}
              className="group rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon name={x.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-sm font-bold text-foreground">{t(x.title)}</h3>
              <p className="mt-1 text-xs leading-6 text-muted">{t(x.desc)}</p>
            </Link>
          ))}
        </section>
      </Container>
    </main>
  );
}
