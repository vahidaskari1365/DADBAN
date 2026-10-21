import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { FaqSection } from "@/components/seo/faq-section";
import { SeoLinkGrid } from "@/components/seo/link-grid";
import { safeJsonLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";
import { getLawEntry, getLaws } from "@/lib/content-store";
import { getLawCategory, getRelatedLaws, type Law } from "@/lib/laws-content";

export const revalidate = 0;

/**
 * حلقه لینک داخلی قانون→مقاله (گام ۵ Hub/Spoke) — فقط قوانینی که راهنمای مرتبط دارند.
 * اسلاگ‌ها از کاتالوگ قوانین؛ لینک‌ها به راهنماهای عمیق مجله با استناد به همین قوانین.
 */
const LAW_RELATED_ARTICLES: Record<string, { label: string; href: string }[]> = {
  "ghanun-sodoor-check": [
    { label: "چک برگشتی چگونه وصول می‌شود؟", href: "/knowledge/check-bargasht-che-konim" },
    { label: "شکایت کیفری چک: شرایط و مراحل", href: "/knowledge/sharayet-shekat-keifari" },
    { label: "اجرای حکم چک و توقیف اموال بدهکار", href: "/knowledge/hagh-ejra-ahkam" },
  ],
  "ghanun-vekalat": [
    { label: "تفاوت وکیل پایه یک و مشاور حقوقی", href: "/knowledge/tafavot-vakil-payeh-yek-moshaver" },
    { label: "هزینه وکیل و تعرفه وکالت ۱۴۰۵", href: "/knowledge/hazine-vakil-tarefe-vekalat" },
    { label: "مشاوره حقوقی با هوش مصنوعی", href: "/knowledge/moshaver-hoghoghi-hoosh-masnooie" },
  ],
  "ghanun-madani": [
    { label: "تکلیف قانونی مهریه", href: "/knowledge/mehrieh-taklif-ghanooni" },
    { label: "حضانت فرزند پس از جدایی", href: "/knowledge/hazant-farzand-pas-az-jodayi" },
    { label: "اجاره‌نامه امانی چه خطرهایی دارد؟", href: "/knowledge/aghrarname-ejare-amin" },
    { label: "تقسیم ارث چگونه است؟", href: "/knowledge/taghsim-ers" },
  ],
  "ghanun-hemayat-khanevade": [
    { label: "مراحل طلاق توافقی", href: "/knowledge/marahel-talaq-tavafoghi" },
    { label: "تکلیف قانونی مهریه", href: "/knowledge/mehrieh-taklif-ghanooni" },
    { label: "حضانت فرزند پس از جدایی", href: "/knowledge/hazant-farzand-pas-az-jodayi" },
  ],
  "ghanun-omoor-hasbi": [
    { label: "راهنمای انحصار وراثت", href: "/knowledge/anhesar-verasat-rahnama" },
    { label: "تقسیم ارث چگونه است؟", href: "/knowledge/taghsim-ers" },
  ],
  "aghname-dadrasi-madani": [
    { label: "اجرای احکام مدنی گام‌به‌گام", href: "/knowledge/hagh-ejra-ahkam" },
    { label: "چک برگشتی چگونه وصول می‌شود؟", href: "/knowledge/check-bargasht-che-konim" },
  ],
  "aghname-dadrasi-keyfari": [
    { label: "شکایت کیفری: شرایط و مراحل", href: "/knowledge/sharayet-shekat-keifari" },
    { label: "شکایت کلاهبرداری", href: "/knowledge/shakayat-kolahbardari" },
  ],
  "ghanun-mojazat-islami": [
    { label: "شکایت کیفری: شرایط و مراحل", href: "/knowledge/sharayet-shekat-keifari" },
    { label: "خیانت در امانت", href: "/knowledge/khiyanat-amanat-jorm" },
    { label: "شکایت کلاهبرداری", href: "/knowledge/shakayat-kolahbardari" },
  ],
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getT();
  const law = await getLawEntry(slug);
  if (!law) return { title: t("قانون یافت نشد") };
  const locale = await getServerLocale();
  const [name, summary] = await Promise.all([tdyn(locale, law.name, 300), tdyn(locale, law.summary, 700)]);
  return {
    title: `${name} چیست؟ توضیح کامل، مواد کلیدی و پرسش‌های متداول`,
    description: summary,
    alternates: { canonical: `/laws/${slug}` },
    openGraph: {
      title: { absolute: `${name} — توضیح کامل | دادورزان` },
      description: summary,
      url: `${SITE_URL}/laws/${slug}`,
    },
  };
}

export default async function LawPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getT();
  const locale = await getServerLocale();
  const law = await getLawEntry(slug);
  if (!law) notFound();

  // ترجمهٔ عنوان/توضیح/مرجع/موضوعات — محتوای تحریریهٔ AEO فقط در فارسی ارائه می‌شود
  let l: Law = law;
  if (locale !== "fa") {
    const [name, summary, authority, ...subjects] = await Promise.all([
      tdyn(locale, law.name, 300),
      tdyn(locale, law.summary, 700),
      tdyn(locale, law.authority, 200),
      ...law.subjects.map((s) => tdyn(locale, s, 200)),
    ]);
    l = { ...law, name, summary, authority, subjects };
  }

  const category = getLawCategory(l.category);
  const relatedLaws = getRelatedLaws(l, 4);
  const canonical = `/laws/${l.slug}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${SITE_URL}${canonical}#article`,
        headline: `${l.name} چیست؟ توضیح کامل، مواد کلیدی و پرسش‌های متداول`,
        description: l.summary,
        url: `${SITE_URL}${canonical}`,
        inLanguage: "fa-IR",
        dateModified: l.updated,
        isPartOf: { "@id": `${SITE_URL}/#organization` },
        about: {
          "@type": "Legislation",
          name: l.name,
          legislationDate: l.year,
          legislationType: "قانون",
          jurisdiction: { "@type": "Country", name: "ایران" },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "دادورزان", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "مرکز قوانین", item: `${SITE_URL}/laws` },
          { "@type": "ListItem", position: 3, name: l.name, item: `${SITE_URL}${canonical}` },
        ],
      },
      /* FAQPage schema فقط یک‌بار و توسط <FaqSection /> تزریق می‌شود —
         تکرار با @id یکسان خلاف گایدلاین ساختاریافتهٔ گوگل است. */
    ],
  };

  return (
    <main className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />

      <PageHero
        variant="market"
        image="/images/hero-laws.png"
        badge={`مرکز قوانین • ${category.label}`}
        title={l.name}
        desc={l.summary}
        breadcrumb={[
          { label: t("خانه"), href: "/" },
          { label: t("قوانین"), href: "/laws" },
          { label: l.name },
        ]}
        chips={[
          { icon: "landmark", label: `مصوب ${l.year}` },
          { icon: "certificate", label: l.status },
          { icon: "clock", label: `بازبینی: ${l.updated}` },
        ]}
      />

      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_300px]">
        <article className="space-y-6">
          {/* بلوک citation-ready — پاسخ مستقیم قابل نقل (AEO/GEO) */}
          <section
            aria-label="پاسخ کوتاه"
            className="rounded-3xl border border-primary/20 bg-primary-soft p-6 sm:p-8"
          >
            <div className="flex items-start gap-4">
              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Icon name="quote" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-black text-foreground sm:text-base">{l.name} در یک نگاه</h2>
                <p className="mt-2 text-sm leading-8 text-foreground-soft">{l.introLead}</p>
              </div>
            </div>
          </section>

          {/* پاسخ مستقیم به «X چیست؟» (AIO — سوال‌محور) */}
          <Card hover={false}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground sm:text-xl">
              <Icon name="scale" className="h-5 w-5 text-primary" />
              {l.name} چیست؟
            </h2>
            <p className="mt-3 text-sm font-bold leading-8 text-foreground">{l.purpose}</p>
            {l.intro.map((p, i) => (
              <p key={i} className="mt-3 text-sm leading-8 text-foreground-soft">{p}</p>
            ))}
          </Card>

          {/* جدول مواد کلیدی (GEO — ساختار جدولی) */}
          {l.keyArticles.length > 0 && (
            <Card hover={false}>
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground sm:text-xl">
                <Icon name="book" className="h-5 w-5 text-primary" />
                مواد کلیدی {l.name}
              </h2>
              <p className="mt-2 text-xs leading-6 text-muted">
                پرمصرف‌ترین مواد این قانون در پرونده‌های واقعی؛ متن کامل مواد در منابع رسمی در دسترس است.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-right text-xs text-muted">
                      <th scope="col" className="py-2 pl-2 font-bold">ماده</th>
                      <th scope="col" className="py-2 font-bold">موضوع</th>
                      <th scope="col" className="py-2 pr-2 font-bold">حکم در یک جمله</th>
                    </tr>
                  </thead>
                  <tbody>
                    {l.keyArticles.map((a) => (
                      <tr key={a.no} className="border-b border-border/60 align-top">
                        <td className="py-3 pl-2 font-bold whitespace-nowrap text-primary">{a.no}</td>
                        <td className="py-3 font-semibold text-foreground">{a.title}</td>
                        <td className="py-3 pr-2 leading-7 text-foreground-soft">{a.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* نکات کلیدی عدددار */}
          {l.highlights.length > 0 && (
            <Card hover={false} className="bg-surface-2">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground sm:text-xl">
                <Icon name="star" className="h-5 w-5 text-primary" />
                نکات کلیدی
              </h2>
              <ul className="mt-4 space-y-2.5">
                {l.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm leading-7 text-foreground-soft">
                    <span className="mt-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-black text-primary">
                      {i + 1}
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* موضوعات تحت پوشش */}
          <Card hover={false}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Icon name="filter" className="h-5 w-5 text-primary" /> موضوعات تحت این قانون
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {l.subjects.map((s) => <Badge key={s} tone="primary">{s}</Badge>)}
            </div>
          </Card>

          {/* FAQ + FAQPage schema (AEO) */}
          {l.faqs.length > 0 && (
            <FaqSection items={l.faqs} title={`پرسش‌های متداول درباره ${l.name}`} canonicalPath={canonical} />
          )}
        </article>

        {/* سایدبار SXO — مسیرهای خدماتی */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card hover={false} className="bg-gradient-to-br from-primary to-primary-hover text-primary-foreground">
            <h3 className="text-sm font-bold">کاربرد این قانون در پرونده شما</h3>
            <p className="mt-1 text-xs text-white/80">
              برای تفسیر و اجرای {l.name} در پرونده‌ی خود، با وکیل متخصص مشورت کنید.
            </p>
            <Button href="/lawyers" variant="accent" className="mt-3 w-full" size="sm">
              {t("پیدا کردن وکیل")}
            </Button>
            <Button href="/case/new" variant="ghost" className="mt-2 w-full border border-white/30 text-white hover:bg-white/10" size="sm">
              {t("ثبت پرونده")}
            </Button>
          </Card>

          {/* لینک‌های خدماتی مرتبط (SXO) */}
          {l.relatedRoutes.length > 0 && (
            <Card hover={false}>
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Icon name="link" className="h-4 w-4 text-primary" /> مسیرهای مرتبط
              </h3>
              <div className="mt-3 space-y-2">
                {l.relatedRoutes.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft"
                  >
                    <span className="flex items-center gap-2">
                      {r.icon && <Icon name={r.icon} className="h-4 w-4 text-primary" />}
                      {r.label}
                    </span>
                    <Icon name="arrow" className="h-3.5 w-3.5 text-muted" />
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </aside>
      </Container>

      {/* قوانین مرتبط — لینک‌سازی داخلی (SEO/GEO) */}
      <Container>
        <section aria-label="قوانین مرتبط" className="mt-4">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <Icon name="landmark" className="h-5 w-5 text-primary" /> قوانین مرتبط
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedLaws.map((rl) => (
              <Link
                key={rl.slug}
                href={`/laws/${rl.slug}`}
                className="group rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icon name="landmark" className="h-4 w-4" />
                  </span>
                  <Badge tone="neutral">{rl.year}</Badge>
                </div>
                <h3 className="mt-2.5 text-sm font-bold text-foreground">{rl.name}</h3>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted">{rl.summary}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* حلقه لینک قانون→مقاله (گام ۵ Hub/Spoke) — فقط قوانین دارای راهنمای مرتبط */}
        {LAW_RELATED_ARTICLES[l.slug] && (
          <SeoLinkGrid
            title={`راهنماهای کاربردی مرتبط با ${l.name}`}
            links={LAW_RELATED_ARTICLES[l.slug]}
          />
        )}
      </Container>
    </main>
  );
}
