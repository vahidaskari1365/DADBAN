import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hashPassword, isUserAuthConfigured, signUserSession, userCookieName } from "@/lib/user-auth";
import { createUserAccount } from "@/lib/register-core";
import { phone, rateLimit, readJson, text, validPhone } from "@/lib/api-security";
import { sendWelcomeEmail } from "@/lib/email";

export const runtime = "nodejs";
const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** خوش‌آمد ایمیلی — best-effort: خطای ایمیل هرگز ثبت‌نام را نمی‌شکند (قرارداد ماژول email). */
async function welcomeBestEffort(to: string | null, name: string): Promise<void> {
  if (!to) return;
  try {
    await sendWelcomeEmail(to, name);
  } catch {
    /* هرگز به مسیر ثبت‌نام نشت نمی‌کند */
  }
}

/**
 * POST /api/auth/register — ثبت‌نام مستقیم (مسیر سازگاری قدیمی).
 * جریان اصلی محصول اکنون «ثبت‌نام با تأیید شماره» است: /api/auth/otp/request (purpose=register)
 * + /api/auth/register/verify — این مسیر بدون تأیید شماره باقی مانده تا
 * فرم‌ها/اسکریپت‌های موجود نشکنند؛ شماره در اینجا verified نمی‌شود.
 */
export async function POST(req: Request) {
  const body = await readJson(req, 8192); const limited = rateLimit(req, "register", 5, 60 * 60_000); if (limited) return limited;
  const name = text(body?.name, 120); const mobile = phone(body?.phone); const email = text(body?.email, 254)?.toLowerCase() || null; const password = typeof body?.password === "string" ? body.password : "";
  if (!name || !validPhone(mobile) || (email && !emailOk.test(email)) || password.length < 8 || password.length > 1024) return NextResponse.json({ ok: false, error: "اطلاعات ثبت‌نام معتبر نیست." }, { status: 422 });
  // ثبت‌نام مستقیم «کارآموز وکالت»: حساب role=lawyer + پروفایل وکیل کارآموز + سشن؛
  // هر مقدار دیگری از lawyerType رفتار فعلی (ساخت حساب موکل) را حفظ می‌کند.
  const lawyerType = body?.lawyerType === "karamooz" ? "karamooz" : null;
  const city = lawyerType === "karamooz" ? text(body?.city, 60) ?? "" : "";
  // تخصص‌ها (الزامی ≥۱، حداکثر ۶) + گزینهٔ اختیاری «وکیل کارمندان و کارهای اداری»
  const specialties = lawyerType === "karamooz" && Array.isArray(body?.specialties)
    ? Array.from(new Set((body.specialties as unknown[]).map((s) => text(s, 60)).filter((s): s is string => !!s))).slice(0, 6)
    : [];
  if (lawyerType === "karamooz" && !isUserAuthConfigured()) return NextResponse.json({ ok: false, error: "سامانه ثبت‌نام موقتاً در دسترس نیست؛ لطفاً بعداً تلاش کنید." }, { status: 503 });
  if (lawyerType === "karamooz" && !specialties.length) return NextResponse.json({ ok: false, error: "حداقل یک تخصص انتخاب کنید." }, { status: 422 });

  const result = await createUserAccount({
    name,
    mobile,
    email,
    password,
    lawyerType,
    city,
    specialties,
    employeeLawyer: lawyerType === "karamooz" && body?.employeeLawyer === true,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });

  // سشن بلافاصله صادر می‌شود — همان الگوی /api/auth/login
  const store = await cookies();
  const role = result.lawyerSlug ? "lawyer" : result.user.role;
  store.set(userCookieName(), signUserSession(result.user.id, role), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  await welcomeBestEffort(email, name);
  if (result.lawyerSlug) {
    return NextResponse.json({ ok: true, user: { id: result.user.id, name: result.user.name, role: "lawyer" }, lawyerSlug: result.lawyerSlug });
  }
  return NextResponse.json({ ok: true, user: result.user });
}
