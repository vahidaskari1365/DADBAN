import { NextRequest, NextResponse } from "next/server";
import { userCookieName } from "@/lib/user-auth";

/**
 * خروج از حساب.
 *
 * باگ قبلی: NextResponse.redirect("/") با URL نسبی خطای ERR_INVALID_URL می‌داد
 * (URL باید مطلق باشد) → دکمهٔ خروج روی پروداکشن 500 می‌شد و کاربر خارج نمی‌شد.
 *
 * همچنین حذف کوکی به‌جای cookies().delete() به‌صورت صریح روی Response انجام
 * می‌شود تا Path=/ و maxAge=0 تضمین شود (delete پیش‌فرض بدون Path، کوکی
 * Path=/ را در برخی مرورگرها پاک نمی‌کند).
 */
function clearSessionCookie(res: NextResponse) {
  res.cookies.set(userCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/** POST — از فرم‌ها/فچ کلاینت: پاسخ JSON */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

/** GET — دکمهٔ خروج پنل‌ها: پاک‌کردن کوکی + ریدایرکت به خانه با URL مطلق */
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.nextUrl));
  clearSessionCookie(res);
  return res;
}
