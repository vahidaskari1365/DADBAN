import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { adminUsers } from "@/db/schema";
import { desc, eq, and, count } from "drizzle-orm";
import { getAdminSession, hasPerm, isSuperAdmin, type AdminSession } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/user-auth";
import { readJson, text } from "@/lib/api-security";
import { ADMIN_ROLES, isValidRole, isValidPermission, roleLabel } from "@/lib/admin-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * CRUD ادمین‌های پنل — فقط برای دارندگان دسترسی «admins».
 *
 * GET    /api/admin/admin-users          → فهرست ادمین‌ها (بدون هش رمز)
 * POST   { name, email, password, role, permissions[], isActive? }
 * PATCH  { id, name?, email?, password?, role?, permissions?, isActive? }
 * DELETE ?id=N
 *
 * گاردهای امنیتی:
 * - ساخت/انتقال به super_admin و اعطای دسترسی «admins» یا «*» فقط توسط مدیر کل.
 * - غیرفعال‌سازی/حذف حسابِ خودِ کاربر ممنوع.
 * - حذف/غیرفعال‌سازی آخرین مدیر کل فعال ممنوع (مالک env همیشه پشتیبان است).
 */

const FORBIDDEN = (msg: string) => NextResponse.json({ ok: false, error: msg }, { status: 403 });
const UNAUTHORIZED = () => NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

/** بازیابی کاربرِ فعلی به‌شرط داشتن دسترسی «admins» */
async function actorWithAdminsPerm(): Promise<{ actor: AdminSession; authed: true } | { actor: null; authed: boolean }> {
  const s = await getAdminSession();
  if (!s) return { actor: null, authed: false };
  if (!hasPerm(s, "admins")) return { actor: null, authed: true };
  return { actor: s, authed: true };
}

/** پاک‌سازی لیست دسترسی‌های ورودی */
function sanitizePerms(input: unknown): string[] {
  const list = Array.isArray(input) ? input.map((x) => String(x)) : typeof input === "string" ? String(input).split(",") : [];
  const out: string[] = [];
  for (const item of list) {
    const key = item.trim();
    if (key === "*") { if (!out.includes("*")) out.push("*"); continue; }
    if (key && isValidPermission(key) && !out.includes(key)) out.push(key);
  }
  return out;
}

const parsePermsCsv = (raw: string): string[] => String(raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** آیا این ترکیب نقش/دسترسی، توانِ «مدیریت ادمین‌ها» می‌دهد؟ */
function grantsAdminPower(role: string, perms: string[]): boolean {
  return role === "super_admin" || perms.includes("*") || perms.includes("admins");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicRow(row: typeof adminUsers.$inferSelect) {
  const { passwordHash: _ph, ...rest } = row;
  void _ph;
  return rest;
}

export async function GET() {
  const { actor, authed } = await actorWithAdminsPerm();
  if (!actor) return authed ? FORBIDDEN("شما دسترسی به مدیریت ادمین‌ها را ندارید.") : UNAUTHORIZED();
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 503 });
  try {
    const rows = await db.select().from(adminUsers).orderBy(desc(adminUsers.createdAt));
    return NextResponse.json({ ok: true, rows: rows.map(publicRow), me: { id: actor.id, super: isSuperAdmin(actor) } });
  } catch {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { actor, authed } = await actorWithAdminsPerm();
  if (!actor) return authed ? FORBIDDEN("شما دسترسی به مدیریت ادمین‌ها را ندارید.") : UNAUTHORIZED();
  const body = await readJson(req, 16_384);
  if (!body) return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  const name = text(body.name, 80);
  const email = (text(body.email, 254) ?? "").toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const role = text(body.role, 30) ?? "custom";
  const isActive = body.isActive !== false;

  if (!name) return NextResponse.json({ ok: false, error: "نام الزامی است." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "ایمیل معتبر نیست." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ ok: false, error: "رمز عبور باید حداقل ۸ نویسه باشد." }, { status: 400 });
  if (!isValidRole(role)) return NextResponse.json({ ok: false, error: "نقش نامعتبر است." }, { status: 400 });

  const super_ = isSuperAdmin(actor);
  if (ADMIN_ROLES[role].superOnly && !super_) return FORBIDDEN("فقط مدیر کل می‌تواند مدیر کل بسازد.");
  let perms = sanitizePerms(body.permissions);
  if (role === "super_admin") perms = ["*"];
  if (!super_ && grantsAdminPower(role, perms)) return FORBIDDEN("اعطای دسترسی مدیریت ادمین‌ها فقط توسط مدیر کل ممکن است.");

  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 503 });
  try {
    const existing = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    if (existing[0]) return NextResponse.json({ ok: false, error: "این ایمیل قبلاً ثبت شده است." }, { status: 409 });
    const inserted = await db
      .insert(adminUsers)
      .values({ name, email, passwordHash: hashPassword(password), role, permissions: perms.join(","), isActive })
      .returning();
    return NextResponse.json({ ok: true, row: publicRow(inserted[0]) });
  } catch {
    return NextResponse.json({ ok: false, error: "ساخت ادمین ناموفق بود." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { actor, authed } = await actorWithAdminsPerm();
  if (!actor) return authed ? FORBIDDEN("شما دسترسی به مدیریت ادمین‌ها را ندارید.") : UNAUTHORIZED();
  const body = await readJson(req, 16_384);
  if (!body) return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  const id = Number(body.id);
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 503 });

  try {
    const targetRows = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    const target = targetRows[0];
    if (!target) return NextResponse.json({ ok: false, error: "ادمین یافت نشد." }, { status: 404 });

    const super_ = isSuperAdmin(actor);
    if (target.role === "super_admin" && !super_) return FORBIDDEN("فقط مدیر کل می‌تواند مدیر کل را ویرایش کند.");

    const changes: Partial<typeof adminUsers.$inferInsert> = { updatedAt: new Date() };
    const targetPerms = parsePermsCsv(target.permissions);
    const targetHadAdminPower = grantsAdminPower(target.role, targetPerms);

    if (typeof body.name === "string") {
      const name = text(body.name, 80);
      if (!name) return NextResponse.json({ ok: false, error: "نام نامعتبر است." }, { status: 400 });
      changes.name = name;
    }
    if (typeof body.email === "string") {
      const email = (text(body.email, 254) ?? "").toLowerCase();
      if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "ایمیل معتبر نیست." }, { status: 400 });
      if (email !== target.email) {
        const dupe = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
        if (dupe[0]) return NextResponse.json({ ok: false, error: "این ایمیل قبلاً ثبت شده است." }, { status: 409 });
      }
      changes.email = email;
    }
    if (typeof body.password === "string" && body.password.length > 0) {
      if (body.password.length < 8) return NextResponse.json({ ok: false, error: "رمز عبور باید حداقل ۸ نویسه باشد." }, { status: 400 });
      changes.passwordHash = hashPassword(body.password);
    }

    if (typeof body.role === "string" && body.role !== target.role) {
      if (!isValidRole(body.role)) return NextResponse.json({ ok: false, error: "نقش نامعتبر است." }, { status: 400 });
      if (ADMIN_ROLES[body.role].superOnly && !super_) return FORBIDDEN("فقط مدیر کل می‌تواند نقش مدیر کل بدهد.");
      changes.role = body.role;
    }

    if (body.permissions !== undefined) {
      let perms = sanitizePerms(body.permissions);
      const effectiveRole = (changes.role as string) ?? target.role;
      if (effectiveRole === "super_admin") perms = ["*"];
      if (!super_ && grantsAdminPower(effectiveRole, perms) && !targetHadAdminPower) {
        return FORBIDDEN("اعطای دسترسی مدیریت ادمین‌ها فقط توسط مدیر کل ممکن است.");
      }
      changes.permissions = perms.join(",");
    }

    if (body.isActive !== undefined) {
      const willBeActive = body.isActive !== false;
      if (!willBeActive && target.id === actor.id) return FORBIDDEN("نمی‌توانید حساب خودتان را غیرفعال کنید.");
      if (target.role === "super_admin" && !willBeActive && !super_) return FORBIDDEN("فقط مدیر کل می‌تواند مدیر کل را غیرفعال کند.");
      if (!willBeActive && target.role === "super_admin") {
        const supers = await db.select({ v: count() }).from(adminUsers).where(and(eq(adminUsers.role, "super_admin"), eq(adminUsers.isActive, true)));
        if (Number(supers[0]?.v ?? 0) <= 1) return FORBIDDEN("حداقل یک مدیر کل فعال باید بماند.");
      }
      changes.isActive = willBeActive;
    }

    await db.update(adminUsers).set(changes).where(eq(adminUsers.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "ویرایش ناموفق بود." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { actor, authed } = await actorWithAdminsPerm();
  if (!actor) return authed ? FORBIDDEN("شما دسترسی به مدیریت ادمین‌ها را ندارید.") : UNAUTHORIZED();
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 503 });
  try {
    const targetRows = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    const target = targetRows[0];
    if (!target) return NextResponse.json({ ok: false, error: "ادمین یافت نشد." }, { status: 404 });
    if (target.id === actor.id) return FORBIDDEN("نمی‌توانید حساب خودتان را حذف کنید.");
    if (target.role === "super_admin" && !isSuperAdmin(actor)) return FORBIDDEN("فقط مدیر کل می‌تواند مدیر کل را حذف کند.");
    if (target.role === "super_admin") {
      const supers = await db.select({ v: count() }).from(adminUsers).where(and(eq(adminUsers.role, "super_admin"), eq(adminUsers.isActive, true)));
      if (Number(supers[0]?.v ?? 0) <= 1) return FORBIDDEN("حداقل یک مدیر کل فعال باید بماند.");
    }
    await db.delete(adminUsers).where(eq(adminUsers.id, id));
    return NextResponse.json({ ok: true, name: target.name, role: roleLabel(target.role) });
  } catch {
    return NextResponse.json({ ok: false, error: "حذف ناموفق بود." }, { status: 500 });
  }
}
