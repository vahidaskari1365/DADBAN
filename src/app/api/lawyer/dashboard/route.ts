import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases, consultations, payments } from "@/db/schema";
import { eq, sql, gte } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * داشبورد آماری وکیل — آمار واقعی از دیتابیس.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "احراز هویت نشده" }, { status: 401 });
  }

  const log = logger.child({ module: "lawyer-dashboard", userId: user.id });

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let casesStats = { total: 0, active: 0, closed: 0, new: 0 };
    try {
      const rows = await db
        .select({ status: cases.status, count: sql<number>`count(*)::int` })
        .from(cases)
        .where(gte(cases.createdAt, thirtyDaysAgo))
        .groupBy(cases.status);
      casesStats = rows.reduce(
        (acc, r) => {
          acc.total += r.count;
          if (r.status === "active") acc.active += r.count;
          if (r.status === "closed") acc.closed += r.count;
          if (r.status === "new") acc.new += r.count;
          return acc;
        },
        { total: 0, active: 0, closed: 0, new: 0 }
      );
    } catch { /* degraded */ }

    let consultationsStats = { total: 0, completed: 0, upcoming: 0, revenue: 0 };
    try {
      const rows = await db
        .select({
          status: consultations.status,
          count: sql<number>`count(*)::int`,
          revenue: sql<number>`coalesce(sum(${consultations.price}::numeric), 0)::int`,
        })
        .from(consultations)
        .groupBy(consultations.status);
      consultationsStats = rows.reduce(
        (acc, r) => {
          acc.total += r.count;
          if (r.status === "completed") { acc.completed += r.count; acc.revenue += r.revenue; }
          if (["confirmed", "scheduled", "in_progress"].includes(r.status)) acc.upcoming += r.count;
          return acc;
        },
        { total: 0, completed: 0, upcoming: 0, revenue: 0 }
      );
    } catch { /* degraded */ }

    let settledRevenue = 0;
    let pendingRevenue = 0;
    try {
      const paymentStats = await db
        .select({
          status: payments.status,
          total: sql<number>`coalesce(sum(${payments.amount}), 0)::int`,
        })
        .from(payments)
        .where(eq(payments.orderType, "consultation"))
        .groupBy(payments.status);
      for (const p of paymentStats) {
        if (p.status === "verified") settledRevenue += p.total;
        if (p.status === "pending" || p.status === "initiated") pendingRevenue += p.total;
      }
    } catch { /* degraded */ }

    log.info("lawyer dashboard data", {
      casesTotal: casesStats.total,
      consultationsTotal: consultationsStats.total,
      settledRevenue,
    });

    return NextResponse.json({
      ok: true,
      stats: {
        cases: casesStats,
        consultations: consultationsStats,
        revenue: {
          settled: settledRevenue,
          pending: pendingRevenue,
          total: settledRevenue + pendingRevenue,
        },
      },
    });
  } catch (err) {
    log.error("lawyer dashboard failed", err);
    return NextResponse.json(
      { ok: false, error: "دریافت آمار ناموفق بود" },
      { status: 500 }
    );
  }
}
