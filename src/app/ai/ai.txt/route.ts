import { AI_TXT } from "@/lib/ai-discovery";

/**
 * /ai/ai.txt — نسخهٔ قابل‌serve از سیاست دسترسی AI؛
 * /.well-known/ai.txt (مسیر استاندارد) در proxy.ts به همین روت rewrite می‌شود.
 */
export const revalidate = 86400;

export function GET() {
  return new Response(AI_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
