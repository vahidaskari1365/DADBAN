import { NextResponse } from "next/server";
import { db } from "@/db";
import { tovakilCases, tovakilRequests, users } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { getLawyerActor } from "@/lib/lawyer-actor";
import { getLawyerEligibility } from "@/lib/lawyer-eligibility";
import { ensureProfileSchema } from "@/lib/auto-seed";
import { notifyTovakilNewRequest } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * درخواست توکیل روی یک پرونده — POST /api/tovakil/[id]/requests
 * فقط وکیل احرازشدهٔ غیرکارشناس و غیرمالک می‌تواند درخواست بدهد.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "tovakil-req-post", 20, 60_000);
  if (limited) return limited;
  const actor = await getLawyerActor("cases");
  if (!actor || actor.role !== "lawyer") {
    return NextResponse.json({ ok: false, error: "درخواست توکیل فقط برای وکلا است." }, { status: 401 });
  }
  const eligibility = await getLawyerEligibility(actor.lawyerId);
  if (!eligibility || eligibility.caseActionBlock) {
    return NextResponse.json({ ok: false, error: eligibility?.caseActionBlock ?? "درخواست توکیل برای حساب شما باز نیست." }, { status: 403 });
  }
  const { id } = await params;
  const caseId = Number(id);
  if (!Number.isInteger(caseId) || caseId <= 0) {
    return NextResponse.json({ ok: false, error: "شناسهٔ پرونده نامعتبر است." }, { status: 422 });
  }
  const body = await readJson(req, 4_096);
  if (!body) return NextResponse.json({ ok: false, error: "بدنهٔ درخواست نامعتبر است." }, { status: 422 });
  const message = text(body.message, 1200);
  const price = text(body.price, 60);
  if (!message || message.length < 15) {
    return NextResponse.json({ ok: false, error: "پیام درخواست حداقل ۱۵ نویسه باشد — همکار باید بداند چرا شما مناسب این پرونده‌اید." }, { status: 422 });
  }

  try {
    await ensureProfileSchema();
    const [c] = await db.select().from(tovakilCases).where(eq(tovakilCases.id, caseId)).limit(1);
    if (!c) return NextResponse.json({ ok: false, error: "پروندهٔ توکیل یافت نشد." }, { status: 404 });
    if (c.ownerLawyerId === actor.lawyerId) {
      return NextResponse.json({ ok: false, error: "این پروندهٔ خودتان است." }, { status: 409 });
    }
    if (c.status !== "open") {
      return NextResponse.json({ ok: false, error: "این پرونده دیگر باز نیست." }, { status: 409 });
    }
    const [row] = await db
      .insert(tovakilRequests)
      .values({ caseId, lawyerId: actor.lawyerId, message, price: price || "", status: "pending" })
      .onConflictDoUpdate({
        target: [tovakilRequests.caseId, tovakilRequests.lawyerId],
        set: { message, price: price || "", status: "pending", createdAt: new Date() },
      })
      .returning({ id: tovakilRequests.id });
    // اعلان به مالک (best-effort)
    await notifyTovakilNewRequest({ ownerLawyerId: c.ownerLawyerId, subject: c.subject, requesterName: eligibility.name, caseNumber: c.caseNumber });
    return NextResponse.json({ ok: true, request: row });
  } catch {
    return NextResponse.json({ ok: false, error: "ثبت درخواست موقتاً ممکن نشد؛ بعداً تلاش کنید." }, { status: 500 });
  }
}

/**
 * واگذاری پرونده به یک درخواست‌دهنده — PUT /api/tovakil/[id]/requests  body: { requestId }
 * فقط مالک پرونده؛ پرونده باید باز باشد.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "tovakil-req-put", 20, 60_000);
  if (limited) return limited;
  const actor = await getLawyerActor("cases");
  if (!actor || actor.role !== "lawyer") {
    return NextResponse.json({ ok: false, error: "واگذاری فقط توسط وکیل مالک ممکن است." }, { status: 401 });
  }
  const eligibility = await getLawyerEligibility(actor.lawyerId);
  if (!eligibility || eligibility.caseActionBlock) {
    return NextResponse.json({ ok: false, error: eligibility?.caseActionBlock ?? "واگذاری برای حساب شما باز نیست." }, { status: 403 });
  }
  const { id } = await params;
  const caseId = Number(id);
  if (!Number.isInteger(caseId) || caseId <= 0) {
    return NextResponse.json({ ok: false, error: "شناسهٔ پرونده نامعتبر است." }, { status: 422 });
  }
  const body = await readJson(req, 1_024);
  if (!body) return NextResponse.json({ ok: false, error: "بدنهٔ درخواست نامعتبر است." }, { status: 422 });
  const requestId = Number(body.requestId);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return NextResponse.json({ ok: false, error: "شناسهٔ درخواست نامعتبر است." }, { status: 422 });
  }

  try {
    await ensureProfileSchema();
    const [c] = await db.select().from(tovakilCases).where(eq(tovakilCases.id, caseId)).limit(1);
    if (!c) return NextResponse.json({ ok: false, error: "پروندهٔ توکیل یافت نشد." }, { status: 404 });
    if (c.ownerLawyerId !== actor.lawyerId) {
      return NextResponse.json({ ok: false, error: "فقط مالک پرونده می‌تواند واگذاری کند." }, { status: 403 });
    }
    if (c.status !== "open") {
      return NextResponse.json({ ok: false, error: "این پرونده قبلاً واگذار یا بسته شده است." }, { status: 409 });
    }
    const [req_] = await db.select().from(tovakilRequests).where(and(eq(tovakilRequests.id, requestId), eq(tovakilRequests.caseId, caseId))).limit(1);
    if (!req_) return NextResponse.json({ ok: false, error: "درخواست یافت نشد." }, { status: 404 });
    if (req_.lawyerId === actor.lawyerId) {
      return NextResponse.json({ ok: false, error: "درخواست‌دهنده باید وکیل دیگری باشد." }, { status: 409 });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(tovakilCases)
        .set({ status: "assigned", assignedLawyerId: req_.lawyerId, assignedAt: new Date() })
        .where(eq(tovakilCases.id, caseId));
      await tx.update(tovakilRequests).set({ status: "accepted" }).where(eq(tovakilRequests.id, requestId));
      // بقیهٔ درخواست‌های pending همین پرونده → rejected
      await tx
        .update(tovakilRequests)
        .set({ status: "rejected" })
        .where(and(eq(tovakilRequests.caseId, caseId), eq(tovakilRequests.status, "pending"), ne(tovakilRequests.id, requestId)));
    });

    // اعلان‌ها: دریافت‌کننده + بقیهٔ درخواست‌دهنده‌ها (best-effort)
    try {
      const { notifyTovakilAssigned } = await import("@/lib/notify");
      const others = await db
        .select({ lawyerId: tovakilRequests.lawyerId })
        .from(tovakilRequests)
        .where(and(eq(tovakilRequests.caseId, caseId), eq(tovakilRequests.status, "rejected")));
      const otherUserIds: number[] = [];
      for (const o of others) {
        if (o.lawyerId === req_.lawyerId) continue;
        const [u] = await db.select({ id: users.id }).from(users).where(and(eq(users.lawyerId, o.lawyerId), eq(users.role, "lawyer"))).limit(1);
        if (u) otherUserIds.push(u.id);
      }
      await notifyTovakilAssigned({ caseId, subject: c.subject, caseNumber: c.caseNumber, assignedLawyerId: req_.lawyerId, otherRequesterIds: otherUserIds });
    } catch {
      /* non-fatal */
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "واگذاری موقتاً ممکن نشد؛ بعداً تلاش کنید." }, { status: 500 });
  }
}
