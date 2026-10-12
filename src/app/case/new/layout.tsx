import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";

/**
 * Metadata برای صفحه‌ی ثبت پرونده — target «ثبت پرونده حقوقی» و «ثبت دادخواست».
 * چندزبانه: با generateMetadata و getT، تیتر/توضیح به زبان انتخابی کاربر می‌رود
 * (کلید = عین رشتهٔ فارسی منبع؛ بدون ترجمه همان فارسی برمی‌گردد).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("ثبت پرونده حقوقی | ثبت دادخواست و شروع دعوی"),
    description: t(
      "ثبت پرونده حقوقی آنلاین: ثبت دادخواست، شکواییه و اظهارنامه. ارزیابی اولیه پرونده توسط وکلای متخصص دادورزان و شروع سریع دعوی. پیگیری کامل پرونده از ثبت تا اجرای حکم.",
    ),
    keywords: [
      t("ثبت پرونده حقوقی"), t("ثبت دادخواست"), t("ثبت شکواییه"), t("شروع دعوی"),
      t("ارزیابی پرونده"), t("پیگیری پرونده"), t("دفاع حقوقی"),
    ],
    alternates: {
      canonical: "/case/new",
      languages: { "fa-IR": "/case/new", "x-default": "/case/new" },
    },
    openGraph: {
      title: t("ثبت پرونده حقوقی | دادورزان"),
      description: t("ثبت پرونده حقوقی آنلاین: دادخواست، شکواییه و اظهارنامه با وکلای متخصص دادورزان."),
      url: "/case/new",
      siteName: t("دادورزان"),
      locale: "fa_IR",
      type: "website",
      images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: t("ثبت پرونده حقوقی") }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("ثبت پرونده حقوقی | دادورزان"),
      description: t("ثبت پرونده حقوقی آنلاین با وکلای متخصص دادورزان."),
      images: ["/twitter-card.jpg"],
    },
  };
}

export default function CaseNewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
