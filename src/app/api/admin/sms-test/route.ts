import { NextResponse } from "next/server";
import { permDenied } from "@/lib/admin-guard";
import { rateLimit, readJson } from "@/lib/api-security";
import { isSmsConfigured, normalizePhone, sendSmsText, smsStatus } from "@/lib/sms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/sms-test — ارسال پیامک تستی از مسیر واقعی پروداکشن (وب‌سرویس فراز)
 * ----------------------------------------------------------------------------
 * ابزار عیب‌یابی: نتیجهٔ خام پرایدر (موفقیت/خطای دقیق API) را برمی‌گرداند تا
 * علت ارسال‌نشدن پیامک بدون دسترسی به لاگ کنسول هاست، در پنل ادمین دیده شود.
 * گارد: دسترسی «errors» (همان بخش پایش خطاها) + سقف ۳ تست در ۱۰ دقیقه برای هر IP.
 */
export async function POST(req: Request) {
  const denied = await permDenied("errors");
  if (denied) return denied;

  const body = await readJson(req, 1024);
  const normalized = normalizePhone(String(body?.phone ?? ""));
  if (!normalized) {
    return NextResponse.json(
      { ok: false, error: "شماره موبایل معتبر نیست؛ باید با ۰۹ شروع شود و ۱۱ رقم باشد." },
      { status: 400 },
    );
  }

  const limited = rateLimit(req, "admin-sms-test", 3, 10 * 60_000);
  if (limited) return limited;

  const res = await sendSmsText(
    `0${normalized.slice(2)}`,
    "دادورزان ✅\nاین یک پیامک تستی سامانه است؛ دریافت آن یعنی ارسال پیامک فعال است.",
  );

  return NextResponse.json({
    ok: res.success,
    result: {
      success: res.success,
      messageId: res.messageId ?? null,
      channel: res.channel ?? null,
      error: res.error ?? null,
    },
    config: { ...smsStatus(), keyPresent: isSmsConfigured() },
  });
}
