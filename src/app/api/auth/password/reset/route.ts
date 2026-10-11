import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { hashPassword } from "@/lib/user-auth";
import { rateLimit, readJson } from "@/lib/api-security";
import {
  digitsOnly,
  normalizeIranPhone,
  phoneLookupVariants,
  verifyAndConsumeOtp,
} from "@/lib/otp";

export const runtime = "nodejs";

/**
 * POST /api/auth/password/reset — بازیابی رمز با کد پیامکی
 * body: { phone, code, password } — کد reset مصرف و رمز به‌روز می‌شود.
 */
export async function POST(req: Request) {
  const body = await readJson(req, 4096);
  const normalized = normalizeIranPhone(body?.phone);
  const code = digitsOnly(body?.code);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!normalized) {
    return NextResponse.json(
      { ok: false, error: "شماره موبایل معتبر نیست؛ باید با ۰۹ شروع شود و ۱۱ رقم باشد." },
      { status: 400 },
    );
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "کد ۶ رقمی را کامل وارد کنید." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 1024) {
    return NextResponse.json({ ok: false, error: "رمز عبور باید حداقل ۸ کاراکتر باشد." }, { status: 400 });
  }
  // سقف تغییر رمز با کد: ۵ بار در ساعت برای هر شماره
  const limited = rateLimit(req, "pw-reset", 5, 60 * 60_000, normalized);
  if (limited) return limited;

  try {
    try { await ensureExtendedSchema(); } catch { /* migration best-effort */ }

    const [bare, zeroed] = phoneLookupVariants(normalized);
    const [user] = await db.select().from(users).where(or(eq(users.phone, zeroed), eq(users.phone, bare))).limit(1);
    if (!user) {
      return NextResponse.json({ ok: false, error: "حسابی با این شماره پیدا نشد. اول ثبت‌نام کنید." }, { status: 404 });
    }

    const result = await verifyAndConsumeOtp(normalized, code, "reset");
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    await db.update(users).set({ passwordHash: hashPassword(password) }).where(eq(users.id, user.id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
