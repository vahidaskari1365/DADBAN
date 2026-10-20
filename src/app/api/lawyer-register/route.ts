import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { lawyerOnboarding, users } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { signUserSession, userCookieName } from "@/lib/user-auth";
import { createUserAccount } from "@/lib/register-core";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { rateLimit, readJson, text, validPhone } from "@/lib/api-security";
import { digitsOnly, normalizeIranPhone, otpCodeLength, verifyAndConsumeOtp } from "@/lib/otp";
import { persistAppError, errBrief } from "@/lib/error-persist";
import { LOCATIONS } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/lawyer-register — ثبت‌نام مستقیم وکلای رسمی (کانون وکلا / مرکز وکلا)
 * ----------------------------------------------------------------------------
 * جریان محصول جدید /register (تب وکیل ← وکیل رسمی):
 *   ۱) کلاینت با /api/auth/otp/request (purpose=register) کد ۵ رقمی می‌گیرد
 *   ۲) این مسیر: کد را بررسی/مصرف → حساب می‌سازد (رمز عبور هش‌شده) → درخواست
 *      روی‌بوردینگ «pending» با مشخصات پروانه ثبت می‌کند → سشن صادر می‌شود
 * تا تأیید مدیر، نقش حساب «client» می‌ماند؛ PUT /api/lawyer-onboarding هنگام
 * تأیید، پروفایل وکیل می‌سازد و نقش را به «lawyer» ارتقا می‌دهد.
 */

const AGREEMENT_VERSION = "cooperation-v1";
const BAR_TYPES = new Set(["kanoon", "markaz"]);
void BAR_TYPES;

/** استان‌های معتبر — از همان منبع دادهٔ سایت تا فرم و سرور یک حقیقت داشته باشند */
const PROVINCES = new Set(LOCATIONS.map((l) => l.province));

export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, "lawyer-register", 5, 60 * 60_000);
    if (limited) return limited;

    try {
      await ensureExtendedSchema();
    } catch {
      /* migration best-effort */
    }

    const body = await readJson(req, 6_000);
    if (!body) {
      return NextResponse.json({ ok: false, error: "بدنهٔ درخواست نامعتبر است." }, { status: 422 });
    }

    /* ── اعتبارسنجی کامل سمت سرور ── */
    const barType = body?.barType === "markaz" ? "markaz" : body?.barType === "kanoon" ? "kanoon" : null;
    const name = text(body?.name, 120);
    const licenseNo = text(body?.licenseNo, 60);
    const province = text(body?.province, 60);
    const normalized = normalizeIranPhone(body?.phone);
    const password = typeof body?.password === "string" ? body.password : "";
    const code = digitsOnly(body?.code);

    if (!barType) {
      return NextResponse.json({ ok: false, error: "نوع عضویت (کانون وکلا یا مرکز وکلا) را انتخاب کنید." }, { status: 422 });
    }
    if (!name || name.trim().length < 3) {
      return NextResponse.json({ ok: false, error: "نام و نام خانوادگی را کامل وارد کنید." }, { status: 422 });
    }
    if (!licenseNo) {
      return NextResponse.json({ ok: false, error: "شماره پروانه وکالت الزامی است." }, { status: 422 });
    }
    if (!province || !PROVINCES.has(province)) {
      return NextResponse.json({ ok: false, error: "استان را از فهرست انتخاب کنید." }, { status: 422 });
    }
    if (!normalized || !validPhone(normalized)) {
      return NextResponse.json({ ok: false, error: "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد." }, { status: 422 });
    }
    if (password.length < 8 || password.length > 1024) {
      return NextResponse.json({ ok: false, error: "رمز عبور باید حداقل ۸ کاراکتر باشد." }, { status: 422 });
    }
    if (code.length !== otpCodeLength("register")) {
      return NextResponse.json({ ok: false, error: "کد ۵ رقمی ارسال‌شده را کامل وارد کنید." }, { status: 400 });
    }
    // سقف بررسی کد برای هر شماره — جلوگیری از جستجوی کورکورانه
    const limitedPhone = rateLimit(req, "lawyer-register-phone", 8, 10 * 60_000, normalized);
    if (limitedPhone) return limitedPhone;

    /* ── حساب با این شماره نباید از قبل باشد (هم‌راستا با purpose=register) ── */
    const [dupUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone, normalized))
      .limit(1);
    if (dupUser) {
      return NextResponse.json(
        { ok: false, error: "این شماره قبلاً ثبت شده است؛ وارد شوید یا رمز عبورتان را بازیابی کنید." },
        { status: 409 },
      );
    }

    /* ── درخواست جاری/تأییدشدهٔ دیگری با همین شماره نباید باشد ── */
    try {
      const inflight = await db
        .select({ id: lawyerOnboarding.id })
        .from(lawyerOnboarding)
        .where(and(eq(lawyerOnboarding.phone, normalized), inArray(lawyerOnboarding.status, ["pending", "approved"])))
        .limit(1);
      if (Array.isArray(inflight) && inflight.length > 0) {
        return NextResponse.json(
          { ok: false, error: "درخواستی با این شماره در جریان است؛ منتظر نتیجهٔ بررسی بمانید یا با پشتیبانی تماس بگیرید." },
          { status: 409 },
        );
      }
    } catch {
      /* جدول در دسترس نیست — insert خودش خطای شفاف می‌دهد */
    }

    /* ── ① تأیید کد پیامکی — قبل از هر تغییری در دیتابیس ── */
    const verified = await verifyAndConsumeOtp(normalized, code, "register");
    if (!verified.ok) {
      return NextResponse.json({ ok: false, error: verified.error }, { status: verified.status });
    }

    /* ── ② ساخت حساب (نقش موکل تا لحظهٔ تأیید مدیر) ── */
    const result = await createUserAccount({
      name: name.trim(),
      mobile: normalized,
      email: null,
      password,
      lawyerType: null,
      city: "",
      specialties: [],
      employeeLawyer: false,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    /* ── ③ درج درخواست روی‌بوردینگ (pending) — همان صف تأیید مدیر ── */
    const inserted = await db
      .insert(lawyerOnboarding)
      .values({
        userId: result.user.id,
        name: name.trim(),
        phone: normalized,
        email: null,
        licenseNo: licenseNo.trim(),
        lawyerType: "wakil",
        barType,
        city: province,
        province,
        experienceYears: 0,
        specialties: [],
        bio: "",
        status: "pending",
        agreementVersion: AGREEMENT_VERSION,
        agreementSignedAt: new Date(),
      })
      .returning({ id: lawyerOnboarding.id });

    const row = Array.isArray(inserted) ? inserted[0] : undefined;
    if (!row) {
      void persistAppError(
        `lawyer-register: onboarding insert degraded (account created) user=${result.user.id}`,
        { phone: normalized, barType, province },
        "error",
      );
      return NextResponse.json(
        { ok: false, error: "حساب شما ساخته شد اما ثبت درخواست ناقص ماند؛ لطفاً با پشتیبانی تماس بگیرید." },
        { status: 503 },
      );
    }

    /* ── ④ سشن — همان الگوی /api/auth/register/verify ── */
    const store = await cookies();
    store.set(userCookieName(), signUserSession(result.user.id, result.user.role), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({
      ok: true,
      requestId: row.id,
      user: { id: result.user.id, name: result.user.name, role: result.user.role },
    });
  } catch (err) {
    void persistAppError(`lawyer-register failed: ${errBrief(err)}`, {}, "error");
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
