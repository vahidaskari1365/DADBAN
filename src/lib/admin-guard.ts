import { NextResponse } from "next/server";
import { getAdminSession, hasAnyPerm } from "@/lib/admin-auth";

/**
 * گارد API ادمین بر اساس کلید دسترسی کاتالوگ (src/lib/admin-permissions.ts).
 * خروجی null یعنی مجاز؛ وگرنه پاسخ آمادهٔ 401 (لاگین نیست) یا 403 (بدون دسترسی).
 */
export async function permDenied(perms: string | string[]): Promise<NextResponse | null> {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const list = Array.isArray(perms) ? perms : [perms];
  if (!hasAnyPerm(session, list)) {
    return NextResponse.json({ ok: false, error: "شما دسترسی به این بخش را ندارید." }, { status: 403 });
  }
  return null;
}
