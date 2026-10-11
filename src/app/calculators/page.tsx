import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { CalculatorsClient } from "@/components/calculators/calculators-client";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("محاسبه‌گرهای حقوقی"),
    description: t(
      "محاسبه‌گرهای حقوقی دادبان: مهریهٔ روز، دیه و درصدهای آن، خسارت تأخیر تأدیهٔ دیه، هزینهٔ دادرسی و حق‌الوکالهٔ دعاوی مالی — سریع، شفاف و با نرخ‌های قابل ویرایش.",
    ),
    alternates: { canonical: "/calculators" },
  };
}

export default async function CalculatorsPage() {
  const t = await getT();

  /* ─── داده‌های ساختاریافته برای نتایج غنی گوگل ─── */
  const siteName = t("دادبان");
  const calcUrl = `${SITE_URL}/calculators`;
  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t("محاسبه‌گرهای حقوقی دادبان"),
    url: calcUrl,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: "fa",
    description: t(
      "محاسبهٔ آنلاین مهریهٔ روز، دیه و درصدهای آن، خسارت تأخیر تأدیهٔ دیه، هزینهٔ دادرسی و حق‌الوکالهٔ دعاوی مالی بر اساس نرخ‌های روز ایران.",
    ),
    offers: { "@type": "Offer", price: "0", priceCurrency: "IRR" },
    publisher: { "@type": "Organization", name: siteName, url: SITE_URL },
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: t("مهریه چطور محاسبه می‌شود؟"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t(
            "در مطالبهٔ مهریهٔ حال، مبلغ مهریه بر اساس شاخص بهای کالا و خدمات بانک مرکزی (سال پایهٔ ۱۳۹۵) از تاریخ عقد تا زمان مطالبه تعدیل می‌شود؛ محاسبه‌گر دادبان همین ضریب را با امکان ویرایش نرخ محاسبه می‌کند.",
          ),
        },
      },
      {
        "@type": "Question",
        name: t("مبلغ دیه چگونه تعیین می‌شود؟"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t(
            "مبلغ دیهٔ کامل هر سال با ابلاغ رئیس قوهٔ قضاییه تعیین می‌شود؛ در ماه حرام ۶/۱ برابر و برای جنایت عمدی در ماه‌های چهارگانهٔ حرام دو برابر است. محاسبه‌گر دیه درصدها (ثلث تا کامل) و ماه حرام را پشتیبانی می‌کند.",
          ),
        },
      },
      {
        "@type": "Question",
        name: t("خسارت تأخیر تأدیهٔ دیه چگونه محاسبه می‌شود؟"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t(
            "خسارت تأخیر تأدیهٔ دیه بر اساس شاخص بهای کالا و خدمات بانک مرکزی از تاریخ وقوع جنایت تا زمان پرداخت محاسبه می‌شود (تبصرهٔ مادهٔ ۲ قانون دیه).",
          ),
        },
      },
      {
        "@type": "Question",
        name: t("هزینهٔ دادرسی دعوای مالی چقدر است؟"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t(
            "هزینهٔ دادرسی دعاوی مالی بر مبنای خواسته و ضریب سالانهٔ ابلاغی رؤسای قوهٔ قضاییه محاسبه می‌شود؛ محاسبه‌گر دادبان مبلغ خواسته را به هزینهٔ دادرسی دقیق تبدیل می‌کند.",
          ),
        },
      },
      {
        "@type": "Question",
        name: t("حق‌الوکاله بر چه مبنایی محاسبه می‌شود؟"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t(
            "حق‌الوکاله بر اساس تعرفهٔ سالانهٔ ابلاغی رؤسای قوهٔ قضاییه است: در دعاوی مالی پلکانی بر مبنای خواسته و در امور غیرمالی نرخ ثابت هر درجه. محاسبه‌گر دادبان هر دو حالت را پوشش می‌دهد.",
          ),
        },
      },
    ],
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("خانه"), item: SITE_URL },
      { "@type": "ListItem", position: 2, name: t("محاسبه‌گرهای حقوقی"), item: calcUrl },
    ],
  };

  return (
    <>
      <PageHero
        variant="market"
        image="/images/fee-installment.png"
        badge={t("محاسبه‌گرهای حقوقی")}
        title={t("حقوق خود را دقیق محاسبه کنید")}
        desc={t(
          "مهریهٔ روز، دیه، خسارت تأخیر تأدیهٔ دیه، هزینهٔ دادرسی و حق‌الوکاله — پنج محاسبه‌گر سریع با نرخ‌های قابل ویرایش و نتیجهٔ زنده.",
        )}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("محاسبه‌گرها") }]}
      />
      <Container className="py-12">
        <CalculatorsClient />
      </Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </>
  );
}
