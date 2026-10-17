import type { Metadata } from "next";
import { Container, Button, Badge, Card } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { SeoLinkGrid } from "@/components/seo/link-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { safeJsonLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";
import { SITE_NAME } from "@/lib/brand";
import { TARIFF_1405, TARIFF_YEAR, TARIFF_DISCLAIMER, FEE_FAQS, SPECIALTY_LANDINGS } from "@/lib/seo-landings";

/**
 * /fee-guide — تعرفه حق‌الوکاله وکیل (پرهزینه‌ترین گپ سئو بازار).
 * کلمات هدف: تعرفه وکالت ۱۴۰۵، حق‌الوکاله وکیل، هزینه وکیل طلاق/کیفری/ملکی...
 * ساختار AEO: پاسخ خودکفای ۱۵۰ کلمه‌ای زیر H1 + جدول‌های قابل‌نقل + FAQPage schema.
 */
export const metadata: Metadata = {
  title: "تعرفه حق‌الوکاله وکیل ۱۴۰۵ | جدول کامل هزینه وکالت — دادورزان",
  description:
    "جدول کامل تعرفه وکالت ۱۴۰۵: دعاوی مالی (۸٪ تا ۳٪ خواسته)، خانواده، کیفری، دیوان عدالت اداری و قرارهای دادگاه + راهنمای پرداخت قسطی حق‌الوکاله. شفاف و بدون مخفی‌کاری.",
  alternates: { canonical: "/fee-guide" },
  openGraph: {
    title: "تعرفه حق‌الوکاله وکیل ۱۴۰۵ | جدول کامل هزینه وکالت",
    description:
      "همه مبالغ تعرفه وکالت ۱۴۰۵ در یک صفحه: دعاوی مالی، خانواده، کیفری و دیوان عدالت اداری + سوالات متداول هزینه وکیل.",
    type: "article",
    url: `${SITE_URL}/fee-guide`,
  },
  keywords: [
    "تعرفه وکالت ۱۴۰۵", "حق الوکاله وکیل", "هزینه وکیل", "تعرفه وکالت",
    "هزینه وکیل طلاق", "هزینه وکیل کیفری", "هزینه وکیل ملکی", "حق الوکاله دعاوی مالی",
  ],
};

export default function FeeGuidePage() {
  const answerBlock =
    `حق‌الوکاله وکیل در سال ${TARIFF_YEAR} بر اساس نوع پرونده محاسبه می‌شود: در دعاوی مالی از ۸٪ بهای خواسته شروع و پلکانی تا ۳٪ مازاد کاهش می‌یابد؛ دعاوی خانوادگی بین ۵۰۰ هزار تا ۲۰ میلیون تومان و امور کیفری بین ۲۰۰ هزار تا ۲۰۰ میلیون تومان است. مبلغ نهایی در قرارداد وکالت با توافق وکیل و موکل، در بازه حداقل و حداکثر تعرفه تعیین می‌شود و در دادورزان تعرفه همه وکلا شفاف اعلام و پرداخت قسطی نیز امکان‌پذیر است.`;

  const pageSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${SITE_URL}/fee-guide#article`,
        headline: `تعرفه حق‌الوکاله وکیل ${TARIFF_YEAR} — جدول کامل`,
        description: metadata.description,
        url: `${SITE_URL}/fee-guide`,
        inLanguage: "fa-IR",
        author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        dateModified: new Date().toISOString(),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "دادورزان", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "تعرفه وکالت", item: `${SITE_URL}/fee-guide` },
        ],
      },
    ],
  };

  const tables = [
    TARIFF_1405.financial,
    TARIFF_1405.family,
    TARIFF_1405.criminal,
    TARIFF_1405.orders,
    TARIFF_1405.misc,
  ];

  return (
    <main className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(pageSchema) }} />

      <PageHero
        title="تعرفه حق‌الوکاله وکیل"
        badge={`به‌روز برای سال ${TARIFF_YEAR}`}
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "تعرفه وکالت" }]}
        desc="جدول شفاف و کامل هزینه وکالت: دعاوی مالی، خانواده، کیفری و سایر مراجع — بدون مخفی‌کاری."
        chips={[
          { icon: "coins", label: "دعاوی مالی: ۸٪ تا ۳٪ خواسته" },
          { icon: "family", label: "خانواده: ۵۰۰ هزار تا ۲۰ میلیون" },
          { icon: "shield", label: "کیفری: مرحله‌به‌مرحله" },
        ]}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/lawyers" icon="search">جستجوی وکیل با تعرفه شفاف</Button>
          <Button href="/fee-payment" variant="outline" icon="money">پرداخت قسطی حق‌الوکاله</Button>
        </div>
      </PageHero>

      <Container className="mt-8 space-y-8">
        {/* بلوک پاسخ خودکفا — AEO citation-ready */}
        <Card hover={false} className="border-primary/25 bg-surface-2">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-foreground">
            <Icon name="coins" className="h-5 w-5 text-primary" />
            {`حق‌الوکاله وکیل چقدر است؟ (خلاصه ${TARIFF_YEAR})`}
          </h2>
          <p className="text-sm leading-8 text-foreground-soft">{answerBlock}</p>
        </Card>

        {/* جدول‌های تعرفه */}
        {tables.map((t, i) => (
          <section key={t.title} aria-labelledby={`tariff-${i}`} className="scroll-mt-24">
            <div className="mb-3 flex items-center gap-2">
              <h2 id={`tariff-${i}`} className="text-lg font-black text-foreground sm:text-xl">
                {t.title}
              </h2>
              <Badge tone="primary">{TARIFF_YEAR}</Badge>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-right text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2 text-xs text-muted">
                      <th scope="col" className="p-3.5 font-bold">موضوع</th>
                      <th scope="col" className="p-3.5 font-bold">نرخ / مبلغ (تومان)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r) => (
                      <tr key={r.label} className="border-b border-border/60 last:border-0 hover:bg-surface-2/60">
                        <td className="p-3.5 leading-6 text-foreground">{r.label}</td>
                        <td className="whitespace-nowrap p-3.5 font-bold text-primary">
                          {r.rate ?? r.range}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-border bg-surface-2/50 p-3.5 text-xs leading-6 text-muted">
                {t.note}
              </p>
            </div>
          </section>
        ))}

        <p className="rounded-2xl border border-border bg-surface p-4 text-xs leading-6 text-muted">
          ⚖️ {TARIFF_DISCLAIMER}
        </p>

        {/* CTA */}
        <Card hover={false} className="text-center">
          <h2 className="text-lg font-black text-foreground">برآورد دقیق هزینه پرونده شما</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted">
            پرونده خود را ثبت کنید تا وکلای متخصص، برآورد حق‌الوکاله و مسیر دعوا را پیش از هر تعهدی برایتان بفرستند.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button href="/case/new" icon="folder">ثبت پرونده و دریافت برآورد</Button>
            <Button href="/consultation" variant="outline" icon="chat">مشاوره فوری با وکیل</Button>
            <Button href="/calculators" variant="ghost" icon="calculator">محاسبه‌گرهای حقوقی</Button>
          </div>
        </Card>

        {/* FAQ با schema */}
        <FaqSection items={FEE_FAQS} canonicalPath="/fee-guide" />

        {/* لینک‌های مرتبط — صفحات فرود تخصص */}
        <SeoLinkGrid
          title="هزینه وکیل به تفکیک تخصص"
          links={SPECIALTY_LANDINGS.map((s) => ({
            label: `هزینه و ${s.h1}`,
            href: `/lawyers/specialty/${s.slug}`,
          }))}
        />
      </Container>
    </main>
  );
}
