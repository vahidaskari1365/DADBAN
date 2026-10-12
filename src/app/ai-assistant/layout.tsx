import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";

/**
 * Metadata برای صفحه‌ی دستیار حقوقی هوش مصنوعی.
 * target: «دستیار حقوقی هوش مصنوعی»، «وکیل هوش مصنوعی»، «پرسش حقوقی AI».
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("دستیار حقوقی هوش مصنوعی | وکیل AI دادورزان"),
    description:
      t("دستیار حقوقی هوش مصنوعی دادورزان: پاسخ فوری به سوالات حقوقی شما با استناد به قوانین ایران. تحلیل قرارداد، راهنمایی حقوقی وارجاع به وکیل متخصص. رایگان و آنلاین."),
    keywords: [
      t("دستیار حقوقی هوش مصنوعی"), t("وکیل هوش مصنوعی"), t("پرسش حقوقی AI"),
      t("مشاور حقوقی AI"), t("هوش مصنوعی حقوقی"), t("وکیل AI"),
    ],
    alternates: {
      canonical: "/ai-assistant",
      languages: { "fa-IR": "/ai-assistant", "x-default": "/ai-assistant" },
    },
    openGraph: {
      title: t("دستیار حقوقی هوش مصنوعی | دادورزان"),
      description: t("پاسخ فوری به سوالات حقوقی شما با هوش مصنوعی و استناد به قوانین ایران."),
      url: "/ai-assistant",
      siteName: "دادورزان",
      locale: "fa_IR",
      type: "website",
      images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: t("دستیار حقوقی هوش مصنوعی") }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("دستیار حقوقی هوش مصنوعی | دادورزان"),
      description: t("پاسخ فوری به سوالات حقوقی با هوش مصنوعی."),
      images: ["/twitter-card.jpg"],
    },
  };
}

export default function AiAssistantLayout({ children }: { children: React.ReactNode }) {
  return children;
}
