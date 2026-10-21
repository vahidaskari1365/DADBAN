import { NextResponse } from "next/server";
import { db } from "@/db";
import { tovakilCases, tovakilRequests } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { rateLimit, readJson } from "@/lib/api-security";
import { getLawyerActor } from "@/lib/lawyer-actor";
import { getLawyerEligibility } from "@/lib/lawyer-eligibility";
import { ensureProfileSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUT /api/tovakil/[id] — بستن/بازگشایی پروندهٔ توکیل توسط مالک
 * body: { action: "close" | "reopen" | "unassign" }
 *  - close: پرونده دیگر در بازار دیده نمی‌شود
 *  - reopen: پروندهٔ واگذارشده/بسته دوباره باز می‌شود (پس از ریزش همکار)
 *  - unassign: واگذاری را ملغی و پرونده را باز می‌کند
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "tovakil-put", 20, 60_000);
  if (limited) return limited;
  const actor = await getLawyerActor("cases");
  if (!actor || actor.role !== "lawyer") {
    return NextResponse.json({ ok: false, error: "این اقدام فقط برای وکیل مالک ممکن است." }, { status: 401 });
  }
  const eligibility = await getLawyerEligibility(actor.lawyerId);
  if (!eligibility || eligibility.caseActionBlock) {
    return NextResponse.json({ ok: false, error: eligibility?.caseActionBlock ?? "این اقدام برای حساب شما باز نیست." }, { status: 403 });
  }
  const { id } = await params;
  const caseId = Number(id);
  if (!Number.isInteger(caseId) || caseId <= 0) {
    return NextResponse.json({ ok: false, error: "شناسهٔ پرونده نامعتبر است." }, { status: 422 });
  }
  const body = await readJson(req, 1_024);
  if (!body) return NextResponse.json({ ok: false, error: "بدنهٔ درخواست نامعتبر است." }, { status: 422 });
  const action = body.action === "close" ? "close" : body.action === "reopen" ? "reopen" : body.action === "unassign" ? "unassign" : null;
  if (!action) return NextResponse.json({ ok: false, error: "اقدام مجاز: close، reopen یا unassign." }, { status: 422 });

  try {
    await ensureProfileSchema();
    const [c] = await db.select().from(tovakilCases).where(eq(tovakilCases.id, caseId)).limit(1);
    if (!c) return NextResponse.json({ ok: false, error: "پروندهٔ توکیل یافت نشد." }, { status: 404 });
    if (c.ownerLawyerId !== actor.lawyerId) {
      return NextResponse.json({ ok: false, error: "فقط مالک پرونده می‌تواند این اقدام را انجام دهد." }, { status: 403 });
    }
    if (action === "close") {
      if (c.status === "closed") return NextResponse.json({ ok: false, error: "پرونده قبلاً بسته شده است." }, { status: 409 });
      await db.update(tovakilCases).set({ status: "closed" }).where(eq(tovakilCases.id, caseId));
      await db.update(tovakilRequests).set({ status: "rejected" }).where(and(eq(tovakilRequests.caseId, caseId), eq(tovakilRequests.status, "pending")));
      return NextResponse.json({ ok: true, status: "closed" });
    }
    if (action === "unassign") {
      if (c.status !== "assigned") return NextResponse.json({ ok: false, error: "این پرونده واگذار نشده است." }, { status: 409 });
      await db
        .update(tovakilCases)
        .set({ status: "open", assignedLawyerId: null, assignedAt: null })
        .where(eq(tovakilCases.id, caseId));
      return NextResponse.json({ ok: true, status: "open" });
    }
    // reopen
    if (c.status === "open") return NextResponse.json({ ok: false, error: "این پرونده باز است." }, { status: 409 });
    await db
      .update(tovakilCases)
      .set({ status: "open", assignedLawyerId: null, assignedAt: null })
      .where(eq(tovakilCases.id, caseId));
    return NextResponse.json({ ok: true, status: "open" });
  } catch {
    return NextResponse.json({ ok: false, error: "اقدام موقتاً ممکن نشد؛ بعداً تلاش کنید." }, { status: 500 });
  }
}
