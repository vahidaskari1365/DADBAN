import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { desc, ilike, or } from "drizzle-orm";
import { isAdmin } from "@/lib/admin-auth";
import { rateLimit, text, publicError } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/marketplace/cases?q=
 * دادهٔ صفحهٔ «مانیتور تطبیق هوشمند» ادمین:
 * پرونده‌ها با ستون‌های مارکت‌پلیس (تخصص، دستهٔ AI، اطمینان، تخمین، پیشرفت، فوریت).
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, "admin-cases", 120, 60_000);
  if (limited) return limited;
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = text(url.searchParams.get("q") ?? "", 60) ?? "";

  try {
    const rows = await db
      .select({
        id: cases.id,
        caseNumber: cases.caseNumber,
        subject: cases.subject,
        description: cases.description,
        specialty: cases.specialty,
        city: cases.city,
        status: cases.status,
        progress: cases.progress,
        urgency: cases.urgency,
        aiCategory: cases.aiCategory,
        aiConfidence: cases.aiConfidence,
        aiEstimate: cases.aiEstimate,
        contractStatus: cases.contractStatus,
        createdAt: cases.createdAt,
      })
      .from(cases)
      .where(q ? or(ilike(cases.subject, `%${q}%`), ilike(cases.caseNumber, `%${q}%`)) : undefined)
      .orderBy(desc(cases.createdAt))
      .limit(100);

    return NextResponse.json({ ok: true, rows: Array.isArray(rows) ? rows : [] });
  } catch {
    return publicError();
  }
}
