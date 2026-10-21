import { NextResponse } from "next/server";
import { db } from "@/db";
import { consultations } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { getLawyerActor } from "@/lib/lawyer-actor";
import { getLawyerEligibility } from "@/lib/lawyer-eligibility";
import { ensureProfileSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * کارتابل مشاورهٔ وکیل — چرخهٔ کامل درخواست موکل:
 *   pending / payment_pending / paid  →  (تأیید)  →  confirmed | scheduled  →  completed
 *                                     →  (لغو)    →  cancelled
 *
 * GET  — فهرست درخواست‌های فعال + تاریخچهٔ اخیر وکیلِ کارپرداز
 * PATCH — اقدام وکیل روی یک درخواست: confirm | cancel | complete (+ startsAt اختیاری)
 *
 * گارد: فقط حساب وکیل/عضو تیم با دسترسی consultations؛ فقط درخواست‌های
 * متعلق به همان وکیل (consultations.lawyerId = actor.lawyerId).
 */

const OPEN_STATUSES = ["pending", "payment_pending", "paid", "confirmed", "scheduled", "in_progress"] as const;

export async function GET(req: Request) {
  const limited = rateLimit(req, "consult-manage-get", 90, 60_000);
  if (limited) return limited;
  const actor = await getLawyerActor("consultations");
  if (!actor) return NextResponse.json({ ok: false, error: "برای کارتابل مشاوره باید با حساب وکیل وارد شوید." }, { status: 401 });
  try {
    await ensureProfileSchema();
    const openRows = await db
      .select()
      .from(consultations)
      .where(and(eq(consultations.lawyerId, actor.lawyerId), inArray(consultations.status, [...OPEN_STATUSES])))
      .orderBy(desc(consultations.createdAt))
      .limit(30);
    const doneRows = await db
      .select()
      .from(consultations)
      .where(and(eq(consultations.lawyerId, actor.lawyerId), inArray(consultations.status, ["completed", "cancelled", "expired", "refunded"])))
      .orderBy(desc(consultations.createdAt))
      .limit(12);
    const shape = (r: typeof consultations.$inferSelect) => ({
      id: r.id,
      type: r.type,
      duration: r.duration,
      clientName: r.clientName,
      clientPhone: r.clientPhone,
      subject: r.subject,
      startsAt: r.startsAt ? new Date(r.startsAt).toISOString() : null,
      price: Number(r.price ?? 0),
      status: r.status,
      createdAt: new Date(r.createdAt).toISOString(),
    });
    return NextResponse.json({ ok: true, open: openRows.map(shape), history: doneRows.map(shape) });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const limited = rateLimit(req, "consult-manage-patch", 40, 60_000);
  if (limited) return limited;
  const actor = await getLawyerActor("consultations");
  if (!actor) return NextResponse.json({ ok: false, error: "برای اقدام باید با حساب وکیل وارد شوید." }, { status: 401 });
  // گیت وضعیت: وکیل/کارشناس احرازنشده هنوز نمی‌تواند درخواست مشاوره بپذیرد یا لغو/تکمیل کند
  try {
    await ensureProfileSchema();
    const body = await readJson(req, 2_048);
    const id = Number(body?.id);
    const action = text(body?.action, 20);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ ok: false, error: "شناسه درخواست نامعتبر است." }, { status: 422 });
    if (!action || !["confirm", "cancel", "complete"].includes(action)) {
      return NextResponse.json({ ok: false, error: "اقدام نامعتبر است." }, { status: 422 });
    }
    const eligibility = await getLawyerEligibility(actor.lawyerId);
    if (eligibility?.consultationBlock) {
      return NextResponse.json({ ok: false, error: eligibility.consultationBlock }, { status: 403 });
    }

    const [row] = await db.select().from(consultations).where(eq(consultations.id, id)).limit(1);
    if (!row) return NextResponse.json({ ok: false, error: "درخواست یافت نشد." }, { status: 404 });
    if (row.lawyerId !== actor.lawyerId) {
      return NextResponse.json({ ok: false, error: "این درخواست متعلق به پنل شما نیست." }, { status: 403 });
    }

    // زمان اختیاری نوبت — فقط برای تأیید با ساعت مشخص (scheduled) یا بدون آن (confirmed)
    let startsAt: Date | null = row.startsAt ?? null;
    if (action === "confirm" && typeof body?.startsAt === "string" && body.startsAt.trim()) {
      const d = new Date(body.startsAt.trim());
      if (!Number.isNaN(d.getTime())) startsAt = d;
    }

    const s = row.status;
    if (action === "confirm") {
      if (!["pending", "payment_pending", "paid"].includes(s)) {
        return NextResponse.json({ ok: false, error: "این درخواست در وضعیت قابل تأیید نیست." }, { status: 422 });
      }
      const next = startsAt ? "scheduled" : "confirmed";
      await db.update(consultations).set({ status: next, startsAt: startsAt ?? row.startsAt }).where(eq(consultations.id, id));
      return NextResponse.json({ ok: true, status: next });
    }
    if (action === "cancel") {
      if (!["pending", "payment_pending", "paid", "confirmed", "scheduled"].includes(s)) {
        return NextResponse.json({ ok: false, error: "این درخواست در وضعیت قابل لغو نیست." }, { status: 422 });
      }
      await db.update(consultations).set({ status: "cancelled" }).where(eq(consultations.id, id));
      return NextResponse.json({ ok: true, status: "cancelled" });
    }
    // complete
    if (!["confirmed", "scheduled", "in_progress"].includes(s)) {
      return NextResponse.json({ ok: false, error: "این درخواست در وضعیت قابل تکمیل نیست." }, { status: 422 });
    }
    await db.update(consultations).set({ status: "completed" }).where(eq(consultations.id, id));
    return NextResponse.json({ ok: true, status: "completed" });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
