import type { Metadata } from "next";

/**
 * Metadata برای صفحه‌ی ثبت پرونده — target «ثبت پرونده حقوقی» و «ثبت دادخواست».
 */
export const metadata: Metadata = {
  title: "ثبت پرونده حقوقی | ثبت دادخواست و شروع دعوی",
  description:
    "ثبت پرونده حقوقی آنلاین: ثبت دادخواست، شکواییه و اظهارنامه. ارزیابی اولیه پرونده توسط وکلای متخصص دادپیو و شروع سریع دعوی. پیگیری کامل پرونده از ثبت تا اجرای حکم.",
  keywords: [
    "ثبت پرونده حقوقی", "ثبت دادخواست", "ثبت شکواییه", "شروع دعوی",
    "ارزیابی پرونده", "پیگیری پرونده", "دفاع حقوقی",
  ],
  alternates: {
    canonical: "/case/new",
    languages: { "fa-IR": "/case/new", "x-default": "/case/new" },
  },
  openGraph: {
    title: "ثبت پرونده حقوقی | دادپیو",
    description: "ثبت پرونده حقوقی آنلاین: دادخواست، شکواییه و اظهارنامه با وکلای متخصص دادپیو.",
    url: "/case/new",
    siteName: "دادپیو",
    locale: "fa_IR",
    type: "website",
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "ثبت پرونده حقوقی" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ثبت پرونده حقوقی | دادپیو",
    description: "ثبت پرونده حقوقی آنلاین با وکلای متخصص دادپیو.",
    images: ["/twitter-card.jpg"],
  },
};

export default function CaseNewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
