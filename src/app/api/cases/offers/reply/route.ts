import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases, caseOffers, caseOfferReplies } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { getLawyerActor } from "@/lib/lawyer-actor";
import { ensureProfileSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * گفتگوی رایگان موکل↔وکیل روی هر پیشنهاد.
 * - موکل با caseNumber + trackingToken پاسخ می‌دهد (فقط روی پیشنهادِ انتخاب‌شده — رایگان)
 * - وکیل صاحب پیشنهاد (یا عضو تیم با دسترسی offers) همیشه می‌تواند پاسخ دهد
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "case-offer-reply", 60, 60_000);
  if (limited) return limited;
  let body: { caseNumber?: string; token?: string; offerId?: number; body?: string };
  try {
    body = ((await readJson(req, 8_192)) ?? {}) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر" }, { status: 400 });
  }
  const caseNumber = text(body.caseNumber, 40);
  const token = text(body.token, 80);
  const text_ = text(body.body, 2000);
  const offerId = Number(body.offerId);
  if (!text_ || !Number.isInteger(offerId)) {
    return NextResponse.json({ ok: false, error: "متن پاسخ خالی است." }, { status: 422 });
  }

  try {
    await ensureProfileSchema();
    const [offer] = await db.select().from(caseOffers).where(eq(caseOffers.id, offerId)).limit(1);
    if (!offer) return NextResponse.json({ ok: false, error: "پیشنهاد پیدا نشد." }, { status: 404 });

    /* ─── پاسخ وکیل (یا عضو تیمِ وکیل) ─── */
    const actor = await getLawyerActor("offers");
    if (actor && offer.lawyerId === actor.lawyerId) {
      const [row] = await db
        .insert(caseOfferReplies)
        .values({ offerId, sender: "lawyer", body: text_ })
        .returning();
      return NextResponse.json({ ok: true, reply: { id: row.id, sender: row.sender, body: row.body, createdAt: row.createdAt } });
    }

    /* ─── پاسخ موکل — فقط روی پیشنهاد انتخاب‌شده و با اثبات مالکیت پرونده ─── */
    if (!caseNumber || !token) {
      return NextResponse.json({ ok: false, error: "برای پاسخ، شماره پرونده و کد پیگیری لازم است." }, { status: 401 });
    }
    const [c] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.caseNumber, caseNumber), eq(cases.trackingToken, token)))
      .limit(1);
    if (!c) return NextResponse.json({ ok: false, error: "پرونده‌ای با این شماره و کد پیگیری پیدا نشد." }, { status: 404 });
    if (offer.caseId !== c.id) {
      return NextResponse.json({ ok: false, error: "این پیشنهاد برای پروندهٔ شما نیست." }, { status: 403 });
    }
    if (offer.status !== "accepted") {
      return NextResponse.json({ ok: false, error: "پاسخ دادن پس از انتخاب وکیل فعال می‌شود؛ ابتدا وکیل را انتخاب کنید." }, { status: 403 });
    }
    const [row] = await db
      .insert(caseOfferReplies)
      .values({ offerId, sender: "client", body: text_ })
      .returning();
    return NextResponse.json({ ok: true, reply: { id: row.id, sender: row.sender, body: row.body, createdAt: row.createdAt } });
  } catch {
    return NextResponse.json({ ok: false, error: "ارسال پاسخ انجام نشد." }, { status: 500 });
  }
}
