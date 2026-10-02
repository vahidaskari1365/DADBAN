import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { ensureProfileSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false });
  try {
    await ensureProfileSchema();
  } catch {
    /* ستون‌های پروفایل هنوز موجود نیستند — مقادیر پیش‌فرض */
  }
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      province: user.province ?? null,
      city: user.city ?? null,
      avatarColor: user.avatarColor ?? "#15365d",
    },
  });
}
