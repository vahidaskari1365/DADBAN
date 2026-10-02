import { NextResponse } from "next/server";
import { and, asc, eq, gte, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { appointments } from "@/db/schema-marketplace";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/portal/client/calendar
 * تقویم اقدامات موکل: جلسات و مهلت‌های پرونده‌های خودش یا رکوردهایی که با
 * شماره موبایل نشست فعلی ثبت شده‌اند.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
  const limited = rateLimit(req, "portal-client-calendar", 60, 60_000, user.phone);
  if (limited) return limited;

  const phone = user.phone;
  try {
    const myCases = await db
      .select({ id: cases.id, subject: cases.subject, caseNumber: cases.caseNumber })
      .from(cases)
      .where(or(eq(cases.contactPhone, phone), eq(cases.clientUserPhone, phone)))
      .limit(50);
    const caseIds = myCases.map((c) => c.id);
    const subjectMap = new Map(myCases.map((c) => [c.id, c.subject] as const));

    const rows = caseIds.length
      ? await db
          .select()
          .from(appointments)
          .where(
            and(
              or(eq(appointments.clientPhone, phone), inArray(appointments.caseId, caseIds)),
              gte(appointments.startsAt, new Date(Date.now() - 86_400_000)),
            ),
          )
          .orderBy(asc(appointments.startsAt))
          .limit(30)
      : await db
          .select()
          .from(appointments)
          .where(and(eq(appointments.clientPhone, phone), gte(appointments.startsAt, new Date(Date.now() - 86_400_000))))
          .orderBy(asc(appointments.startsAt))
          .limit(30);

    return NextResponse.json({
      ok: true,
      appointments: rows.map((a) => ({
        id: a.id,
        caseId: a.caseId,
        caseSubject: a.caseId ? (subjectMap.get(a.caseId) ?? null) : null,
        title: a.title,
        kind: a.kind,
        location: a.location,
        notes: a.notes,
        startsAt: a.startsAt?.toISOString() ?? null,
        createdBy: a.createdBy,
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
