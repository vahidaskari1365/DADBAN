import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { hashPassword } from "@/lib/user-auth";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { digitsOnly, normalizeIranPhone, verifyAndConsumeOtp } from "@/lib/otp";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/password/email-reset — تغییر رمز با کد بازیابیِ ایمیل
 * body: { email, code, password } — کد reset روی شمارهٔ همان حساب بررسی و مصرف می‌شود.
 */
export async function POST(req: Request) {
  const body = await readJson(req, 4096);
  const email = text(body?.email, 254)?.toLowerCase() || "";
  const code = digitsOnly(body?.code);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "ایمیل معتبر نیست." }, { status: 400 });
  }
  if (!/^\d{5}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "کد ۵ رقمی را کامل وارد کنید." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 1024) {
    return NextResponse.json({ ok: false, error: "رمز عبور باید حداقل ۸ کاراکتر باشد." }, { status: 400 });
  }
  // همان سقف تغییر رمز با کد: ۵ بار در ساعت
  const limited = rateLimit(req, "pw-reset", 5, 60 * 60_000, email);
  if (limited) return limited;

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

    const result = await verifyAndConsumeOtp(phoneNormalized, code, "reset");
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    await db.update(users).set({ passwordHash: hashPassword(password) }).where(eq(users.id, user.id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
