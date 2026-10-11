import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { CalculatorsClient } from "@/components/calculators/calculators-client";

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
    </>
  );
}
