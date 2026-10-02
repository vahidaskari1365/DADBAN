import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/user-auth";
import { rateLimit, readJson, publicError } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUT /api/profile/password — تغییر رمز عبور (با تأیید رمز فعلی)
 * body: { currentPassword, newPassword }
 */
export async function PUT(req: Request) {
  try {
    const limited = rateLimit(req, "profile-password", 5, 15 * 60_000);
    if (limited) return limited;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

    const body = await readJson(req, 4_096);
    if (!body) return NextResponse.json({ ok: false, error: "بدنه درخواست نامعتبر است." }, { status: 422 });

    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ ok: false, error: "رمز فعلی و رمز جدید الزامی است." }, { status: 422 });
    }
    if (newPassword.length < 8 || newPassword.length > 1024) {
      return NextResponse.json({ ok: false, error: "رمز جدید باید حداقل ۸ نویسه باشد." }, { status: 422 });
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json({ ok: false, error: "رمز عبور فعلی صحیح نیست." }, { status: 401 });
    }
    if (verifyPassword(newPassword, user.passwordHash)) {
      return NextResponse.json({ ok: false, error: "رمز جدید نباید با رمز فعلی یکسان باشد." }, { status: 422 });
    }
    try {
      await db.update(users).set({ passwordHash: hashPassword(newPassword) }).where(eq(users.id, user.id));
    } catch {
      return NextResponse.json({ ok: false, error: "ذخیره‌سازی موقتاً در دسترس نیست." }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return publicError();
  }
}
