import { NextResponse } from "next/server";
import { and, desc, eq, gte, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cases, consultations } from "@/db/schema";
import { appointments, caseMessages, installments } from "@/db/schema-marketplace";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/portal/client/summary
 * آمار داشبورد موکل: پرونده‌های فعال، مشاوره‌ها، پیام‌های خوانده‌نشده،
 * قسط بعدی، وضعیت قرارداد و تقویم پیش‌رو — همه متعلق به نشست فعلی.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
  const limited = rateLimit(req, "portal-client-summary", 60, 60_000, user.phone);
  if (limited) return limited;

  const phone = user.phone;
  try {
    const myCases = await db
      .select()
      .from(cases)
      .where(or(eq(cases.contactPhone, phone), eq(cases.clientUserPhone, phone)))
      .orderBy(desc(cases.createdAt))
      .limit(50);
    const caseIds = myCases.map((c) => c.id);

    const myConsults = await db
      .select({ id: consultations.id })
      .from(consultations)
      .where(eq(consultations.clientPhone, phone))
      .limit(200);

    let unread = 0;
    if (caseIds.length > 0) {
      try {
        const [row] = await db
          .select({ c: sql<number>`count(*)::int` })
          .from(caseMessages)
          .where(
            and(
              inArray(caseMessages.caseId, caseIds),
              ne(caseMessages.senderRole, "client"),
              isNull(caseMessages.readAt),
            ),
          );
        unread = Number(row?.c ?? 0);
      } catch {
        unread = 0;
      }
    }

    let nextInstallment: typeof installments.$inferSelect | null = null;
    if (caseIds.length > 0) {
      try {
        const rows = await db
          .select()
          .from(installments)
          .where(
            and(
              inArray(installments.caseId, caseIds),
              or(eq(installments.status, "pending"), eq(installments.status, "late")),
            ),
          )
          .orderBy(installments.dueDate)
          .limit(1);
        nextInstallment = rows[0] ?? null;
      } catch {
        nextInstallment = null;
      }
    }

    let upcoming: (typeof appointments.$inferSelect)[] = [];
    try {
      upcoming = caseIds.length
        ? await db
            .select()
            .from(appointments)
            .where(
              and(
                or(eq(appointments.clientPhone, phone), inArray(appointments.caseId, caseIds)),
                gte(appointments.startsAt, new Date()),
              ),
            )
            .orderBy(appointments.startsAt)
            .limit(6)
        : await db
            .select()
            .from(appointments)
            .where(and(eq(appointments.clientPhone, phone), gte(appointments.startsAt, new Date())))
            .orderBy(appointments.startsAt)
            .limit(6);
    } catch {
      upcoming = [];
    }

    const withContract = myCases.find((c) => c.contractStatus && c.contractStatus !== "none") ?? null;

    return NextResponse.json({
      ok: true,
      stats: {
        activeCases: myCases.filter((c) => c.status !== "closed").length,
        totalCases: myCases.length,
        consultations: myConsults.length,
        unreadMessages: unread,
        trustScore: 4.8,
      },
      nextInstallment: nextInstallment
        ? {
            id: nextInstallment.id,
            caseId: nextInstallment.caseId,
            number: nextInstallment.number,
            amount: String(nextInstallment.amount),
            dueDate: nextInstallment.dueDate?.toISOString() ?? null,
            status: nextInstallment.status,
          }
        : null,
      contract: withContract
        ? {
            caseId: withContract.id,
            caseNumber: withContract.caseNumber,
            status: withContract.contractStatus,
            feeAgreed: withContract.feeAgreed ? String(withContract.feeAgreed) : null,
            signedAt: withContract.contractSignedAt?.toISOString() ?? null,
          }
        : null,
      upcoming: upcoming.map((a) => ({
        id: a.id,
        caseId: a.caseId,
        title: a.title,
        kind: a.kind,
        location: a.location,
        startsAt: a.startsAt?.toISOString() ?? null,
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
