import { NextResponse } from "next/server";
import { db } from "@/db";
import { installments, creditRequests } from "@/db/schema-marketplace";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, publicError } from "@/lib/api-security";
import { getCaseRow, isLawyerRole, parseAmount, canAccessCase, isCaseLawyerSide, isInternalRole } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

type InstallmentRow = typeof installments.$inferSelect;

function serialize(rows: InstallmentRow[]) {
  return rows.map((i) => ({
    id: i.id,
    number: i.number,
    amount: String(i.amount ?? "0"),
    dueDate: (i.dueDate instanceof Date ? i.dueDate : new Date(i.dueDate)).toISOString(),
    status: String(i.status),
    source: String(i.source),
    paidAt: i.paidAt ? (i.paidAt instanceof Date ? i.paidAt : new Date(i.paidAt)).toISOString() : null,
    trackingCode: i.trackingCode,
  }));
}

async function caseInstallments(caseId: number): Promise<InstallmentRow[]> {
  const rows = (await db
    .select()
    .from(installments)
    .where(eq(installments.caseId, caseId))
    .limit(60)) as InstallmentRow[];
  return Array.isArray(rows) ? rows : [];
}

/** GET /api/portal/cases/[id]/installments → { ok, installments, credit } */
export async function GET(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-installments-get", 90, 60_000);
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
    // مجوزدستی: فقط طرفین پرونده یا نقش داخلی (مبلغ اقساط اطلاعات حساس مالی است)
    if (!canAccessCase(c, user)) {
      return NextResponse.json({ ok: false, error: "دسترسی به این پرونده مجاز نیست." }, { status: 403 });
    }

    const rows = await caseInstallments(caseId);
    let credit: Record<string, unknown> | null = null;
    try {
      const creditRows = (await db
        .select()
        .from(creditRequests)
        .where(eq(creditRequests.caseId, caseId))
        .limit(10)) as (typeof creditRequests.$inferSelect)[];
      const list = Array.isArray(creditRows) ? creditRows : [];
      const latest = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      if (latest) {
        credit = {
          id: latest.id,
          provider: String(latest.provider),
          amount: String(latest.amount ?? "0"),
          months: latest.months,
          status: String(latest.status),
          statusDetail: latest.statusDetail,
          referenceCode: latest.referenceCode,
          createdAt: (latest.createdAt instanceof Date ? latest.createdAt : new Date(latest.createdAt)).toISOString(),
        };
      }
    } catch {
      /* credit اختیاری */
    }

    return NextResponse.json({ ok: true, installments: serialize(rows), credit });
  } catch {
    return publicError();
  }
}

/**
 * POST /api/portal/cases/[id]/installments — ساخت/افزودن قسط (فقط وکیل/کارآموز)
 * body: { number?, amount, dueDate }
 */
export async function POST(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-installments-post", 30, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (!isLawyerRole(user.role)) {
      return NextResponse.json({ ok: false, error: "ساخت برنامه اقساط فقط برای وکیل مجاز است." }, { status: 403 });
    }

    const { id } = await params;
    const caseId = Number(id);
    if (!Number.isFinite(caseId) || caseId <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه پرونده نامعتبر است." }, { status: 422 });
    }
    const c = await getCaseRow(caseId);
    if (!c) return NextResponse.json({ ok: false, error: "پرونده یافت نشد." }, { status: 404 });
    // مجوزدستی: فقط وکیلِ واگذارشده/کارآموزِ همان وکیل (یا نقش داخلی)
    if (!isCaseLawyerSide(c, user) && !isInternalRole(user.role)) {
      return NextResponse.json({ ok: false, error: "دسترسی به این پرونده مجاز نیست." }, { status: 403 });
    }

    const body = await readJson(req, 4_000);
    if (!body) return NextResponse.json({ ok: false, error: "بدنه درخواست نامعتبر است." }, { status: 422 });

    const amount = parseAmount(body.amount);
    if (!amount || amount < 10_000) {
      return NextResponse.json({ ok: false, error: "مبلغ قسط نامعتبر است." }, { status: 422 });
    }

    const dueDateRaw = String(body.dueDate ?? "");
    const dueDate = new Date(dueDateRaw);
    if (!dueDateRaw || Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ ok: false, error: "تاریخ سررسید الزامی است." }, { status: 422 });
    }

    let number = Number(body.number ?? 0);
    if (!Number.isFinite(number) || number < 0) number = 0;
    if (!number) {
      const existing = await caseInstallments(caseId);
      number = existing.reduce((max, i) => Math.max(max, Number(i.number ?? 0)), 0) + 1;
    }

    await db.insert(installments).values({
      caseId,
      number: Math.round(number),
      amount: String(Math.round(amount)),
      dueDate,
      status: "pending",
      source: "client",
    });

    const rows = await caseInstallments(caseId);
    return NextResponse.json({ ok: true, installments: serialize(rows) });
  } catch {
    return publicError();
  }
}
