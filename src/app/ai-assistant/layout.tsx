import type { Metadata } from "next";

/**
 * Metadata برای صفحه‌ی دستیار حقوقی هوش مصنوعی.
 * target: «دستیار حقوقی هوش مصنوعی»، «وکیل هوش مصنوعی»، «پرسش حقوقی AI».
 */
export const metadata: Metadata = {
  title: "دستیار حقوقی هوش مصنوعی | وکیل AI دادبان",
  description:
    "دستیار حقوقی هوش مصنوعی دادبان: پاسخ فوری به سوالات حقوقی شما با استناد به قوانین ایران. تحلیل قرارداد، راهنمایی حقوقی وارجاع به وکیل متخصص. رایگان و آنلاین.",
  keywords: [
    "دستیار حقوقی هوش مصنوعی", "وکیل هوش مصنوعی", "پرسش حقوقی AI",
    "مشاور حقوقی AI", "هوش مصنوعی حقوقی", "وکیل AI",
  ],
  alternates: {
    canonical: "/ai-assistant",
    languages: { "fa-IR": "/ai-assistant", "x-default": "/ai-assistant" },
  },
  openGraph: {
    title: "دستیار حقوقی هوش مصنوعی | دادبان",
    description: "پاسخ فوری به سوالات حقوقی شما با هوش مصنوعی و استناد به قوانین ایران.",
    url: "/ai-assistant",
    siteName: "دادبان",
    locale: "fa_IR",
    type: "website",
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "دستیار حقوقی هوش مصنوعی" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "دستیار حقوقی هوش مصنوعی | دادبان",
    description: "پاسخ فوری به سوالات حقوقی با هوش مصنوعی.",
    images: ["/twitter-card.jpg"],
  },
};

export default function AiAssistantLayout({ children }: { children: React.ReactNode }) {
  return children;
}
