import { NextResponse } from "next/server";
import { db } from "@/db";
import { creditRequests } from "@/db/schema-marketplace";
import { cases } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin-auth";
import { rateLimit, publicError } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/marketplace/credit
 * دادهٔ صفحهٔ «تأمین‌کنندگان اعتبار» ادمین:
 * درخواست‌های تأمین اعتبار حق‌الوکاله (ازکی‌وام / بانک همکار) با موضوع پرونده.
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, "admin-credit", 120, 60_000);
  if (limited) return limited;
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  try {
    const rows = await db
      .select({
        id: creditRequests.id,
        caseId: creditRequests.caseId,
        caseSubject: cases.subject,
        provider: creditRequests.provider,
        amount: creditRequests.amount,
        months: creditRequests.months,
        status: creditRequests.status,
        statusDetail: creditRequests.statusDetail,
        referenceCode: creditRequests.referenceCode,
        createdAt: creditRequests.createdAt,
        updatedAt: creditRequests.updatedAt,
      })
      .from(creditRequests)
      .leftJoin(cases, eq(creditRequests.caseId, cases.id))
      .orderBy(desc(creditRequests.createdAt))
      .limit(60);

    return NextResponse.json({ ok: true, rows: Array.isArray(rows) ? rows : [] });
  } catch {
    return publicError();
  }
}
