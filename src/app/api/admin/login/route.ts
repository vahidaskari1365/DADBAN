import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkCredentials, signSession, cookieName, isAdminAuthConfigured } from "@/lib/admin-auth";
import { rateLimit, readJson, text } from "@/lib/api-security";
export async function POST(req: Request) {
  const body = await readJson(req, 4096);
  const email = text(body?.email, 254) || "";
  const limited = rateLimit(req, "admin-login", 5, 15 * 60_000, email.toLowerCase());
  if (limited) return limited;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!isAdminAuthConfigured()) return NextResponse.json({ ok: false, error: "ورود مدیریت موقتاً در دسترس نیست؛ لطفاً بعداً تلاش کنید." }, { status: 503 });
  try {
    if (!email || !password || !checkCredentials(email, password)) return NextResponse.json({ ok: false, error: "ایمیل یا رمز عبور اشتباه است" }, { status: 401 });
    const store = await cookies();
    store.set(cookieName(), signSession(email), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "خطا در ورود" }, { status: 500 });
  }
}
