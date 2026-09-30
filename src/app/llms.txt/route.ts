import { NextResponse } from "next/server";
import { LLMS_TXT } from "@/lib/seo";

/**
 * /llms.txt — استاندارد emerging برای معرفی سایت به LLM‌ها.
 * مرورگرهای AI (ChatGPT, Gemini, Perplexity, Claude) این فایل رو می‌خونن
 * تا سایت و خدمات رو بشناسن. برای AI Search Optimization مهم.
 */
export const dynamic = "force-static";

export function GET() {
  return new NextResponse(LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
