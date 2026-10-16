import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, lawyers } from "@/db/schema";
import { and, count, desc, eq, gte, ilike, or } from "drizzle-orm";
import { permDenied } from "@/lib/admin-guard";
import { rateLimit, text, publicError } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/marketplace/users?q=&role=
 * صفحهٔ «کاربران و وکلا» ادمین:
 *  - کاربران (app_users): نام، موبایل، نقش، تاریخ عضویت — جستجو و فیلتر نقش
 *  - وکلا (lawyers): نام، شهر، امتیاز، تخصص‌ها، وضعیت تأیید
 * + آمار کلی صفحه.
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, "admin-users", 120, 60_000);
  if (limited) return limited;
  const _denied = await permDenied("users");
  if (_denied) return _denied;

  const url = new URL(req.url);
  const q = text(url.searchParams.get("q") ?? "", 60) ?? "";
  const role = text(url.searchParams.get("role") ?? "", 20) ?? "";

  try {
    const userConds = [];
    if (q) userConds.push(or(ilike(users.name, `%${q}%`), ilike(users.phone, `%${q}%`)));
    if (role && role !== "all") userConds.push(eq(users.role, role));

    const lawyerConds = [];
    if (q) lawyerConds.push(or(ilike(lawyers.name, `%${q}%`), ilike(lawyers.city, `%${q}%`)));

    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const [userRows, lawyerRows, totalUsers, totalLawyers, verifiedLawyers, newUsers] = await Promise.all([
      db
        .select({ id: users.id, name: users.name, phone: users.phone, role: users.role, createdAt: users.createdAt })
        .from(users)
        .where(userConds.length ? and(...userConds) : undefined)
        .orderBy(desc(users.createdAt))
        .limit(100),
      db
        .select({
          id: lawyers.id,
          name: lawyers.name,
          city: lawyers.city,
          rating: lawyers.rating,
          specialties: lawyers.specialties,
          verified: lawyers.verified,
          caseCount: lawyers.caseCount,
        })
        .from(lawyers)
        .where(lawyerConds.length ? and(...lawyerConds) : undefined)
        .orderBy(desc(lawyers.rating))
        .limit(100),
      db.select({ v: count() }).from(users),
      db.select({ v: count() }).from(lawyers),
      db.select({ v: count() }).from(lawyers).where(eq(lawyers.verified, true)),
      db.select({ v: count() }).from(users).where(gte(users.createdAt, weekAgo)),
    ]);

    const safe = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

    return NextResponse.json({
      ok: true,
      stats: {
        totalUsers: Number(totalUsers[0]?.v ?? 0),
        totalLawyers: Number(totalLawyers[0]?.v ?? 0),
        verifiedLawyers: Number(verifiedLawyers[0]?.v ?? 0),
        newUsersThisWeek: Number(newUsers[0]?.v ?? 0),
      },
      users: safe(userRows),
      lawyers: safe(lawyerRows),
    });
  } catch {
    return publicError();
  }
}
