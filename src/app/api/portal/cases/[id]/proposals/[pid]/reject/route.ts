import { NextResponse } from "next/server";
import { db } from "@/db";
import { caseProposals } from "@/db/schema-marketplace";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, publicError } from "@/lib/api-security";
import { getCaseRow, isCaseOwner, isInternalRole } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string; pid: string }> };

/** POST /api/portal/cases/[id]/proposals/[pid]/reject — رد پیشنهاد */
export async function POST(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-proposal-reject", 20, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

    const { id: rawId, pid: rawPid } = await params;
    const caseId = Number(rawId);
    const pid = Number(rawPid);
    if (!Number.isFinite(caseId) || !Number.isFinite(pid) || caseId <= 0 || pid <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه پرونده یا پیشنهاد نامعتبر است." }, { status: 422 });
    }

    const c = await getCaseRow(caseId);
    if (!c) return NextResponse.json({ ok: false, error: "پرونده یافت نشد." }, { status: 404 });

    // مجوزدستی: رد پیشنهاد فقط تصمیم مالک موکل پرونده است (یا نقش داخلی)
    if (!isCaseOwner(c, user) && !isInternalRole(user.role)) {
      return NextResponse.json({ ok: false, error: "دسترسی به این پرونده مجاز نیست." }, { status: 403 });
    }

    const proposalRows = (await db
      .select()
      .from(caseProposals)
      .where(and(eq(caseProposals.id, pid), eq(caseProposals.caseId, caseId)))
      .limit(1)) as (typeof caseProposals.$inferSelect)[];
    const proposal = Array.isArray(proposalRows) ? proposalRows[0] : undefined;
    if (!proposal) return NextResponse.json({ ok: false, error: "پیشنهاد یافت نشد." }, { status: 404 });
    if (String(proposal.status) === "accepted") {
      return NextResponse.json({ ok: false, error: "پیشنهاد پذیرفته‌شده قابل رد نیست." }, { status: 409 });
    }

    await db
      .update(caseProposals)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(caseProposals.id, pid));

    return NextResponse.json({ ok: true });
  } catch {
    return publicError();
  }
}
