import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { caseProposals, caseEvents } from "@/db/schema-marketplace";
import { and, eq, ne } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, publicError } from "@/lib/api-security";
import { contractCodeFor, getCaseRow, isCaseOwner, isInternalRole } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string; pid: string }> };

/**
 * POST /api/portal/cases/[id]/proposals/[pid]/accept — پذیرش پیشنهاد توسط موکل
 * → پیشنهاد accepted، بقیه rejected، وکیل منتخب، حق‌الوکاله، قرارداد sent + رویداد سیستمی
 */
export async function POST(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-proposal-accept", 20, 60_000);
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

    // مجوزدستی: پذیرش پیشنهاد فقط تصمیم مالک موکل پرونده است (یا نقش داخلی)
    if (!isCaseOwner(c, user) && !isInternalRole(user.role)) {
      return NextResponse.json({ ok: false, error: "دسترسی به این پرونده مجاز نیست." }, { status: 403 });
    }

    if (c.assignedLawyerId) {
      return NextResponse.json({ ok: false, error: "وکیل این پرونده قبلاً تعیین شده است." }, { status: 409 });
    }

    const proposalRows = (await db
      .select()
      .from(caseProposals)
      .where(and(eq(caseProposals.id, pid), eq(caseProposals.caseId, caseId)))
      .limit(1)) as (typeof caseProposals.$inferSelect)[];
    const proposal = Array.isArray(proposalRows) ? proposalRows[0] : undefined;
    if (!proposal) return NextResponse.json({ ok: false, error: "پیشنهاد یافت نشد." }, { status: 404 });
    if (String(proposal.status) === "accepted") {
      return NextResponse.json({ ok: true, alreadyAccepted: true });
    }
    if (!["pending", "negotiating"].includes(String(proposal.status))) {
      return NextResponse.json({ ok: false, error: "این پیشنهاد قابل پذیرش نیست." }, { status: 409 });
    }

    const now = new Date();
    await db.update(caseProposals).set({ status: "accepted", updatedAt: now }).where(eq(caseProposals.id, pid));
    await db
      .update(caseProposals)
      .set({ status: "rejected", updatedAt: now })
      .where(and(eq(caseProposals.caseId, caseId), ne(caseProposals.id, pid)));

    const code = contractCodeFor(caseId);
    await db
      .update(cases)
      .set({
        assignedLawyerId: proposal.lawyerId,
        feeAgreed: String(proposal.amount ?? "0"),
        contractStatus: "sent",
        contractCode: code,
        status: "matched",
      })
      .where(eq(cases.id, caseId));

    await db.insert(caseEvents).values({
      caseId,
      actor: "system",
      actorName: "دادورزان",
      title: "وکیل منتخب شد",
      description: `پیشنهاد قیمت موکل پذیرفته شد و قرارداد الکترونیکی با کد ${code} برای امضا ارسال گردید.`,
      progress: Math.max(c.progress, 20),
      visibleToClient: true,
    });

    return NextResponse.json({ ok: true, contractCode: code });
  } catch {
    return publicError();
  }
}
