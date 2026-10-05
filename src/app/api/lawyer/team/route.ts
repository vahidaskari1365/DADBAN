import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases, teamCaseAssignments, users } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/user-auth";
import { hashPassword } from "@/lib/user-auth";
import { ensureProfileSchema } from "@/lib/auto-seed";
import { TEAM_PERMISSIONS } from "@/lib/lawyer-actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ساخت تیم وکیل — فقط خودِ وکیل (role=lawyer با lawyerId).
 * اعضا در app_users با role="team" و parentLawyerId ساخته می‌شوند؛
 * با نام کاربری و رمز از همان /login وارد پنل می‌شوند و فقط بخش‌های
 * تعیین‌شده (offers/consultations/reminders/services/cases) و فقط
 * پرونده‌های سپرده‌شده را می‌بینند.
 */

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;

async function bossOnly() {
  const user = await getCurrentUser();
  if (!user || user.role !== "lawyer" || user.lawyerId == null) return null;
  return user as typeof user & { lawyerId: number };
}

export async function GET(req: Request) {
  const limited = rateLimit(req, "team-get", 60, 60_000);
  if (limited) return limited;
  const boss = await bossOnly();
  if (!boss) return NextResponse.json({ ok: false, error: "دسترسی فقط برای وکیل" }, { status: 401 });
  try {
    await ensureProfileSchema();
    const members = await db
      .select({ id: users.id, name: users.name, username: users.phone, permissions: users.teamPermissions, createdAt: users.createdAt })
      .from(users)
      .where(and(eq(users.role, "team"), eq(users.parentLawyerId, boss.lawyerId)))
      .orderBy(desc(users.createdAt));
    const ids = members.map((m) => m.id);
    const assigns = ids.length
      ? await db
          .select({ memberUserId: teamCaseAssignments.memberUserId, caseId: teamCaseAssignments.caseId, caseNumber: cases.caseNumber, subject: cases.subject, city: cases.city })
          .from(teamCaseAssignments)
          .innerJoin(cases, eq(teamCaseAssignments.caseId, cases.id))
          .where(inArray(teamCaseAssignments.memberUserId, ids))
      : [];
    // پرونده‌های اخیر پلتفرم برای انتخاب در بخش «پرونده‌های سپرده‌شده»
    const recentCases = await db
      .select({ id: cases.id, caseNumber: cases.caseNumber, subject: cases.subject, city: cases.city, createdAt: cases.createdAt })
      .from(cases)
      .orderBy(desc(cases.createdAt))
      .limit(12);
    return NextResponse.json({
      ok: true,
      members: members.map((m) => ({
        ...m,
        caseIds: assigns.filter((a) => a.memberUserId === m.id).map((a) => a.caseId),
        cases: assigns.filter((a) => a.memberUserId === m.id).map((a) => ({ caseId: a.caseId, caseNumber: a.caseNumber, subject: a.subject, city: a.city })),
      })),
      recentCases,
      allPermissions: TEAM_PERMISSIONS,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "team-post", 20, 60_000);
  if (limited) return limited;
  const boss = await bossOnly();
  if (!boss) return NextResponse.json({ ok: false, error: "دسترسی فقط برای وکیل" }, { status: 401 });
  let body: { name?: string; username?: string; password?: string; permissions?: string[] };
  try {
    body = ((await readJson(req, 6_144)) ?? {}) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر" }, { status: 400 });
  }
  const name = text(body.name, 120) ?? "";
  const username = text(body.username, 40) ?? "";
  const password = typeof body.password === "string" ? body.password : "";
  const permissions = (body.permissions ?? []).filter((p): p is string => (TEAM_PERMISSIONS as readonly string[]).includes(p));
  if (!name || !USERNAME_RE.test(username) || password.length < 8 || password.length > 1024) {
    return NextResponse.json(
      { ok: false, error: "نام الزامی است؛ نام کاربری ۳ تا ۳۲ کاراکتر (حروف انگلیسی، رقم، نقطه، خط تیره) و رمز حداقل ۸ کاراکتر." },
      { status: 422 },
    );
  }
  try {
    await ensureProfileSchema();
    const dupe = await db.select({ id: users.id }).from(users).where(eq(users.phone, username)).limit(1);
    if (dupe.length) return NextResponse.json({ ok: false, error: "این نام کاربری قبلاً گرفته شده است." }, { status: 409 });
    const [created] = await db
      .insert(users)
      .values({
        name,
        phone: username,
        passwordHash: hashPassword(password),
        role: "team",
        parentLawyerId: boss.lawyerId,
        teamPermissions: permissions.join(","),
      })
      .returning({ id: users.id });
    return NextResponse.json({ ok: true, member: { id: created.id }, message: "عضو تیم ساخته شد؛ می‌تواند با نام کاربری و رمز از صفحهٔ ورود وارد شود." });
  } catch {
    return NextResponse.json({ ok: false, error: "ساخت عضو تیم انجام نشد." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const limited = rateLimit(req, "team-patch", 40, 60_000);
  if (limited) return limited;
  const boss = await bossOnly();
  if (!boss) return NextResponse.json({ ok: false, error: "دسترسی فقط برای وکیل" }, { status: 401 });
  let body: { userId?: number; permissions?: string[]; caseIds?: number[] };
  try {
    body = ((await readJson(req, 16_384)) ?? {}) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر" }, { status: 400 });
  }
  const userId = Number(body.userId);
  if (!Number.isInteger(userId)) return NextResponse.json({ ok: false, error: "عضو نامعتبر است." }, { status: 422 });
  try {
    await ensureProfileSchema();
    // عضو باید واقعاً از تیم همین وکیل باشد
    const [member] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.role, "team"), eq(users.parentLawyerId, boss.lawyerId)))
      .limit(1);
    if (!member) return NextResponse.json({ ok: false, error: "عضو تیم پیدا نشد." }, { status: 404 });
    if (Array.isArray(body.permissions)) {
      const permissions = body.permissions.filter((p): p is string => (TEAM_PERMISSIONS as readonly string[]).includes(p));
      await db.update(users).set({ teamPermissions: permissions.join(",") }).where(eq(users.id, userId));
    }
    if (Array.isArray(body.caseIds)) {
      const caseIds = body.caseIds.map(Number).filter((n) => Number.isInteger(n)).slice(0, 50);
      await db.delete(teamCaseAssignments).where(eq(teamCaseAssignments.memberUserId, userId));
      if (caseIds.length) {
        await db.insert(teamCaseAssignments).values(caseIds.map((caseId) => ({ memberUserId: userId, caseId })));
      }
    }
    return NextResponse.json({ ok: true, message: "دسترسی‌ها به‌روزرسانی شد." });
  } catch {
    return NextResponse.json({ ok: false, error: "به‌روزرسانی انجام نشد." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const limited = rateLimit(req, "team-delete", 20, 60_000);
  if (limited) return limited;
  const boss = await bossOnly();
  if (!boss) return NextResponse.json({ ok: false, error: "دسترسی فقط برای وکیل" }, { status: 401 });
  const userId = Number(new URL(req.url).searchParams.get("userId"));
  if (!Number.isInteger(userId)) return NextResponse.json({ ok: false, error: "عضو نامعتبر است." }, { status: 422 });
  try {
    await ensureProfileSchema();
    const [member] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.role, "team"), eq(users.parentLawyerId, boss.lawyerId)))
      .limit(1);
    if (!member) return NextResponse.json({ ok: false, error: "عضو تیم پیدا نشد." }, { status: 404 });
    await db.delete(users).where(eq(users.id, userId));
    return NextResponse.json({ ok: true, message: "عضو تیم حذف شد." });
  } catch {
    return NextResponse.json({ ok: false, error: "حذف عضو انجام نشد." }, { status: 500 });
  }
}
