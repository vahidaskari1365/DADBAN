import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyers, tovakilCases, tovakilRequests } from "@/db/schema";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { getLawyerActor } from "@/lib/lawyer-actor";
import { getLawyerEligibility } from "@/lib/lawyer-eligibility";
import { ensureProfileSchema } from "@/lib/auto-seed";
import { LEGAL_TOPICS } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * توکیل — بازار واگذاری پرونده بین وکلا (گام ۳ درخواست کارفرما)
 * فقط حساب‌های سمت وکیل (lawyer / team با دسترسی cases) این بازار را می‌بینند؛
 * موکل‌ها هیچ دسترسی‌ای به این مسیر ندارند.
 *
 * GET  → فهرست: پرونده‌های باز بازار + پرونده‌های خودم + درخواست‌های من
 * POST → ثبت پرونده برای واگذاری (فقط وکیل احرازشدهٔ غیرکارشناس — مالک پرونده)
 */

const TOPIC_LABELS = new Set(LEGAL_TOPICS.map((t) => t.label));

function caseNumber(): string {
  return `TVK-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function GET(req: Request) {
  const limited = rateLimit(req, "tovakil-get", 120, 60_000);
  if (limited) return limited;
  const actor = await getLawyerActor("cases");
  if (!actor) {
    return NextResponse.json({ ok: false, error: "توکیل فقط برای وکلا است؛ با حساب وکیل وارد شوید." }, { status: 401 });
  }
  try {
    await ensureProfileSchema();
    const eligibility = await getLawyerEligibility(actor.lawyerId);

    // بازار: همهٔ پرونده‌های باز + واگذارشده‌های اخیر (بدون پرونده‌های خودم — جداگانه)
    const market = await db
      .select({
        id: tovakilCases.id,
        caseNumber: tovakilCases.caseNumber,
        subject: tovakilCases.subject,
        description: tovakilCases.description,
        topic: tovakilCases.topic,
        city: tovakilCases.city,
        budget: tovakilCases.budget,
        status: tovakilCases.status,
        createdAt: tovakilCases.createdAt,
        ownerId: tovakilCases.ownerLawyerId,
        ownerName: lawyers.name,
        ownerSlug: lawyers.slug,
        ownerTitle: lawyers.title,
        ownerCity: lawyers.city,
        requests: sql<number>`(select count(*)::int from ${tovakilRequests} r where r.case_id = ${tovakilCases.id} and r.status = 'pending')`,
      })
      .from(tovakilCases)
      .innerJoin(lawyers, eq(lawyers.id, tovakilCases.ownerLawyerId))
      .where(and(ne(tovakilCases.ownerLawyerId, actor.lawyerId), ne(tovakilCases.status, "closed")))
      .orderBy(desc(tovakilCases.createdAt))
      .limit(60);

    const mine = await db
      .select({
        id: tovakilCases.id,
        caseNumber: tovakilCases.caseNumber,
        subject: tovakilCases.subject,
        description: tovakilCases.description,
        topic: tovakilCases.topic,
        city: tovakilCases.city,
        budget: tovakilCases.budget,
        status: tovakilCases.status,
        createdAt: tovakilCases.createdAt,
        assignedLawyerId: tovakilCases.assignedLawyerId,
        requests: sql<number>`(select count(*)::int from ${tovakilRequests} r where r.case_id = ${tovakilCases.id} and r.status = 'pending')`,
      })
      .from(tovakilCases)
      .where(eq(tovakilCases.ownerLawyerId, actor.lawyerId))
      .orderBy(desc(tovakilCases.createdAt))
      .limit(30);

    // درخواست‌های من روی پرونده‌های دیگران
    const myRequests = await db
      .select({
        id: tovakilRequests.id,
        caseId: tovakilRequests.caseId,
        status: tovakilRequests.status,
        message: tovakilRequests.message,
        price: tovakilRequests.price,
        createdAt: tovakilRequests.createdAt,
        subject: tovakilCases.subject,
        caseNumber: tovakilCases.caseNumber,
        caseStatus: tovakilCases.status,
      })
      .from(tovakilRequests)
      .innerJoin(tovakilCases, eq(tovakilCases.id, tovakilRequests.caseId))
      .where(and(eq(tovakilRequests.lawyerId, actor.lawyerId), or(eq(tovakilRequests.status, "pending"), eq(tovakilRequests.status, "accepted"))))
      .orderBy(desc(tovakilRequests.createdAt))
      .limit(30);

    // درخواست‌های دریافتی روی پرونده‌های خودم
    const ownerId = tovakilCases.ownerLawyerId;
    const incoming = await db
      .select({
        id: tovakilRequests.id,
        caseId: tovakilRequests.caseId,
        message: tovakilRequests.message,
        price: tovakilRequests.price,
        status: tovakilRequests.status,
        createdAt: tovakilRequests.createdAt,
        lawyerId: tovakilRequests.lawyerId,
        lawyerName: lawyers.name,
        lawyerSlug: lawyers.slug,
        lawyerCity: lawyers.city,
        lawyerTitle: lawyers.title,
        lawyerVerified: lawyers.verified,
      })
      .from(tovakilRequests)
      .innerJoin(tovakilCases, eq(tovakilCases.id, tovakilRequests.caseId))
      .innerJoin(lawyers, eq(lawyers.id, tovakilRequests.lawyerId))
      .where(and(eq(ownerId, actor.lawyerId), eq(tovakilRequests.status, "pending")))
      .orderBy(desc(tovakilRequests.createdAt))
      .limit(60);

    return NextResponse.json({ ok: true, market, mine, myRequests, incoming, eligibility: eligibility ? { verified: eligibility.verified, isExpert: eligibility.isExpert, caseActionBlock: eligibility.caseActionBlock } : null });
  } catch {
    return NextResponse.json({ ok: false, error: "بارگیری توکیل ممکن نشد؛ بعداً تلاش کنید." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "tovakil-post", 10, 60_000);
  if (limited) return limited;
  const actor = await getLawyerActor("cases");
  if (!actor || actor.role !== "lawyer") {
    return NextResponse.json({ ok: false, error: "ثبت پرونده در توکیل فقط برای وکلا است." }, { status: 401 });
  }
  const eligibility = await getLawyerEligibility(actor.lawyerId);
  if (!eligibility || eligibility.caseActionBlock) {
    return NextResponse.json(
      { ok: false, error: eligibility?.caseActionBlock ?? "ثبت پرونده در توکیل فعلاً برای حساب شما باز نیست." },
      { status: 403 },
    );
  }
  const body = await readJson(req, 8_192);
  if (!body) return NextResponse.json({ ok: false, error: "بدنهٔ درخواست نامعتبر است." }, { status: 422 });

  const subject = text(body.subject, 140);
  const description = text(body.description, 4000);
  const topic = text(body.topic, 60);
  const city = text(body.city, 60);
  const budget = text(body.budget, 60);
  if (!subject || subject.length < 10) {
    return NextResponse.json({ ok: false, error: "موضوع پرونده را واضح بنویسید (حداقل ۱۰ نویسه)." }, { status: 422 });
  }
  if (!description || description.length < 30) {
    return NextResponse.json({ ok: false, error: "شرح پرونده حداقل ۳۰ نویسه باشد تا همکار بتواند تصمیم بگیرد." }, { status: 422 });
  }
  if (topic && !TOPIC_LABELS.has(topic)) {
    return NextResponse.json({ ok: false, error: "موضوع حقوقی معتبر نیست." }, { status: 422 });
  }

  try {
    await ensureProfileSchema();
    // سقف پویا: هر وکیل حداکثر ۲۰ پروندهٔ باز توکیل داشته باشد (ضد انباشت)
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(tovakilCases)
      .where(and(eq(tovakilCases.ownerLawyerId, actor.lawyerId), eq(tovakilCases.status, "open")));
    if ((c ?? 0) >= 20) {
      return NextResponse.json({ ok: false, error: "۲۰ پروندهٔ باز توکیل دارید؛ یکی را واگذار یا ببندید و دوباره تلاش کنید." }, { status: 429 });
    }
    const [row] = await db
      .insert(tovakilCases)
      .values({
        caseNumber: caseNumber(),
        ownerLawyerId: actor.lawyerId,
        subject,
        description,
        topic: topic || "",
        city: city || "",
        budget: budget || "",
        status: "open",
      })
      .returning({ id: tovakilCases.id, caseNumber: tovakilCases.caseNumber });
    return NextResponse.json({ ok: true, case: row });
  } catch {
    return NextResponse.json({ ok: false, error: "ثبت پرونده موقتاً ممکن نشد؛ بعداً تلاش کنید." }, { status: 500 });
  }
}
