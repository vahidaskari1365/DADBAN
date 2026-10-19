import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { isSmsConfigured, sendSms } from "@/lib/sms";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson } from "@/lib/api-security";
import {
  issueOtp,
  normalizeIranPhone,
  phoneLookupVariants,
  type OtpPurpose,
} from "@/lib/otp";

export const runtime = "nodejs";

const PURPOSES: OtpPurpose[] = ["login", "reset", "verify", "register"];

/**
 * POST /api/auth/otp/request — درخواست کد یکبارمصرف
 * body: { phone, purpose: "login" | "reset" | "verify" | "register" }
 * register → ثبت‌نام با تایید شماره: حساب با این شماره نباید وجود داشته باشد
 * صادقانه: بدون کلید پیامک در پروداکشن 503؛ در dev کد به‌عنوان devCode برمی‌گردد.
 */
export async function POST(req: Request) {
  const body = await readJson(req, 4096);
  const purpose = String(body?.purpose ?? "") as OtpPurpose;
  const normalized = normalizeIranPhone(body?.phone);
  if (!PURPOSES.includes(purpose)) {
    return NextResponse.json({ ok: false, error: "هدف درخواست کد نامعتبر است." }, { status: 400 });
  }
  if (!normalized) {
    return NextResponse.json(
      { ok: false, error: "شماره موبایل معتبر نیست؛ باید با ۰۹ شروع شود و ۱۱ رقم باشد." },
      { status: 400 },
    );
  }
  // سقف درخواست: ۳ کد در ۱۰ دقیقه برای هر شماره + ۱۰ کد در ساعت برای هر IP
  const limitedPhone = rateLimit(req, "otp-request", 3, 10 * 60_000, normalized);
  if (limitedPhone) return limitedPhone;
  const limitedIp = rateLimit(req, "otp-request-ip", 10, 60 * 60_000);
  if (limitedIp) return limitedIp;

  try {
    try { await ensureExtendedSchema(); } catch { /* migration best-effort */ }

    let userEmail: string | null = null;
    if (purpose === "verify") {
      // تأیید شماره فقط برای کاربر لاگین‌شده و فقط برای شمارهٔ خودش
      const me = await getCurrentUser();
      if (!me) return NextResponse.json({ ok: false, error: "برای تأیید شماره، اول وارد حساب خود شوید." }, { status: 401 });
      const meNorm = normalizeIranPhone(me.phone);
      if (!meNorm || meNorm !== normalized) {
        return NextResponse.json({ ok: false, error: "این شماره با شمارهٔ ثبت‌شدهٔ حساب شما یکسان نیست." }, { status: 403 });
      }
      userEmail = me.email ?? null;
    } else if (purpose === "register") {
      // ثبت‌نام با تایید شماره — برعکس ورود: حساب با این شماره نباید وجود داشته باشد
      const [bare, zeroed] = phoneLookupVariants(normalized);
      const [user] = await db.select().from(users).where(or(eq(users.phone, zeroed), eq(users.phone, bare))).limit(1);
      if (user) {
        return NextResponse.json(
          { ok: false, error: "این شماره قبلاً ثبت شده است؛ وارد شوید یا رمز عبورتان را بازیابی کنید." },
          { status: 409 },
        );
      }
    } else {
      // ورود/بازیابی: حساب با این شماره باید وجود داشته باشد (هر نقشی)
      const [bare, zeroed] = phoneLookupVariants(normalized);
      const [user] = await db.select().from(users).where(or(eq(users.phone, zeroed), eq(users.phone, bare))).limit(1);
      if (!user) {
        return NextResponse.json({ ok: false, error: "حسابی با این شماره پیدا نشد. اول ثبت‌نام کنید." }, { status: 404 });
      }
      userEmail = user.email ?? null;
    }

    const code = await issueOtp(normalized, purpose);

    // بازیابی رمز: اگر حساب ایمیل دارد و ایمیل فعال است، اول کانال ایمیل امتحان می‌شود
    if (purpose === "reset" && userEmail && isEmailConfigured()) {
      const emailRes = await sendPasswordResetEmail(userEmail, code);
      if (emailRes.delivered) return NextResponse.json({ ok: true, via: "email" });
      // ارسال ایمیل ناموفق — کد هنوز معتبر است؛ مسیر پیامک ادامه می‌یابد
    }

    const smsConfigured = isSmsConfigured();
    const smsRes = await sendSms({ to: normalized, template: "otp", params: { code } });
    const smsDelivered = smsConfigured && smsRes.success && !!smsRes.messageId && !smsRes.messageId.startsWith("dev_");
    if (smsDelivered) return NextResponse.json({ ok: true, via: "sms" });

    if (!smsConfigured) {
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({ ok: true, dev: true, devCode: code });
      }
      return NextResponse.json(
        { ok: false, error: "سامانه پیامک هنوز فعال نشده است؛ فعلاً از ورود با رمز عبور استفاده کنید یا با پشتیبانی تماس بگیرید." },
        { status: 503 },
      );
    }
    if (!smsDelivered && process.env.NODE_ENV !== "production") {
      // در dev حتی وقتی کلید هست ولی ارسال به پرایدر شکست خورده (مثلاً شبکه)، فلو با کد dev ادامه می‌یابد تا قابل تست بماند
      return NextResponse.json({ ok: true, dev: true, devCode: code, via: "sms-failed-dev" });
    }
    // پیامک فعال است ولی ارسال شکسته — صادقانه خطا، بدون ادعای تحویل
    return NextResponse.json(
      { ok: false, error: "ارسال پیامک ناموفق بود؛ لطفاً چند لحظه بعد دوباره تلاش کنید." },
      { status: 502 },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
