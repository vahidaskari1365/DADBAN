import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { issueOtp, normalizeIranPhone } from "@/lib/otp";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/password/email-request — درخواست کد بازیابی با ایمیل
 * body: { email } — کد در otp_codes با شمارهٔ همان حساب ذخیره می‌شود (کانال تحویل فرق می‌کند).
 * صادقانه: بدون کلید ایمیل در پروداکشن 503؛ در dev کد به‌عنوان devCode برمی‌گردد.
 */
export async function POST(req: Request) {
  const body = await readJson(req, 4096);
  const email = text(body?.email, 254)?.toLowerCase() || "";
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "ایمیل معتبر نیست." }, { status: 400 });
  }
  // همان سقف‌های otp/request: ۳ کد در ۱۰ دقیقه برای هر ایمیل + ۱۰ در ساعت برای هر IP
  const limitedEmail = rateLimit(req, "otp-request", 3, 10 * 60_000, email);
  if (limitedEmail) return limitedEmail;
  const limitedIp = rateLimit(req, "otp-request-ip", 10, 60 * 60_000);
  if (limitedIp) return limitedIp;

  try {
    try { await ensureExtendedSchema(); } catch { /* migration best-effort */ }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return NextResponse.json({ ok: false, error: "حسابی با این ایمیل پیدا نشد." }, { status: 404 });
    }
    const phoneNormalized = normalizeIranPhone(user.phone);
    if (!phoneNormalized) {
      return NextResponse.json(
        { ok: false, error: "این حساب شماره موبایل معتبری ندارد؛ با پشتیبانی تماس بگیرید." },
        { status: 400 },
      );
    }

    if (!isEmailConfigured()) {
      if (process.env.NODE_ENV !== "production") {
        const code = await issueOtp(phoneNormalized, "reset");
        return NextResponse.json({ ok: true, dev: true, devCode: code });
      }
      return NextResponse.json(
        { ok: false, error: "سامانه ایمیل هنوز فعال نشده است؛ از بازیابی رمز با پیامک استفاده کنید یا با پشتیبانی تماس بگیرید." },
        { status: 503 },
      );
    }

    const code = await issueOtp(phoneNormalized, "reset");
    const emailRes = await sendPasswordResetEmail(email, code);
    if (!emailRes.delivered) {
      // صادقانه: کد صادر شده ولی تحویل انجام نشد — بدون ادعای موفقیت
      return NextResponse.json(
        { ok: false, error: "ارسال ایمیل ناموفق بود؛ لطفاً چند لحظه بعد دوباره تلاش کنید." },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, via: "email" });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
