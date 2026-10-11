import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { getCurrentUser, signUserSession, userCookieName } from "@/lib/user-auth";
import { rateLimit, readJson } from "@/lib/api-security";
import { digitsOnly, normalizeIranPhone, phoneLookupVariants, verifyAndConsumeOtp } from "@/lib/otp";

export const runtime = "nodejs";

/**
 * POST /api/auth/otp/verify — بررسی کد یکبارمصرف
 * body: { phone, code, purpose: "login" | "verify" }
 * login → صدور سشن (دقیقاً مثل /api/auth/login) · verify → phoneVerified=true
 */
export async function POST(req: Request) {
  const body = await readJson(req, 4096);
  const purpose = body?.purpose === "login" || body?.purpose === "verify" ? body.purpose : null;
  const normalized = normalizeIranPhone(body?.phone);
  const code = digitsOnly(body?.code);
  if (!purpose) {
    return NextResponse.json({ ok: false, error: "هدف تأیید کد نامعتبر است." }, { status: 400 });
  }
  if (!normalized) {
    return NextResponse.json(
      { ok: false, error: "شماره موبایل معتبر نیست؛ باید با ۰۹ شروع شود و ۱۱ رقم باشد." },
      { status: 400 },
    );
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "کد ۶ رقمی را کامل وارد کنید." }, { status: 400 });
  }
  // سقف بررسی کد: ۱۰ تلاش در ۱۰ دقیقه برای هر شماره
  const limited = rateLimit(req, "otp-verify", 10, 10 * 60_000, normalized);
  if (limited) return limited;

  try {
    try { await ensureExtendedSchema(); } catch { /* migration best-effort */ }

    const result = await verifyAndConsumeOtp(normalized, code, purpose);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    if (purpose === "login") {
      const [bare, zeroed] = phoneLookupVariants(normalized);
      const [user] = await db.select().from(users).where(or(eq(users.phone, zeroed), eq(users.phone, bare))).limit(1);
      if (!user) {
        return NextResponse.json({ ok: false, error: "حسابی با این شماره پیدا نشد." }, { status: 404 });
      }
      // کوکی سشن دقیقاً با همان الگوی /api/auth/login
      const store = await cookies();
      store.set(userCookieName(), signUserSession(user.id, user.role), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
      return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
    }

    // purpose === "verify" — تأیید شمارهٔ موبایل کاربر لاگین‌شده
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ ok: false, error: "برای تأیید شماره، اول وارد حساب خود شوید." }, { status: 401 });
    }
    const meNorm = normalizeIranPhone(me.phone);
    if (!meNorm || meNorm !== normalized) {
      return NextResponse.json({ ok: false, error: "این شماره با شمارهٔ ثبت‌شدهٔ حساب شما یکسان نیست." }, { status: 403 });
    }
    await db.update(users).set({ phoneVerified: true }).where(eq(users.id, me.id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
