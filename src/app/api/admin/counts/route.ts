import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyerVerifications, tickets, qaSubmissions, appErrors, lawyerOnboarding } from "@/db/schema";
import { count, eq, gte } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * شمارش‌های تجمیعی «نیازمند اقدام» برای بج‌های سایدبار پنل ادمین.
 *
 * - فقط مقادیر عددی غیرحساس؛ بدون محتوای رکوردها.
 * - هر شمارش مستقل — خطای یک جدول بقیه را نمی‌اندازد.
 * - کَش حافظهٔ ۳۰ ثانیه‌ای تا polling سایدبار فشار به دیتابیس نیاورد.
 */

export interface AdminCounts {
  verifications: number;
  tickets: number;
  qa: number;
  errors: number;
  onboarding: number;
}

let cache: { at: number; data: AdminCounts } | null = null;
const CACHE_MS = 30_000;

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch {
    return 0;
  }
}

async function computeCounts(): Promise<AdminCounts> {
  const errSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [verifications, openTickets, qaPending, recentErrors, onboardingPending] = await Promise.all([
    safeCount(async () => (await db.select({ value: count() }).from(lawyerVerifications).where(eq(lawyerVerifications.status, "pending")))[0]?.value ?? 0),
    safeCount(async () => (await db.select({ value: count() }).from(tickets).where(eq(tickets.status, "open")))[0]?.value ?? 0),
    safeCount(async () => (await db.select({ value: count() }).from(qaSubmissions).where(eq(qaSubmissions.status, "pending_review")))[0]?.value ?? 0),
    safeCount(async () => (await db.select({ value: count() }).from(appErrors).where(gte(appErrors.createdAt, errSince)))[0]?.value ?? 0),
    safeCount(async () => (await db.select({ value: count() }).from(lawyerOnboarding).where(eq(lawyerOnboarding.status, "pending")))[0]?.value ?? 0),
  ]);
  return { verifications, tickets: openTickets, qa: qaPending, errors: recentErrors, onboarding: onboardingPending };
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let data: AdminCounts;
  if (cache && Date.now() - cache.at < CACHE_MS) {
    data = cache.data;
  } else {
    data = await computeCounts();
    cache = { at: Date.now(), data };
  }

  return NextResponse.json(
    { ok: true, counts: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
