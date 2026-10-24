import { aiService } from "@/lib/ai-discovery";

/**
 * /ai/service.json — قابلیت‌های سرویس برای عامل‌های هوش مصنوعی
 * (استاندارد emerging geo-checklist.dev).
 */
export const revalidate = 86400;

export function GET() {
  return Response.json(aiService(), {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
