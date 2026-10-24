import { aiSummary } from "@/lib/ai-discovery";

/**
 * /ai/summary.json — خلاصهٔ ساخت‌یافتهٔ سایت برای موتورهای پاسخ‌محور
 * (استاندارد emerging geo-checklist.dev).
 */
export const revalidate = 86400;

export function GET() {
  return Response.json(aiSummary(), {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
