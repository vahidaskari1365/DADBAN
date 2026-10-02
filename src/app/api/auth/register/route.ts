import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { hashPassword } from "@/lib/user-auth";
import { phone, rateLimit, readJson, text, validPhone } from "@/lib/api-security";
export const runtime = "nodejs";
const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function POST(req: Request) {
  const body = await readJson(req, 8192); const limited = rateLimit(req, "register", 5, 60 * 60_000); if (limited) return limited;
  const name = text(body?.name, 120); const mobile = phone(body?.phone); const email = text(body?.email, 254)?.toLowerCase() || null; const password = typeof body?.password === "string" ? body.password : "";
  if (!name || !validPhone(mobile) || (email && !emailOk.test(email)) || password.length < 8 || password.length > 1024) return NextResponse.json({ ok: false, error: "اطلاعات ثبت‌نام معتبر نیست." }, { status: 422 });
  try {
    const existing = await db.select({ id: users.id }).from(users).where(email ? or(eq(users.phone, mobile), eq(users.email, email)) : eq(users.phone, mobile)).limit(1);
    if (existing.length) return NextResponse.json({ ok: false, error: "امکان ایجاد حساب با این مشخصات وجود ندارد." }, { status: 409 });
    const [created] = await db.insert(users).values({ name, phone: mobile, email, passwordHash: hashPassword(password) }).returning({ id: users.id, name: users.name, role: users.role });
    return NextResponse.json({ ok: true, user: created });
  } catch { return NextResponse.json({ ok: false, error: "خطا در ثبت‌نام" }, { status: 500 }); }
}
