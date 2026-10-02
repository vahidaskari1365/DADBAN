import { NextResponse } from "next/server";
import { db } from "@/db";
import { caseProposals, platformLedger } from "@/db/schema-marketplace";
import { and, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, publicError } from "@/lib/api-security";
import { computeLawyerFinance, getMyCases, resolveLawyerContext } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/portal/lawyer/dashboard — آمار پنل وکیل
 * پرونده فعال (assignedLawyerId = من)، پیشنهادهای در انتظار، درآمد (payment - commission)، امتیاز
 */
export async function GET(req: Request) {
  try {
    const limited = rateLimit(req, "portal-lawyer-dashboard", 60, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

    const ctx = await resolveLawyerContext(user);
    const myCases = await getMyCases(ctx.lawyerId);
    const activeCases = myCases.filter((c) => c.status !== "closed");

    let pendingProposals = 0;
    try {
      const rows = (await db
        .select({ id: caseProposals.id, status: caseProposals.status })
        .from(caseProposals)
        .where(and(eq(caseProposals.lawyerId, ctx.lawyerId), inArray(caseProposals.status, ["pending", "negotiating"])))
        .limit(100)) as { id: number; status: string }[];
      pendingProposals = (Array.isArray(rows) ? rows : []).length;
    } catch {
      pendingProposals = 0;
    }

    const finance = await computeLawyerFinance(ctx.lawyerId);
    const totalNet = Math.max(0, finance.ledger.filter((r) => r.type === "payment").reduce((s, r) => s + r.amount, 0) - finance.ledger.filter((r) => r.type === "commission").reduce((s, r) => s + r.amount, 0));

    return NextResponse.json({
      ok: true,
      demo: ctx.demo,
      lawyer: ctx.lawyer
        ? {
            id: ctx.lawyer.id,
            name: ctx.lawyer.name,
            title: ctx.lawyer.title,
            city: ctx.lawyer.city,
            rating: ctx.lawyer.rating,
            reviewCount: ctx.lawyer.reviewCount,
            specialties: ctx.lawyer.specialties,
            experienceYears: ctx.lawyer.experienceYears,
          }
        : null,
      stats: {
        activeCases: activeCases.length,
        pendingProposals,
        monthRevenue: totalNet,
        rating: Number(ctx.lawyer?.rating ?? 0),
        reviewCount: Number(ctx.lawyer?.reviewCount ?? 0),
      },
      activeCaseIds: activeCases.slice(0, 10).map((c) => c.id),
    });
  } catch {
    return publicError();
  }
}
