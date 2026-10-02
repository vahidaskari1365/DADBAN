import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyers, lawyerAvailability, consultations } from "@/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { bookableDates, computeSlots, parseTehranDay } from "@/lib/availability";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?lawyer=<slug>&date=YYYY-MM-DD&duration=<min>
 * Returns REAL free slots for a lawyer on a given day: weekly rules
 * (Asia/Tehran) minus already-booked consultations.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = (url.searchParams.get("lawyer") ?? "").slice(0, 80);
  const date = url.searchParams.get("date") ?? "";
  const durationMin = Math.max(15, Math.min(240, Number(url.searchParams.get("duration") || 30)));

  const days = bookableDates(new Date(), 10);
  if (!slug) {
    return NextResponse.json({ ok: true, days, slots: [] });
  }

  try {
    const lw = await db.select().from(lawyers).where(eq(lawyers.slug, slug)).limit(1);
    if (!lw.length) {
      return NextResponse.json({ ok: false, error: "وکیل یافت نشد" }, { status: 404 });
    }
    const lawyerId = lw[0].id;

    if (!date) {
      return NextResponse.json({ ok: true, days, slots: [] });
    }

    const dayStart = parseTehranDay(date);
    if (!dayStart) {
      return NextResponse.json({ ok: false, error: "تاریخ نامعتبر" }, { status: 422 });
    }
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const [rules, booked] = await Promise.all([
      db.select().from(lawyerAvailability).where(eq(lawyerAvailability.lawyerId, lawyerId)),
      db
        .select({ startsAt: consultations.startsAt, status: consultations.status })
        .from(consultations)
        .where(
          and(
            eq(consultations.lawyerId, lawyerId),
            gte(consultations.startsAt, dayStart),
            lt(consultations.startsAt, dayEnd),
            sql`${consultations.status}::text NOT IN ('cancelled','expired','refunded')`,
          ),
        ),
    ]);

    const taken = booked.map((b) => b.startsAt).filter((d): d is Date => d instanceof Date);
    const slots = computeSlots({
      rules: rules.map((r) => ({ weekday: r.weekday, startMin: r.startMin, endMin: r.endMin })),
      dayStartUtc: dayStart,
      durationMin,
      takenStarts: taken,
    });

    return NextResponse.json({ ok: true, days, slots, lawyerName: lw[0].name });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
