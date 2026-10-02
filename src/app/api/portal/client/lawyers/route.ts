import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/portal/client/lawyers
 * فهرست سبک وکلا (شناسه، نام، امتیاز) برای نگاشت پیشنهادهای قیمت به وکیل.
 * از مسیر عمومی /api/lawyers مستقل است چون «شناسهٔ عددی» و «امتیاز» لازم داریم.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
  const limited = rateLimit(req, "portal-client-lawyers", 60, 60_000, user.phone);
  if (limited) return limited;

  try {
    const rows = await db
      .select({
        id: lawyers.id,
        slug: lawyers.slug,
        name: lawyers.name,
        title: lawyers.title,
        city: lawyers.city,
        rating: lawyers.rating,
        specialties: lawyers.specialties,
      })
      .from(lawyers)
      .orderBy(lawyers.name)
      .limit(200);
    return NextResponse.json({ ok: true, lawyers: rows });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
