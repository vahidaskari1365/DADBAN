import { NextResponse } from "next/server";
import { syncLawFacts } from "@/lib/law-facts";
import { isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 60; // کرون روزانه — با همزمانی ۴ و بودجهٔ ۱۴ثانیه‌ای هر موضوع زیر سقف می‌ماند
export const dynamic = "force-dynamic";

/**
 * به‌روزرسانی روزانهٔ داده‌های قانونی ایران (دیه، دستمزد، مالیات، وام، جریمه‌ها و…).
 * کرون Vercel هر شب این مسیر را با هدر x-vercel-cron صدا می‌زند.
 * راه‌های مجاز فراخوانی:
 *   ۱) کرون Vercel (هدر x-vercel-cron)
 *   ۲) توکن: Authorization: Bearer <LAW_SYNC_TOKEN|CRON_SECRET> یا ?key=<همان>
 *   ۳) نشست مدیر ادمین
 */
async function handle(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const token = process.env.LAW_SYNC_TOKEN || process.env.CRON_SECRET;
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const keyParam = url.searchParams.get("key") ?? "";
  const isCron = req.headers.get("x-vercel-cron") === "1";
  const authorized = isCron || (!!token && (bearer === token || keyParam === token));

  if (!authorized) {
    // نشست ادمین — فقط اگر توکنی تنظیم نشده بود هم اجازهٔ دستی بدهیم که راه گیر نیفتد؟ نه؛ ادمین کافی است
    const admin = await isAdmin().catch(() => false);
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const summary = await syncLawFacts();
  return NextResponse.json({ ...summary, ok: true, at: new Date().toISOString() });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
