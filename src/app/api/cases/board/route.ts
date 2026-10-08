import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases, caseOffers, lawyers } from "@/db/schema";
import { desc, eq, sql, inArray } from "drizzle-orm";
import { rateLimit } from "@/lib/api-security";
import { getLawyerActor } from "@/lib/lawyer-actor";
import { ensureProfileSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * «بازار پرونده‌های دادبان» — برد عمومی پرونده‌های باز (مدل بازار کار):
 * موکل پرونده ثبت می‌کند ← پرونده (بدون اطلاعات تماس) در همین برد دیده می‌شود ←
 * وکلای متخصص نظر + پیشنهاد قیمت ثبت می‌کنند ← موکل بهترین را انتخاب می‌کند.
 *
 * GET            → همهٔ پرونده‌های باز (sanitize) + آمار زنده + هویت وکیلِ واردشده
 * GET ?id=       → جزئیات کامل یک پروندهٔ باز (sanitize) + پیشنهاد خود وکیل
 *
 * حریم خصوصی: شمارهٔ پرونده، کد پیگیری، نام و موبایل موکل هرگز عمومی نمی‌شود؛
 * در متن توضیحات هم هر شمارهٔ تماس/ایمیل به‌صورت خودکار ماسک می‌شود.
 * ثبت پیشنهاد از POST /api/cases/offers (احراز هویت وکیل) انجام می‌شود.
 */

function normalizeCity(c: string): string {
  return c.replace(/\s+/g, " ").trim().replace(/\u200c/g, " ");
}

/** ماسک خودکار شماره‌های تماس و ایمیل در متن عمومی پرونده */
function sanitizePublicText(s: string): string {
  return s
    // ایمیل‌ها
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "ایمیل•••")
    // شماره موبایل با ارقام انگلیسی
    .replace(/(?:\+?98|0098|0)9\d{9}/g, "۰۹•••••••••")
    // موبایل با ارقام فارسی/عربی
    .replace(/(?:\+?۹۸|۰۰۹۸|۰)?۹[۰-۹]{9}/g, "۰۹•••••••••")
    // هر دنبالهٔ طولانی رقم (تلفن ثابت، کد ملی و…)
    .replace(/\d{7,}/g, "••••••")
    .replace(/[۰-۹]{7,}/g, "••••••");
}

function snippet(s: string, max = 240): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

export async function GET(req: Request) {
  const limited = rateLimit(req, "case-board-get", 120, 60_000);
  if (limited) return limited;
  const url = new URL(req.url);
  const detailId = Number(url.searchParams.get("id"));

  try {
    await ensureProfileSchema();

    /* ─── وکیل واردشده؟ (اختیاری — برای نمایش «استان شما» و فرم پیشنهاد) ─── */
    const actor = await getLawyerActor("offers");
    let actorCity: string | null = null;
    let actorName: string | null = null;
    if (actor) {
      const [me] = await db
        .select({ city: lawyers.city, name: lawyers.name })
        .from(lawyers)
        .where(eq(lawyers.id, actor.lawyerId))
        .limit(1);
      actorCity = me?.city ?? null;
      actorName = me?.name ?? actor.user.name;
    }

    /* پرونده‌های باز = new/reviewing و بدون پیشنهادِ پذیرفته‌شده */
    const rows = await db
      .select({
        id: cases.id,
        subject: cases.subject,
        description: cases.description,
        city: cases.city,
        stage: cases.stage,
        budget: cases.budget,
        createdAt: cases.createdAt,
        acceptedAt: sql<string | null>`(
          select min(${caseOffers.createdAt})::text from ${caseOffers}
          where ${caseOffers.caseId} = ${cases.id} and ${caseOffers.status} = 'accepted'
        )`,
      })
      .from(cases)
      .where(sql`${cases.status} in ('new','reviewing')`)
      .orderBy(desc(cases.createdAt))
      .limit(80);

    const open = rows.filter((r) => !r.acceptedAt);
    const ids = open.map((r) => r.id);

    /* تعداد پیشنهاد هر پروندهٔ باز */
    const counts = ids.length
      ? await db
          .select({ caseId: caseOffers.caseId, n: sql<number>`count(*)::int` })
          .from(caseOffers)
          .where(inArray(caseOffers.caseId, ids))
          .groupBy(caseOffers.caseId)
      : [];
    const countByCase = new Map(counts.map((c) => [c.caseId, Number(c.n)]));

    /* آمار زندهٔ بازار */
    const [offerAgg, lawyerAgg] = await Promise.all([
      ids.length
        ? db
            .select({ n: sql<number>`count(*)::int` })
            .from(caseOffers)
            .where(inArray(caseOffers.caseId, ids))
        : Promise.resolve([{ n: 0 }]),
      db.select({ n: sql<number>`count(*)::int` }).from(lawyers),
    ]);

    const stats = {
      openCases: open.length,
      totalOffers: Number(offerAgg[0]?.n ?? 0),
      lawyers: Number(lawyerAgg[0]?.n ?? 0),
    };

    /* ─── نمای جزئیات یک پرونده ─── */
    if (Number.isInteger(detailId) && detailId > 0) {
      const [row] = await db
        .select({
          id: cases.id,
          subject: cases.subject,
          description: cases.description,
          city: cases.city,
          stage: cases.stage,
          budget: cases.budget,
          status: cases.status,
          createdAt: cases.createdAt,
        })
        .from(cases)
        .where(eq(cases.id, detailId))
        .limit(1);
      if (!row || !["new", "reviewing"].includes(row.status)) {
        return NextResponse.json({ ok: false, error: "این پرونده در بازار باز نیست." }, { status: 404 });
      }
      const caseOfferRows = await db
        .select({ price: caseOffers.price, status: caseOffers.status })
        .from(caseOffers)
        .where(eq(caseOffers.caseId, row.id));
      const accepted = caseOfferRows.some((o) => o.status === "accepted");
      let myOffer: { id: number; message: string; price: number; status: string; createdAt: Date } | null = null;
      if (actor) {
        const [mine] = await db
          .select()
          .from(caseOffers)
          .where(sql`${caseOffers.caseId} = ${row.id} and ${caseOffers.lawyerId} = ${actor.lawyerId}`)
          .limit(1);
        if (mine) {
          myOffer = {
            id: mine.id,
            message: mine.message,
            price: mine.price,
            status: mine.status,
            createdAt: mine.createdAt,
          };
        }
      }
      return NextResponse.json({
        ok: true,
        case: {
          id: row.id,
          subject: row.subject,
          description: sanitizePublicText(row.description),
          city: row.city,
          stage: row.stage,
          budget: row.budget,
          createdAt: row.createdAt,
          closed: accepted,
          offersCount: caseOfferRows.length,
        },
        myOffer,
        actor: actor ? { name: actorName, city: actorCity } : null,
      });
    }

    /* ─── لیست برد عمومی ─── */
    const cityList = Array.from(new Set(open.map((r) => r.city).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "fa"),
    );

    return NextResponse.json({
      ok: true,
      stats,
      actor: actor ? { name: actorName, city: actorCity } : null,
      cities: cityList,
      cases: open.map((r) => ({
        id: r.id,
        subject: r.subject,
        description: snippet(sanitizePublicText(r.description)),
        city: r.city,
        stage: r.stage,
        budget: r.budget,
        createdAt: r.createdAt,
        offersCount: countByCase.get(r.id) ?? 0,
        /** آیا این پرونده در استان وکیل واردشده است؟ */
        inMyProvince: actorCity ? normalizeCity(r.city) === normalizeCity(actorCity) : null,
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
