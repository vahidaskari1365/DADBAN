import { NextResponse } from "next/server";
import { syncLawFacts } from "@/lib/law-facts";
import { isAdmin } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/api-security";
import { submitIndexNow } from "@/lib/indexnow";

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
  const authorized = (!!token && (bearer === token || keyParam === token)) || isCron;

  if (!authorized) {
    // نشست ادمین — فقط اگر توکنی تنظیم نشده بود هم اجازهٔ دستی بدهیم که راه گیر نیفتد؟ نه؛ ادمین کافی است
    const admin = await isAdmin().catch(() => false);
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // هدر x-vercel-cron قابل جعل است — سقف ساعتی جلوی سوختن بودجهٔ LLM/سینک را می‌گیرد
  // (کرون واقعی هر شب یک‌بار صدا می‌زند؛ ۲ بار در ساعت حاشیهٔ امن کافی است)
  const limited = rateLimit(req, "law-sync", 2, 60 * 60_000);
  if (limited) return limited;

  const summary = await syncLawFacts();

  // اگر نرخ‌ها به‌روز شدند، صفحات وابسته به همین نرخ‌ها را هم به IndexNow اطلاع بده
  // (best-effort — هیچ‌وقت جریان اصلی سینک را نمی‌شکند)
  let indexnow: { ok: boolean; status?: number; submitted: number; error?: string } | null = null;
  if (summary.ran > 0) {
    try {
      const res = await submitIndexNow([
        "/laws",
        "/fee-guide",
        "/calculators",
        "/lawyers/specialty/mahriyeh",
        "/lawyers/specialty/hezanat",
      ]);
      indexnow = { ok: res.ok, status: res.status, submitted: res.submitted, error: res.error };
    } catch {
      indexnow = null;
    }
  }

  return NextResponse.json({ ...summary, indexnow, ok: true, at: new Date().toISOString() });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
