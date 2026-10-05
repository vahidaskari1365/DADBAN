import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases, caseOffers, caseOfferReplies, lawyers } from "@/db/schema";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { getLawyerActor } from "@/lib/lawyer-actor";
import { ensureProfileSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * پیشنهاد وکلای استان روی پرونده‌های ثبت‌شده (/case/new).
 *
 * GET  ?caseNumber=&token=  → نمای موکل: همهٔ پیشنهادهای آن پرونده + گفتگوها
 *      (اثبات هویت موکل با جفت caseNumber + trackingToken — بدون احراز هویت)
 * GET  (بدون پارامتر)       → نمای وکیل/عضو تیم (دسترسی offers): پرونده‌های
 *      جدید استان وکیل + پیشنهادهای خودش همراه پاسخ‌های موکل
 * POST (احراز هویت وکیل)    → ثبت/به‌روزرسانی نظر + قیمت اعلامی روی یک پرونده
 */

function normalizeCity(c: string): string {
  return c.replace(/\s+/g, " ").trim().replace(/\u200c/g, " ");
}

export async function GET(req: Request) {
  const limited = rateLimit(req, "case-offers-get", 120, 60_000);
  if (limited) return limited;
  const url = new URL(req.url);
  const caseNumber = text(url.searchParams.get("caseNumber") ?? "", 40);
  const token = text(url.searchParams.get("token") ?? "", 80);

  /* ─── نمای موکل (شماره پرونده + کد پیگیری محرمانه) ─── */
  if (caseNumber && token) {
    try {
      await ensureProfileSchema();
      const [row] = await db
        .select()
        .from(cases)
        .where(and(eq(cases.caseNumber, caseNumber), eq(cases.trackingToken, token)))
        .limit(1);
      if (!row) {
        return NextResponse.json({ ok: false, error: "پرونده‌ای با این شماره و کد پیگیری پیدا نشد." }, { status: 404 });
      }
      const offers = await db
        .select({
          id: caseOffers.id,
          message: caseOffers.message,
          price: caseOffers.price,
          status: caseOffers.status,
          createdAt: caseOffers.createdAt,
          lawyerName: lawyers.name,
          lawyerSlug: lawyers.slug,
          lawyerCity: lawyers.city,
          lawyerRating: lawyers.rating,
          lawyerVerified: lawyers.verified,
          lawyerPhoto: lawyers.photoUrl,
          lawyerAvatar: lawyers.avatarColor,
        })
        .from(caseOffers)
        .innerJoin(lawyers, eq(caseOffers.lawyerId, lawyers.id))
        .where(eq(caseOffers.caseId, row.id))
        .orderBy(desc(caseOffers.status), desc(caseOffers.createdAt))
        .limit(50);
      const ids = offers.map((o) => o.id);
      const replies = ids.length
        ? await db
            .select()
            .from(caseOfferReplies)
            .where(inArray(caseOfferReplies.offerId, ids))
            .orderBy(asc(caseOfferReplies.id))
        : [];
      return NextResponse.json({
        ok: true,
        case: { caseNumber: row.caseNumber, subject: row.subject, city: row.city, stage: row.stage, createdAt: row.createdAt },
        offers: offers.map((o) => ({
          ...o,
          replies: replies
            .filter((r) => r.offerId === o.id)
            .map((r) => ({ id: r.id, sender: r.sender, body: r.body, createdAt: r.createdAt })),
        })),
      });
    } catch {
      return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
    }
  }

  /* ─── نمای وکیل / عضو تیم با دسترسی offers ─── */
  const actor = await getLawyerActor("offers");
  if (!actor) {
    return NextResponse.json({ ok: false, error: "برای دیدن درخواست‌های استان، با حساب وکیل وارد شوید." }, { status: 401 });
  }
  try {
    await ensureProfileSchema();
    const [me] = await db.select({ city: lawyers.city }).from(lawyers).where(eq(lawyers.id, actor.lawyerId)).limit(1);
    const myCity = normalizeCity(me?.city ?? "");
    // پرونده‌های جدید استان وکیل (به‌علاوه پرونده‌هایی که خودش رویشان پیشنهاد داده)
    const rows = await db
      .select({
        id: cases.id,
        caseNumber: cases.caseNumber,
        subject: cases.subject,
        description: cases.description,
        city: cases.city,
        stage: cases.stage,
        status: cases.status,
        createdAt: cases.createdAt,
      })
      .from(cases)
      .where(sql`${cases.status} in ('new','reviewing')`)
      .orderBy(desc(cases.createdAt))
      .limit(40);
    const cityRows = rows.filter((r) => !myCity || normalizeCity(r.city) === myCity);
    const myOffers = await db
      .select()
      .from(caseOffers)
      .where(eq(caseOffers.lawyerId, actor.lawyerId))
      .orderBy(desc(caseOffers.createdAt))
      .limit(50);
    const myOfferByCase = new Map(myOffers.map((o) => [o.caseId, o]));
    const offerIds = myOffers.map((o) => o.id);
    const replies = offerIds.length
      ? await db
          .select()
          .from(caseOfferReplies)
          .where(inArray(caseOfferReplies.offerId, offerIds))
          .orderBy(asc(caseOfferReplies.id))
      : [];
    return NextResponse.json({
      ok: true,
      lawyerName: actor.user.name,
      city: me?.city ?? "",
      newCases: cityRows.map((c) => {
        const o = myOfferByCase.get(c.id);
        return {
          ...c,
          myOffer: o
            ? {
                id: o.id,
                message: o.message,
                price: o.price,
                status: o.status,
                createdAt: o.createdAt,
                replies: replies.filter((r) => r.offerId === o.id).map((r) => ({ id: r.id, sender: r.sender, body: r.body, createdAt: r.createdAt })),
              }
            : null,
        };
      }),
      myOffers: myOffers
        .filter((o) => !cityRows.some((c) => c.id === o.caseId))
        .map((o) => ({
          ...o,
          replies: replies.filter((r) => r.offerId === o.id).map((r) => ({ id: r.id, sender: r.sender, body: r.body, createdAt: r.createdAt })),
        })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "case-offers-post", 30, 60_000);
  if (limited) return limited;
  const actor = await getLawyerActor("offers");
  if (!actor) {
    return NextResponse.json({ ok: false, error: "برای ثبت پیشنهاد، با حساب وکیل وارد شوید." }, { status: 401 });
  }
  let body: { caseId?: number; message?: string; price?: number };
  try {
    body = ((await readJson(req, 8_192)) ?? {}) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر" }, { status: 400 });
  }
  const message = text(body.message, 2000);
  const caseId = Number(body.caseId);
  const price = Math.max(0, Math.min(2_000_000_000, Math.round(Number(body.price) || 0)));
  if (!message || !Number.isInteger(caseId)) {
    return NextResponse.json({ ok: false, error: "نظر و پروندهٔ مقصد الزامی است." }, { status: 422 });
  }
  try {
    await ensureProfileSchema();
    const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!c) return NextResponse.json({ ok: false, error: "پرونده پیدا نشد." }, { status: 404 });
    const [me] = await db.select({ city: lawyers.city }).from(lawyers).where(eq(lawyers.id, actor.lawyerId)).limit(1);
    // broadcast استانی: وکیل فقط روی پروندهٔ استان خودش پیشنهاد می‌دهد
    if (me?.city && normalizeCity(c.city) !== normalizeCity(me.city)) {
      return NextResponse.json({ ok: false, error: "این پرونده در استان شما ثبت نشده است." }, { status: 403 });
    }
    await db
      .insert(caseOffers)
      .values({ caseId, lawyerId: actor.lawyerId, message, price })
      .onConflictDoUpdate({
        target: [caseOffers.caseId, caseOffers.lawyerId],
        set: { message, price, status: sql`case when ${caseOffers.status} = 'accepted' then 'accepted' else 'sent' end`, createdAt: new Date() },
      });
    return NextResponse.json({ ok: true, message: "پیشنهاد شما برای موکل ارسال شد." });
  } catch {
    return NextResponse.json({ ok: false, error: "ثبت پیشنهاد انجام نشد." }, { status: 500 });
  }
}
