import { NextResponse } from "next/server";
import { db } from "@/db";
import { platformLedger, payoutRequests, installments } from "@/db/schema-marketplace";
import { cases, lawyers } from "@/db/schema";
import { and, asc, count, desc, eq, lt, or, sum } from "drizzle-orm";
import { permDenied } from "@/lib/admin-guard";
import { rateLimit, publicError } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/marketplace/finance
 * دادهٔ صفحهٔ «مالی، کمیسیون و تسویه» ادمین:
 * حجم پرداخت‌ها، کمیسیون پلتفرم، درخواست‌های برداشت، اقساط فعال
 * + دفتر تراکنش‌ها (ledger) + درخواست‌های برداشت + اقساط معوق.
 * گیت: نشست ادمین (dadpayo_admin).
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, "admin-finance", 120, 60_000);
  if (limited) return limited;
  const _denied = await permDenied("finance");
  if (_denied) return _denied;

  try {
    const [paySum, commissionSum, openPayouts, activeInstallments, ledger, payouts, lateRows] = await Promise.all([
      db
        .select({ v: sum(platformLedger.amount) })
        .from(platformLedger)
        .where(eq(platformLedger.type, "payment")),
      db
        .select({ v: sum(platformLedger.commission) })
        .from(platformLedger)
        .where(eq(platformLedger.type, "commission")),
      db
        .select({ v: count() })
        .from(payoutRequests)
        .where(or(eq(payoutRequests.status, "requested"), eq(payoutRequests.status, "processing"))),
      db.select({ v: count() }).from(installments).where(eq(installments.status, "pending")),
      db.select().from(platformLedger).orderBy(desc(platformLedger.createdAt)).limit(60),
      db
        .select({
          id: payoutRequests.id,
          lawyerId: payoutRequests.lawyerId,
          lawyerName: lawyers.name,
          amount: payoutRequests.amount,
          status: payoutRequests.status,
          iban: payoutRequests.iban,
          note: payoutRequests.note,
          createdAt: payoutRequests.createdAt,
          processedAt: payoutRequests.processedAt,
        })
        .from(payoutRequests)
        .leftJoin(lawyers, eq(payoutRequests.lawyerId, lawyers.id))
        .orderBy(desc(payoutRequests.createdAt))
        .limit(30),
      db
        .select({
          id: installments.id,
          caseId: installments.caseId,
          number: installments.number,
          amount: installments.amount,
          dueDate: installments.dueDate,
          status: installments.status,
          caseSubject: cases.subject,
        })
        .from(installments)
        .leftJoin(cases, eq(installments.caseId, cases.id))
        .where(
          or(eq(installments.status, "late"), and(eq(installments.status, "pending"), lt(installments.dueDate, new Date()))),
        )
        .orderBy(asc(installments.dueDate))
        .limit(30),
    ]);

    const safe = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

    return NextResponse.json({
      ok: true,
      totals: {
        payments: Number(paySum[0]?.v ?? 0),
        commission: Number(commissionSum[0]?.v ?? 0),
        openPayouts: Number(openPayouts[0]?.v ?? 0),
        activeInstallments: Number(activeInstallments[0]?.v ?? 0),
      },
      ledger: safe(ledger),
      payouts: safe(payouts),
      lateInstallments: safe(lateRows),
    });
  } catch {
    return publicError();
  }
}
