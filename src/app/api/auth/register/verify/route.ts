import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signUserSession, userCookieName } from "@/lib/user-auth";
import { createUserAccount } from "@/lib/register-core";
import { rateLimit, readJson, text, validPhone } from "@/lib/api-security";
import { digitsOnly, normalizeIranPhone, otpCodeLength, verifyAndConsumeOtp } from "@/lib/otp";
import { sendSms } from "@/lib/sms";
import { sendWelcomeEmail } from "@/lib/email";

export const runtime = "nodejs";
const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register/verify — ثبت‌نام با تأیید شمارهٔ موبایل (جریان اصلی محصول)
 * ----------------------------------------------------------------------------
 * ورودی: { name, phone, password, code, email?, lawyerType?, city?, specialties?, employeeLawyer? }
 *  ۱) کد ۵ رقمی OTP با purpose="register" بررسی و مصرف می‌شود
 *  ۲) حساب ساخته می‌شود (موکل یا کارآموز وکالت) — همان هستهٔ /api/auth/register
 *  ۳) سشن صادر و کاربر وارد می‌شود + پیامک خوش‌آمد (best-effort)
 * کد اشتباه/منقضی → ساخت حساب انجام نمی‌شود.
 */
export async function POST(req: Request) {
  const body = await readJson(req, 8192);
  const limited = rateLimit(req, "register-verify", 10, 60 * 60_000);
  if (limited) return limited;

  const name = text(body?.name, 120);
  const normalized = normalizeIranPhone(body?.phone);
  const password = typeof body?.password === "string" ? body.password : "";
  const code = digitsOnly(body?.code);
  const email = text(body?.email, 254)?.toLowerCase() || null;

  if (!name || !normalized || !validPhone(normalized)) {
    return NextResponse.json({ ok: false, error: "اطلاعات ثبت‌نام معتبر نیست." }, { status: 422 });
  }
  if (password.length < 8 || password.length > 1024) {
    return NextResponse.json({ ok: false, error: "رمز عبور باید حداقل ۸ کاراکتر باشد." }, { status: 422 });
  }
  if (email && !emailOk.test(email)) {
    return NextResponse.json({ ok: false, error: "اطلاعات ثبت‌نام معتبر نیست." }, { status: 422 });
  }
  if (code.length !== otpCodeLength("register")) {
    return NextResponse.json({ ok: false, error: "کد ۵ رقمی ارسال‌شده را کامل وارد کنید." }, { status: 400 });
  }
  // سقف بررسی کد برای هر شماره — جلوگیری از جستجوی کورکورانه
  const limitedPhone = rateLimit(req, "register-verify-phone", 8, 10 * 60_000, normalized);
  if (limitedPhone) return limitedPhone;

  const lawyerType = body?.lawyerType === "karamooz" ? "karamooz" : null;
  const city = lawyerType === "karamooz" ? text(body?.city, 60) ?? "" : "";
  const specialties = lawyerType === "karamooz" && Array.isArray(body?.specialties)
    ? Array.from(new Set((body.specialties as unknown[]).map((s) => text(s, 60)).filter((s): s is string => !!s))).slice(0, 6)
    : [];
  if (lawyerType === "karamooz" && !specialties.length) {
    return NextResponse.json({ ok: false, error: "حداقل یک تخصص انتخاب کنید." }, { status: 422 });
  }

  try {
    // ① تأیید کد پیامکی — قبل از هر تغییری در دیتابیس
    const verified = await verifyAndConsumeOtp(normalized, code, "register");
    if (!verified.ok) {
      return NextResponse.json({ ok: false, error: verified.error }, { status: verified.status });
    }

    // ② ساخت حساب — همان هستهٔ مسیر سازگاری
    const result = await createUserAccount({
      name,
      mobile: normalized,
      email,
      password,
      lawyerType,
      city,
      specialties,
      employeeLawyer: lawyerType === "karamooz" && body?.employeeLawyer === true,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    // ۳) سشن — دقیقاً همان الگوی /api/auth/login
    const store = await cookies();
    const role = result.lawyerSlug ? "lawyer" : result.user.role;
    store.set(userCookieName(), signUserSession(result.user.id, role), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    // خوش‌آمد پیامکی — best-effort و «غیرمسدودکننده»: پاسخ ثبت‌نام نباید تا ۱۲ ثانیه
    // منتظر وب‌سرویس فراز بماند (فایربند). خطاهای ارسال خودشان در appErrors ثبت می‌شوند.
    void sendSms({
      to: normalized,
      template: "welcome",
      params: { name, link: result.lawyerSlug ? "https://dadvarzan.com/dashboard/lawyer" : "https://dadvarzan.com/dashboard/client" },
    }).catch(() => {});
    // خوش‌آمد ایمیلی — best-effort
    if (email) {
      try {
        await sendWelcomeEmail(email, name);
      } catch {
        /* non-fatal */
      }
    }

    if (result.lawyerSlug) {
      return NextResponse.json({ ok: true, user: { id: result.user.id, name: result.user.name, role: "lawyer" }, lawyerSlug: result.lawyerSlug });
    }
    return NextResponse.json({ ok: true, user: result.user });
  } catch {
    return NextResponse.json({ ok: false, error: "خطا در ثبت‌نام" }, { status: 500 });
  }
}
