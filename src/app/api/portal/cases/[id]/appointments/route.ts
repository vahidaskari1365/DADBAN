import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema-marketplace";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";
import { getCaseRow, getLawyerAppointments, isLawyerRole, resolveLawyerContext } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

const KINDS = ["hearing", "consultation", "deadline", "task"] as const;

/** GET /api/portal/cases/[id]/appointments → { ok, appointments } */
export async function GET(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-case-appointments-get", 90, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

    const { id } = await params;
    const caseId = Number(id);
    if (!Number.isFinite(caseId) || caseId <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه پرونده نامعتبر است." }, { status: 422 });
    }

    const c = await getCaseRow(caseId);
    if (!c) return NextResponse.json({ ok: false, error: "پرونده یافت نشد." }, { status: 404 });

    let all: Awaited<ReturnType<typeof getLawyerAppointments>> = [];
    if (c.assignedLawyerId) all = await getLawyerAppointments(c.assignedLawyerId, { limit: 80 });
    const appointmentsOfCase = all.filter((a) => a.caseId === caseId);
    return NextResponse.json({ ok: true, appointments: appointmentsOfCase });
  } catch {
    return publicError();
  }
}

/**
 * POST /api/portal/cases/[id]/appointments — ثبت رویداد تقویم (فقط وکیل/کارآموز)
 * body: { title, kind, location?, notes?, startsAt }
 */
export async function POST(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-case-appointments-post", 30, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (!isLawyerRole(user.role)) {
      return NextResponse.json({ ok: false, error: "ثبت رویداد فقط برای وکیل و کارآموز مجاز است." }, { status: 403 });
    }

    const { id } = await params;
    const caseId = Number(id);
    if (!Number.isFinite(caseId) || caseId <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه پرونده نامعتبر است." }, { status: 422 });
    }
    const c = await getCaseRow(caseId);
    if (!c) return NextResponse.json({ ok: false, error: "پرونده یافت نشد." }, { status: 404 });

    const body = await readJson(req, 6_000);
    if (!body) return NextResponse.json({ ok: false, error: "بدنه درخواست نامعتبر است." }, { status: 422 });

    const title = text(body.title, 160);
    if (!title) return NextResponse.json({ ok: false, error: "عنوان رویداد الزامی است." }, { status: 422 });

    const kind = String(body.kind ?? "task");
    if (!KINDS.includes(kind as (typeof KINDS)[number])) {
      return NextResponse.json({ ok: false, error: "نوع رویداد نامعتبر است." }, { status: 422 });
    }

    const startsAtRaw = String(body.startsAt ?? "");
    const startsAt = new Date(startsAtRaw);
    if (!startsAtRaw || Number.isNaN(startsAt.getTime())) {
      return NextResponse.json({ ok: false, error: "تاریخ و ساعت رویداد الزامی است." }, { status: 422 });
    }

    const ctx = await resolveLawyerContext(user);
    await db.insert(appointments).values({
      caseId,
      lawyerId: ctx.lawyerId,
      title,
      kind: kind as (typeof KINDS)[number],
      location: text(body.location, 200) ?? "",
      notes: text(body.notes, 600) ?? "",
      startsAt,
      createdBy: user.role === "trainee" ? "trainee" : "lawyer",
    });

    const all = await getLawyerAppointments(ctx.lawyerId, { limit: 80 });
    return NextResponse.json({ ok: true, appointments: all.filter((a) => a.caseId === caseId) });
  } catch {
    return publicError();
  }
}
