import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema-marketplace";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";
import { getCaseRow, getLawyerAppointments, isLawyerRole, resolveLawyerContext } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["hearing", "consultation", "deadline", "task"] as const;

/**
 * GET /api/portal/lawyer/appointments?upcoming=1 — کل رویدادهای تقویم وکیل (توسعهٔ پنل وکیل؛ خارج از قرارداد case-scoped)
 */
export async function GET(req: Request) {
  try {
    const limited = rateLimit(req, "portal-lawyer-appointments-get", 90, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

    const url = new URL(req.url);
    const upcoming = url.searchParams.get("upcoming") === "1";

    const ctx = await resolveLawyerContext(user);
    const items = await getLawyerAppointments(ctx.lawyerId, { upcomingOnly: upcoming, limit: 80 });
    return NextResponse.json({ ok: true, demo: ctx.demo, appointments: items });
  } catch {
    return publicError();
  }
}

/**
 * POST /api/portal/lawyer/appointments — افزودن رویداد تقویم وکیل (فقط وکیل/کارآموز)
 * body: { title, kind, location?, notes?, startsAt, caseId? }
 */
export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, "portal-lawyer-appointments-post", 30, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (!isLawyerRole(user.role)) {
      return NextResponse.json({ ok: false, error: "افزودن رویداد فقط برای وکیل و کارآموز مجاز است." }, { status: 403 });
    }

    const ctx = await resolveLawyerContext(user);

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

    let caseId: number | null = null;
    if (body.caseId !== undefined && body.caseId !== null && body.caseId !== "") {
      const cid = Number(body.caseId);
      if (Number.isFinite(cid) && cid > 0) {
        const c = await getCaseRow(cid);
        if (c) caseId = cid;
      }
    }

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

    const items = await getLawyerAppointments(ctx.lawyerId, { limit: 80 });
    return NextResponse.json({ ok: true, appointments: items });
  } catch {
    return publicError();
  }
}
