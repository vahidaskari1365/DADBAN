import { LLMS_TXT } from "@/lib/seo";

/**
 * /llms.txt — استاندارد emerging برای معرفی سایت به LLM‌ها.
 * مرورگرهای AI (ChatGPT, Gemini, Perplexity, Claude) این فایل رو می‌خونن
 * تا سایت و خدمات رو بشناسن. برای AI Search Optimization مهم.
 *
 * ISR ساعتی (revalidate=3600) به‌جای force-static: محتوا در هر بیلد از نو
 * prerender می‌شود و هر ساعت هم در runtime دوباره اعتبارسنجی می‌شود تا
 * نسخهٔ غنی (fee-guide + لندینگ‌های تخصصی) همیشه به‌روز بماند و مثل
 * force-static تا بیلد بعدی قفل نشود.
 */
export const revalidate = 3600;

export function GET() {
  return new Response(LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
