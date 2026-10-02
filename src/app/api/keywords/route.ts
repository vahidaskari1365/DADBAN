import { NextResponse } from "next/server";
import {
  getKeywordUniverse,
  getKeywordCount,
  getKeywordLengthDistribution,
  searchKeywords,
} from "@/lib/keyword-universe";

export const dynamic = "force-dynamic";

/**
 * API برای دسترسی به keyword universe.
 *
 * GET /api/keywords              → آمار کلی
 * GET /api/keywords?q=وکیل       → جستجوی کلمات شامل term
 * GET /api/keywords?prefix=وکیل → کلمات با prefix مشخص
 * GET /api/keywords?export=json  → خروجی کامل JSON
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const prefix = url.searchParams.get("prefix");
  const exportAll = url.searchParams.get("export");

  if (exportAll === "json") {
    const all = getKeywordUniverse();
    return new Response(JSON.stringify(all), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="keywords.json"',
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  if (q) {
    const results = searchKeywords(q).slice(0, 100);
    return NextResponse.json({
      query: q,
      count: results.length,
      results,
      total: getKeywordCount(),
    });
  }

  if (prefix) {
    const results = getKeywordsByPrefix(prefix).slice(0, 100);
    return NextResponse.json({
      prefix,
      count: results.length,
      results,
      total: getKeywordCount(),
    });
  }

  return NextResponse.json({
    total: getKeywordCount(),
    distribution: getKeywordLengthDistribution(),
    description:
      "Keyword universe برای پلتفرم حقوقی دادبان — ترکیب seed × specialty × city × qualifier × intent.",
  });
}

// جایگذاری برای استفاده‌های دیگر
function getKeywordsByPrefix(prefix: string): string[] {
  return getKeywordUniverse().filter((kw) => kw.startsWith(prefix));
}
