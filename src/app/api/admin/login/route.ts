import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminLogin, signAdminSession, cookieName, isAdminSecretConfigured } from "@/lib/admin-auth";
import { rateLimit, readJson, text } from "@/lib/api-security";

/**
 * POST /api/admin/login
 * ورود پنل ادمین — ۱) مالک از متغیرهای محیطی (همیشه مدیر کل)  ۲) ادمین‌های جدول admin_users
 * با دسترسی محدود. خروجی: کوکی امضاشدهٔ ۷ روزه.
 */
export async function POST(req: Request) {
  const body = await readJson(req, 4096);
  const email = text(body?.email, 254) || "";
  const limited = rateLimit(req, "admin-login", 5, 15 * 60_000, email.toLowerCase());
  if (limited) return limited;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!isAdminSecretConfigured()) return NextResponse.json({ ok: false, error: "ورود مدیریت موقتاً در دسترس نیست؛ لطفاً بعداً تلاش کنید." }, { status: 503 });
  try {
    const session = await verifyAdminLogin(email, password);
    if (!session) return NextResponse.json({ ok: false, error: "ایمیل یا رمز عبور اشتباه است" }, { status: 401 });
    const store = await cookies();
    store.set(cookieName(), signAdminSession(session), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return NextResponse.json({ ok: true, name: session.name });
  } catch {
    return NextResponse.json({ ok: false, error: "خطا در ورود" }, { status: 500 });
  }
}
