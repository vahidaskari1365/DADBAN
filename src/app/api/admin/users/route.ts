import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { users } from "@/db/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { getAdminSession, hasPerm, isSuperAdmin } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/user-auth";
import { readJson, text } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * مدیریت کاربران سایت (app_users) از پنل ادمین — دسترسی «users».
 *
 * GET    /api/admin/users?q=&role=     → فهرست (بدون هش رمز)
 * PATCH  { id, name?, phone?, email?, role?, password? }  → ویرایش + ریست رمز
 * DELETE ?id=N
 *
 * نکتهٔ امنیتی: تغییر نقش به «admin» (کنسول عملیات /manage) فقط توسط مدیر کل
 * یا دارندگان دسترسی «admins» ممکن است.
 */

const APP_ROLES = ["client", "lawyer", "team", "staff", "supervisor", "admin"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORBIDDEN = (msg: string) => NextResponse.json({ ok: false, error: msg }, { status: 403 });

function publicRow(row: typeof users.$inferSelect) {
  const { passwordHash: _ph, ...rest } = row;
  void _ph;
  return rest;
}

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasPerm(session, "users")) return FORBIDDEN("شما دسترسی به کاربران را ندارید.");
  const url = new URL(req.url);
  const q = text(url.searchParams.get("q") ?? "", 60) ?? "";
  const role = text(url.searchParams.get("role") ?? "", 20) ?? "";
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 503 });
  try {
    const conds = [];
    if (q) conds.push(or(ilike(users.name, `%${q}%`), ilike(users.phone, `%${q}%`), ilike(users.email, `%${q}%`)));
    if (role && role !== "all") conds.push(eq(users.role, role));
    const rows = await db
      .select()
      .from(users)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(200);
    return NextResponse.json({ ok: true, rows: rows.map(publicRow) });
  } catch {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasPerm(session, "users")) return FORBIDDEN("شما دسترسی به کاربران را ندارید.");
  const body = await readJson(req, 16_384);
  if (!body) return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  const id = Number(body.id);
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 503 });
  try {
    const targetRows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const target = targetRows[0];
    if (!target) return NextResponse.json({ ok: false, error: "کاربر یافت نشد." }, { status: 404 });

    const changes: Partial<typeof users.$inferInsert> = {};

    if (typeof body.name === "string") {
      const name = text(body.name, 80);
      if (!name) return NextResponse.json({ ok: false, error: "نام نامعتبر است." }, { status: 400 });
      changes.name = name;
    }
    if (typeof body.phone === "string") {
      const ph = String(body.phone).replace(/[^\d]/g, "");
      if (!/^0?9\d{9}$/.test(ph)) return NextResponse.json({ ok: false, error: "شماره موبایل معتبر نیست." }, { status: 400 });
      const normalized = ph.length === 10 ? `0${ph}` : ph;
      if (normalized !== target.phone) {
        const dupe = await db.select({ id: users.id }).from(users).where(eq(users.phone, normalized)).limit(1);
        if (dupe[0]) return NextResponse.json({ ok: false, error: "این شماره قبلاً ثبت شده است." }, { status: 409 });
      }
      changes.phone = normalized;
    }
    if (typeof body.email === "string") {
      const email = (text(body.email, 254) ?? "").toLowerCase();
      if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "ایمیل معتبر نیست." }, { status: 400 });
      changes.email = email;
    }
    if (typeof body.role === "string" && body.role !== target.role) {
      if (!APP_ROLES.includes(body.role)) return NextResponse.json({ ok: false, error: "نقش نامعتبر است." }, { status: 400 });
      if (body.role === "admin" && !isSuperAdmin(session) && !hasPerm(session, "admins")) {
        return FORBIDDEN("تغییر نقش به «مدیر» فقط توسط مدیر کل ممکن است.");
      }
      changes.role = body.role;
    }
    if (typeof body.password === "string" && body.password.length > 0) {
      if (body.password.length < 8) return NextResponse.json({ ok: false, error: "رمز عبور باید حداقل ۸ نویسه باشد." }, { status: 400 });
      changes.passwordHash = hashPassword(body.password);
    }

    if (!Object.keys(changes).length) return NextResponse.json({ ok: false, error: "تغییری ارسال نشده است." }, { status: 400 });
    await db.update(users).set(changes).where(eq(users.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "ویرایش ناموفق بود." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasPerm(session, "users")) return FORBIDDEN("شما دسترسی به کاربران را ندارید.");
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 503 });
  try {
    const targetRows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const target = targetRows[0];
    if (!target) return NextResponse.json({ ok: false, error: "کاربر یافت نشد." }, { status: 404 });
    if (target.role === "admin" && !isSuperAdmin(session) && !hasPerm(session, "admins")) {
      return FORBIDDEN("حذف کاربر «مدیر» فقط توسط مدیر کل ممکن است.");
    }
    await db.delete(users).where(eq(users.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "حذف ناموفق بود." }, { status: 500 });
  }
}
