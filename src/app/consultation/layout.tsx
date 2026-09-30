import type { Metadata } from "next";

/**
 * Metadata برای صفحه‌ی مشاوره — بر اساس Keyword Research.
 * این صفحه target کلمه‌ی «مشاوره حقوقی آنلاین» و «مشاوره حقوقی تلفنی» است.
 */
export const metadata: Metadata = {
  title: "مشاوره حقوقی آنلاین | متنی، صوتی و تصویری با وکیل",
  description:
    "مشاوره حقوقی آنلاین با وکیل متخصص: مشاوره متنی، صوتی (تلفنی) و تصویری. رزرو نوبت آنلاین با بهترین وکلای ایران، پاسخ به پرسش‌های حقوقی شما در کمترین زمان.",
  keywords: [
    "مشاوره حقوقی آنلاین", "مشاوره حقوقی تلفنی", "مشاوره حقوقی متنی",
    "مشاوره وکیل", "رزرو مشاوره", "وکیل آنلاین", "پرسش حقوقی",
  ],
  alternates: {
    canonical: "/consultation",
    languages: { "fa-IR": "/consultation", "x-default": "/consultation" },
  },
  openGraph: {
    title: "مشاوره حقوقی آنلاین | دادبان",
    description:
      "مشاوره حقوقی آنلاین با وکیل متخصص: متنی، صوتی و تصویری. رزرو نوبت با بهترین وکلای ایران.",
    url: "/consultation",
    siteName: "دادبان",
    locale: "fa_IR",
    type: "website",
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "مشاوره حقوقی آنلاین" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "مشاوره حقوقی آنلاین | دادبان",
    description: "مشاوره حقوقی آنلاین با وکیل متخصص: متنی، صوتی و تصویری.",
    images: ["/twitter-card.jpg"],
  },
};

export default function ConsultationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
