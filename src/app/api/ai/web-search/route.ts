import { NextResponse } from "next/server";
import { webSearch } from "@/lib/ai";
import { rateLimit, readJson, text } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** جستجوی وب حقوقی — نتایج واقعی از وب با تمرکز بر منابع حقوقی ایران. */
export async function POST(req: Request) {
  const limited = rateLimit(req, "ai-search", 20, 60 * 60_000);
  if (limited) return limited;

  const body = await readJson(req, 4_096);
  if (!body) return NextResponse.json({ ok: false, error: "درخواست نامعتبر است." }, { status: 400 });

  const query = text(body.query, 400);
  if (!query) return NextResponse.json({ ok: false, error: "لطفاً عبارت جستجو را بنویسید." }, { status: 400 });

  try {
    // ترکیب عبارت کاربر با نشانه‌ی منابع حقوقی فارسی برای نتایج مرتبط‌تر
    const results = await webSearch(`${query} حقوقی`, 8);
    return NextResponse.json({
      ok: true,
      results: results.map((r) => ({
        title: r.name,
        url: r.url,
        snippet: r.snippet,
        host: r.host_name,
        date: r.date || "",
        favicon: r.favicon || "",
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "جستجو در حال حاضر ممکن نیست. لطفاً بعداً تلاش کنید." }, { status: 503 });
  }
}
