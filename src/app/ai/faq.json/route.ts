import { aiFaq } from "@/lib/ai-discovery";

/**
 * /ai/faq.json — پرسش‌های متداول ساخت‌یافته برای موتورهای پاسخ‌محور.
 * منبع واحد داده با FAQPage صفحهٔ اصلی و بخش «پرسش‌های متداول».
 */
export const revalidate = 86400;

export function GET() {
  return Response.json(aiFaq(), {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
