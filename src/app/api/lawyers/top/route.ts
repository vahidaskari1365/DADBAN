import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { and, desc, eq, ne, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/lawyers/top?limit=8&exclude=slug&sp=تخصص
 * فهرست وکلای تأییدشده بر اساس امتیاز واقعی — برای «پیشنهاد برای شما».
 * فقط فیلدهای عمومی و غیرحساس برمی‌گردد.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(12, Math.max(1, Number(url.searchParams.get("limit")) || 8));
  const exclude = url.searchParams.get("exclude") || "";
  const sp = (url.searchParams.get("sp") || "").slice(0, 60);

  try {
    const conds = [eq(lawyers.verified, true)];
    if (exclude) conds.push(ne(lawyers.slug, exclude));
    if (sp) conds.push(sql`${lawyers.specialties} @> ARRAY[${sp}]::text[]`);

    const rows = await db
      .select({
        id: lawyers.id,
        slug: lawyers.slug,
        name: lawyers.name,
        title: lawyers.title,
        city: lawyers.city,
        rating: lawyers.rating,
        reviewCount: lawyers.reviewCount,
        caseCount: lawyers.caseCount,
        priceChat: lawyers.priceChat,
        experienceYears: lawyers.experienceYears,
        verified: lawyers.verified,
        specialties: lawyers.specialties,
        avatarColor: lawyers.avatarColor,
        photoUrl: lawyers.photoUrl,
      })
      .from(lawyers)
      .where(and(...conds))
      .orderBy(desc(lawyers.rating), desc(lawyers.reviewCount))
      .limit(limit);

    return NextResponse.json(
      { ok: true, lawyers: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: true, lawyers: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
