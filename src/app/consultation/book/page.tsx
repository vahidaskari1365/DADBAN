import type { Metadata } from "next";
import { getServerLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n/core";
import BookingForm from "@/components/consultation/booking-form";

/**
 * صفحهٔ اختصاصی رزرو مشاوره — فرم تکمیل رزرو (نوع، مدت/زمان، تماس و خلاصه)
 * از صفحهٔ /consultation به اینجا منتقل شد تا آن صفحه فقط فهرست وکلا را نشان دهد.
 * دیپ‌لینک‌ها: ?lawyer= &type= &subject= &date= &slot= — وکیل از فهرست صفحهٔ مشاوره انتخاب و در فرم قفل می‌شود
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = makeT(await getServerLocale());
  return {
    title: t("رزرو مشاوره با وکیل | دادبان"),
    description: t(
      "تکمیل رزرو مشاوره حقوقی: انتخاب نوع مشاوره (متنی، صوتی، تصویری)، مدت و زمان واقعی از برنامه وکیل. ثبت در کمتر از ۲ دقیقه؛ هیچ مبلغی پیش از تأیید کسر نمی‌شود.",
    ),
    robots: { index: false, follow: true },
  };
}

export default function ConsultationBookPage() {
  return <BookingForm />;
}
