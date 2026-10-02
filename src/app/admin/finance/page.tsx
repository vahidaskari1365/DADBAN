import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { platformLedger, payoutRequests, installments } from "@/db/schema-marketplace";
import { cases, lawyers } from "@/db/schema";
import { and, asc, count, desc, eq, lt, or, sum } from "drizzle-orm";
import { isAdmin } from "@/lib/admin-auth";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/ui";
import FinanceClient from "./finance-client";

export const metadata: Metadata = {
  title: "مالی، کمیسیون و تسویه — پنل مدیریت دادپیو",
  description: "حجم پرداخت‌ها، کمیسیون پلتفرم، درخواست‌های برداشت وکلا و اقساط معوق مارکت‌پلیس دادپیو.",
};
export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  if (!(await isAdmin())) redirect("/admin/login");

  /* ---------------- دادهٔ مالی (try/catch — بدون دیتابیس هم امن) ---------------- */
  const empty = {
    totals: { payments: 0, commission: 0, openPayouts: 0, activeInstallments: 0 },
    ledger: [] as (typeof platformLedger.$inferSelect)[],
    payouts: [] as {
      id: number;
      lawyerId: number;
      lawyerName: string | null;
      amount: string;
      status: string;
      iban: string;
      note: string;
      createdAt: Date;
      processedAt: Date | null;
    }[],
    lateInstallments: [] as {
      id: number;
      caseId: number;
      number: number;
      amount: string;
      dueDate: Date;
      status: string;
      caseSubject: string | null;
    }[],
  };

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

    empty.totals = {
      payments: Number(paySum[0]?.v ?? 0),
      commission: Number(commissionSum[0]?.v ?? 0),
      openPayouts: Number(openPayouts[0]?.v ?? 0),
      activeInstallments: Number(activeInstallments[0]?.v ?? 0),
    };
    empty.ledger = safe(ledger);
    empty.payouts = safe(payouts);
    empty.lateInstallments = safe(lateRows);
  } catch {
    /* حالت تنزل‌یافته */
  }

  return (
    <>
      <PageHero
        badge="Admin · مالی"
        title="مالی، کمیسیون و تسویه"
        desc="حجم پرداخت‌های مارکت‌پلیس، کمیسیون پلتفرم، تسویهٔ وکلا و پیگیری اقساط معوق"
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "پنل مدیریت", href: "/admin" }, { label: "مالی" }]}
      />
      <Container className="py-10">
        <FinanceClient {...empty} />
      </Container>
    </>
  );
}
