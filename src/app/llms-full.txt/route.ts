import { LLMS_FULL_TXT } from "@/lib/seo";

/**
 * /llms-full.txt — نسخهٔ کامل استاندارد llmstxt.org (بخش optional).
 * محتوای توسعه‌یافته برای عامل‌های AI که نقشهٔ عمیق سایت را می‌خواهند.
 * ISR ساعتی مثل /llms.txt.
 */
export const revalidate = 3600;

export function GET() {
  return new Response(LLMS_FULL_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
