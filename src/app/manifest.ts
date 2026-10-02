import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_NAME_EN } from "@/lib/brand";

/**
 * PWA manifest — قابل نصب روی موبایل، تبلت و دسکتاپ.
 * بعد از نصب، مثل یک اپلیکیشن نیتیو اجرا می‌شود (آیکون در home screen،
 * full-screen، splash screen، بدون نوار آدرس مرورگر).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME} — پلتفرم هوشمند خدمات حقوقی`,
    short_name: SITE_NAME,
    description: `وکیل‌یابی، مشاوره آنلاین، ثبت پرونده، تنظیم قرارداد و دستیار حقوقی هوش مصنوعی — همه در یک اپلیکیشن. (${SITE_NAME_EN})`,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "fullscreen", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#f5f7fb",
    theme_color: "#15365d",
    lang: "fa",
    dir: "rtl",
    categories: ["legal", "business", "productivity", "lifestyle"],
    prefer_related_applications: false,
    icons: [
      // Standard (any) — Chrome / Firefox / Edge
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Maskable — Android adaptive icon (محتوای مهم در safe zone مرکزی)
      { src: "/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      // SVG scalable
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      {
        name: "دستیار حقوقی هوش مصنوعی",
        short_name: "دستیار AI",
        description: "سوال حقوقی خود را از دستیار هوش مصنوعی بپرسید",
        url: "/ai-assistant?source=shortcut",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "جستجوی وکیل",
        short_name: "وکیل‌یابی",
        description: "وکیل متخصص را بیابید",
        url: "/lawyers?source=shortcut",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "رزرو مشاوره",
        short_name: "مشاوره",
        description: "مشاوره متنی، صوتی یا تصویری با وکیل",
        url: "/consultation?source=shortcut",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "ثبت پرونده",
        short_name: "پرونده",
        description: "ثبت و ارزیابی اولیه پرونده حقوقی",
        url: "/case/new?source=shortcut",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    screenshots: [
      // Mobile (narrow)
      {
        src: "/screenshot-mobile.jpg",
        sizes: "1080x1920",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "دادبان روی موبایل",
      },
      // Desktop / tablet (wide)
      {
        src: "/screenshot-wide.jpg",
        sizes: "1920x1080",
        type: "image/jpeg",
        form_factor: "wide",
        label: "صفحه اصلی دادبان",
      },
    ],
  };
}
