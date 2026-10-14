import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, publicError } from "@/lib/api-security";
import { getCaseRow, canAccessCase } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * POST /api/portal/cases/[id]/contract/sign — امضای قرارداد الکترونیکی (موکل یا وکیل)
 * → contractStatus='signed'، contractSignedAt=now
 */
export async function POST(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-contract-sign", 20, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

    const { id: rawId } = await params;
    const caseId = Number(rawId);
    if (!Number.isFinite(caseId) || caseId <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه پرونده نامعتبر است." }, { status: 422 });
    }

    const c = await getCaseRow(caseId);
    if (!c) return NextResponse.json({ ok: false, error: "پرونده یافت نشد." }, { status: 404 });

    // مجوزدستی: امضای قرارداد فقط توسط طرفین پرونده (موکل/وکیل پرونده) یا نقش داخلی
    if (!canAccessCase(c, user)) {
      return NextResponse.json({ ok: false, error: "دسترسی به این پرونده مجاز نیست." }, { status: 403 });
    }

    if (!c.assignedLawyerId) {
      return NextResponse.json({ ok: false, error: "ابتدا وکیل پرونده باید تعیین شود." }, { status: 422 });
    }
    if (String(c.contractStatus) === "signed") {
      return NextResponse.json({ ok: true, alreadySigned: true });
    }

    await db
      .update(cases)
      .set({ contractStatus: "signed", contractSignedAt: new Date() })
      .where(eq(cases.id, caseId));

    const updated = await getCaseRow(caseId);
    return NextResponse.json({ ok: true, contractCode: updated?.contractCode ?? "", contractStatus: "signed" });
  } catch {
    return publicError();
  }
}
