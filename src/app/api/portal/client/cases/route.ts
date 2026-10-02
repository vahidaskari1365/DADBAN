import { NextResponse } from "next/server";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cases, lawyers } from "@/db/schema";
import { caseProposals } from "@/db/schema-marketplace";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/portal/client/cases
 * پرونده‌های کاربر نشست فعلی همراه با وکیل منتخب و شمار پیشنهادهای در انتظار.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
  const limited = rateLimit(req, "portal-client-cases", 60, 60_000, user.phone);
  if (limited) return limited;

  const phone = user.phone;
  try {
    const rows = await db
      .select({
        id: cases.id,
        caseNumber: cases.caseNumber,
        subject: cases.subject,
        description: cases.description,
        specialty: cases.specialty,
        stage: cases.stage,
        status: cases.status,
        city: cases.city,
        province: cases.province,
        progress: cases.progress,
        urgency: cases.urgency,
        feeAgreed: cases.feeAgreed,
        contractStatus: cases.contractStatus,
        createdAt: cases.createdAt,
        lawyerId: lawyers.id,
        lawyerName: lawyers.name,
        lawyerSlug: lawyers.slug,
        lawyerRating: lawyers.rating,
      })
      .from(cases)
      .leftJoin(lawyers, eq(cases.assignedLawyerId, lawyers.id))
      .where(or(eq(cases.contactPhone, phone), eq(cases.clientUserPhone, phone)))
      .orderBy(desc(cases.createdAt))
      .limit(50);

    const caseIds = rows.map((r) => r.id);
    const pendingMap = new Map<number, number>();
    if (caseIds.length > 0) {
      try {
        const pending = await db
          .select({ caseId: caseProposals.caseId, c: sql<number>`count(*)::int` })
          .from(caseProposals)
          .where(and(inArray(caseProposals.caseId, caseIds), eq(caseProposals.status, "pending")))
          .groupBy(caseProposals.caseId);
        for (const p of pending) pendingMap.set(p.caseId, Number(p.c ?? 0));
      } catch {
        /* degraded — بدون شمارنده پیشنهادها */
      }
    }

    return NextResponse.json({
      ok: true,
      cases: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt?.toISOString() ?? null,
        feeAgreed: r.feeAgreed ? String(r.feeAgreed) : null,
        pendingProposals: pendingMap.get(r.id) ?? 0,
        lawyer: r.lawyerId
          ? { id: r.lawyerId, name: r.lawyerName ?? "", slug: r.lawyerSlug ?? "", rating: r.lawyerRating ?? 0 }
          : null,
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
