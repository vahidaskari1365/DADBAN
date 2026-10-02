import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, signUserSession, userCookieName, isUserAuthConfigured } from "@/lib/user-auth";
import { clientIp, rateLimit, readJson, text } from "@/lib/api-security";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const body = await readJson(req, 4096); const identifier = text(body?.identifier, 254)?.toLowerCase() || "";
  const limited = rateLimit(req, "login", 10, 15 * 60_000, identifier || clientIp(req)); if (limited) return limited;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!isUserAuthConfigured()) return NextResponse.json({ ok: false, error: "سامانه ورود موقتاً در دسترس نیست؛ لطفاً بعداً تلاش کنید." }, { status: 503 });
  if (!identifier || !password || password.length > 1024) return NextResponse.json({ ok: false, error: "اطلاعات ورود صحیح نیست." }, { status: 400 });
  try {
    const normalizedPhone = identifier.replace(/[^\d]/g, "");
    const [user] = await db.select().from(users).where(normalizedPhone ? eq(users.phone, normalizedPhone) : eq(users.email, identifier)).limit(1);
    if (!user || !verifyPassword(password, user.passwordHash)) return NextResponse.json({ ok: false, error: "اطلاعات ورود صحیح نیست." }, { status: 401 });
    const store = await cookies(); store.set(userCookieName(), signUserSession(user.id, user.role), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
  } catch { return NextResponse.json({ ok: false, error: "خطا در ورود" }, { status: 500 }); }
}
