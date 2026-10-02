import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers } from "@/db/schema-marketplace";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";
import { isLawyerRole, resolveLawyerContext } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MemberRow = typeof teamMembers.$inferSelect;

function serialize(rows: MemberRow[]) {
  return rows.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    phone: m.phone,
    role: String(m.role),
    scope: m.scope,
    status: String(m.status),
    createdAt: (m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt)).toISOString(),
  }));
}

async function myTeam(lawyerId: number): Promise<MemberRow[]> {
  const rows = (await db.select().from(teamMembers).where(eq(teamMembers.lawyerId, lawyerId)).limit(50)) as MemberRow[];
  return Array.isArray(rows) ? rows : [];
}

/** GET /api/portal/lawyer/team → اعضای تیم وکیل جاری */
export async function GET(req: Request) {
  try {
    const limited = rateLimit(req, "portal-lawyer-team-get", 60, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

    const ctx = await resolveLawyerContext(user);
    const members = await myTeam(ctx.lawyerId);
    return NextResponse.json({ ok: true, demo: ctx.demo, members: serialize(members) });
  } catch {
    return publicError();
  }
}

/**
 * POST /api/portal/lawyer/team — دعوت عضو جدید (فقط وکیل)
 * body: { name, email?, role: "trainee" | "associate", scope? }
 */
export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, "portal-lawyer-team-post", 20, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (!isLawyerRole(user.role)) {
      return NextResponse.json({ ok: false, error: "دعوت عضو فقط برای وکیل مجاز است." }, { status: 403 });
    }

    const ctx = await resolveLawyerContext(user);

    const body = await readJson(req, 4_000);
    if (!body) return NextResponse.json({ ok: false, error: "بدنه درخواست نامعتبر است." }, { status: 422 });

    const name = text(body.name, 80);
    if (!name) return NextResponse.json({ ok: false, error: "نام عضو الزامی است." }, { status: 422 });

    const email = text(body.email, 120) ?? "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "ایمیل معتبر نیست." }, { status: 422 });
    }

    const role = String(body.role ?? "trainee") === "associate" ? "associate" : "trainee";
    const scope = text(body.scope, 120) ?? "پرونده‌های ارجاعی";

    await db.insert(teamMembers).values({
      lawyerId: ctx.lawyerId,
      name,
      email,
      role,
      scope,
      status: "invited",
    });

    const members = await myTeam(ctx.lawyerId);
    return NextResponse.json({ ok: true, members: serialize(members) });
  } catch {
    return publicError();
  }
}

/**
 * PATCH /api/portal/lawyer/team — تغییر وضعیت/دسترسی عضو (فقط وکیل)
 * body: { id, status?, scope? }
 */
export async function PATCH(req: Request) {
  try {
    const limited = rateLimit(req, "portal-lawyer-team-patch", 30, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (!isLawyerRole(user.role)) {
      return NextResponse.json({ ok: false, error: "این عملیات فقط برای وکیل مجاز است." }, { status: 403 });
    }

    const ctx = await resolveLawyerContext(user);

    const body = await readJson(req, 4_000);
    if (!body) return NextResponse.json({ ok: false, error: "بدنه درخواست نامعتبر است." }, { status: 422 });

    const id = Number(body.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه عضو نامعتبر است." }, { status: 422 });
    }

    const rows = (await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.id, id), eq(teamMembers.lawyerId, ctx.lawyerId)))
      .limit(1)) as MemberRow[];
    const member = Array.isArray(rows) ? rows[0] : undefined;
    if (!member) return NextResponse.json({ ok: false, error: "عضو یافت نشد." }, { status: 404 });

    const patch: Partial<typeof teamMembers.$inferInsert> = {};
    if (body.status !== undefined && body.status !== "") {
      const status = String(body.status);
      if (!["active", "invited", "disabled"].includes(status)) {
        return NextResponse.json({ ok: false, error: "وضعیت نامعتبر است." }, { status: 422 });
      }
      patch.status = status;
    }
    const scope = text(body.scope, 120);
    if (scope) patch.scope = scope;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "فیلد قابل به‌روزرسانی ارسال نشده است." }, { status: 422 });
    }

    await db.update(teamMembers).set(patch).where(eq(teamMembers.id, id));
    const members = await myTeam(ctx.lawyerId);
    return NextResponse.json({ ok: true, members: serialize(members) });
  } catch {
    return publicError();
  }
}
