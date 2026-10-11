import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases, caseOffers } from "@/db/schema";
import { caseEvents } from "@/db/schema-marketplace";
import { and, eq, ne } from "drizzle-orm";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { ensureProfileSchema } from "@/lib/auto-seed";
import { notifyOfferAccepted } from "@/lib/notify";
import { contractCodeFor } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";

/**
 * انتخاب وکیل توسط موکل — موکل با جفت caseNumber + trackingToken یکی از
 * پیشنهادها را تأیید می‌کند؛ بقیهٔ پیشنهادهای همان پرونده «رد‌شده» می‌شوند.
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "case-offer-accept", 20, 60_000);
  if (limited) return limited;
  let body: { caseNumber?: string; token?: string; offerId?: number };
  try {
    body = ((await readJson(req, 4_096)) ?? {}) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر" }, { status: 400 });
  }
  const caseNumber = text(body.caseNumber, 40);
  const token = text(body.token, 80);
  const offerId = Number(body.offerId);
  if (!caseNumber || !token || !Number.isInteger(offerId)) {
    return NextResponse.json({ ok: false, error: "اطلاعات انتخاب کامل نیست." }, { status: 422 });
  }
  try {
    await ensureProfileSchema();
    const [c] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.caseNumber, caseNumber), eq(cases.trackingToken, token)))
      .limit(1);
    if (!c) return NextResponse.json({ ok: false, error: "پرونده‌ای با این شماره و کد پیگیری پیدا نشد." }, { status: 404 });
    const [offer] = await db
      .select()
      .from(caseOffers)
      .where(and(eq(caseOffers.id, offerId), eq(caseOffers.caseId, c.id)))
      .limit(1);
    if (!offer) return NextResponse.json({ ok: false, error: "این پیشنهاد برای پروندهٔ شما ثبت نشده است." }, { status: 404 });
    if (offer.status === "declined") {
      return NextResponse.json({ ok: false, error: "این پیشنهاد قابل انتخاب نیست." }, { status: 409 });
    }
    if (c.assignedLawyerId) {
      if (c.assignedLawyerId === offer.lawyerId && offer.status === "accepted") {
        return NextResponse.json({ ok: true, alreadyAccepted: true, message: "این وکیل قبلاً انتخاب شده است." });
      }
      return NextResponse.json({ ok: false, error: "وکیل این پرونده قبلاً تعیین شده است." }, { status: 409 });
    }
    await db.update(caseOffers).set({ status: "accepted" }).where(eq(caseOffers.id, offerId));
    await db
      .update(caseOffers)
      .set({ status: "declined" })
      .where(and(eq(caseOffers.caseId, c.id), ne(caseOffers.id, offerId), eq(caseOffers.status, "sent")));
    // ── همگرایی دو سیستم مزایده: پذیرش در «بازار پرونده‌ها» هم مثل دادپیو وکیل را رسمی
    // به پرونده اختصاص می‌دهد (حق‌الوکالهٔ توافقی + قرارداد sent + رویداد سیستمی) تا
    // داشبوردها/مالی/تقویم همه از یک منبع حقیقت بخوانند.
    try {
      const code = contractCodeFor(c.id);
      await db
        .update(cases)
        .set({
          assignedLawyerId: offer.lawyerId,
          feeAgreed: String(offer.price ?? "0"),
          contractStatus: "sent",
          contractCode: code,
          status: "matched",
        })
        .where(eq(cases.id, c.id));
      await db.insert(caseEvents).values({
        caseId: c.id,
        actor: "system",
        actorName: "بازار پرونده‌ها",
        title: "وکیل منتخب شد",
        description: `پیشنهاد وکیل پذیرفته شد و حق‌الوکالهٔ توافق‌شده ثبت گردید (قرارداد ${code}).`,
        progress: Math.max(c.progress ?? 0, 20),
        visibleToClient: true,
      });
    } catch { /* best-effort — انتخاب وکیل نباید به‌خاطر رویداد/قرارداد بشکند */ }
    // اعلان «پیشنهاد شما پذیرفته شد» برای وکیلِ برنده — best-effort
    try {
      await notifyOfferAccepted(offer.lawyerId, c.subject);
    } catch { /* non-fatal */ }
    return NextResponse.json({ ok: true, message: "وکیل انتخاب شد؛ از این پس می‌توانید پاسخ پیام او را رایگان بدهید." });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
