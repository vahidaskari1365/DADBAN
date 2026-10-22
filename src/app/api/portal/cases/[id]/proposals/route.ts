import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { caseProposals } from "@/db/schema-marketplace";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";
import {
  computeMatchScore,
  getCaseRow,
  isLawyerRole,
  parseAmount,
  resolveLawyerContext,
  type CaseRow,
  type LawyerRow,
} from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

/** GET /api/portal/cases/[id]/proposals → { ok, proposals } (با نام/امتیاز وکلا) */
export async function GET(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-proposals-get", 90, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

    const { id } = await params;
    const caseId = Number(id);
    if (!Number.isFinite(caseId) || caseId <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه پرونده نامعتبر است." }, { status: 422 });
    }

    const rows = (await db
      .select()
      .from(caseProposals)
      .where(eq(caseProposals.caseId, caseId))
      .limit(40)) as (typeof caseProposals.$inferSelect)[];
    const list = Array.isArray(rows) ? rows : [];

    const lawyerRows = (await db.select().from(lawyers).limit(120)) as LawyerRow[];
    const lawyerMap = new Map((Array.isArray(lawyerRows) ? lawyerRows : []).map((l) => [l.id, l]));

    const proposals = list.map((p) => {
      const l = lawyerMap.get(p.lawyerId);
      return {
        id: p.id,
        lawyerId: p.lawyerId,
        lawyerName: l?.name ?? "وکیل دادورزان",
        lawyerTitle: l?.title ?? "وکیل پایه یک دادگستری",
        lawyerRating: l?.rating ?? 0,
        lawyerCity: l?.city ?? "",
        amount: String(p.amount ?? "0"),
        note: p.note,
        durationMonths: p.durationMonths,
        status: String(p.status),
        clientMessage: p.clientMessage,
        aiMatchScore: p.aiMatchScore,
        createdAt: (p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)).toISOString(),
      };
    });

    return NextResponse.json({ ok: true, proposals });
  } catch {
    return publicError();
  }
}

/**
 * POST /api/portal/cases/[id]/proposals — ارسال پیشنهاد قیمت توسط وکیل
 * body: { amount, note, durationMonths? }
 */
export async function POST(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-proposals-post", 20, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (!isLawyerRole(user.role)) {
      return NextResponse.json({ ok: false, error: "ارسال پیشنهاد فقط برای وکیل مجاز است." }, { status: 403 });
    }

    const { id } = await params;
    const caseId = Number(id);
    if (!Number.isFinite(caseId) || caseId <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه پرونده نامعتبر است." }, { status: 422 });
    }
    const c: CaseRow | null = await getCaseRow(caseId);
    if (!c) return NextResponse.json({ ok: false, error: "پرونده یافت نشد." }, { status: 404 });

    if (c.assignedLawyerId) {
      return NextResponse.json({ ok: false, error: "وکیل این پرونده قبلاً تعیین شده است." }, { status: 409 });
    }

    const body = await readJson(req, 8_000);
    if (!body) return NextResponse.json({ ok: false, error: "بدنه درخواست نامعتبر است." }, { status: 422 });

    const amount = parseAmount(body.amount);
    if (!amount || amount < 1_000_000 || amount > 50_000_000_000) {
      return NextResponse.json({ ok: false, error: "مبلغ پیشنهادی باید حداقل ۱ میلیون تومان باشد." }, { status: 422 });
    }
    const note = text(body.note, 1500) ?? "";
    let durationMonths = Math.round(Number(body.durationMonths ?? 0));
    if (!Number.isFinite(durationMonths) || durationMonths < 0 || durationMonths > 60) durationMonths = 0;

    const ctx = await resolveLawyerContext(user);
    // فیکس امنیتی: بدون پروفایل وکیلِ واقعی، ثبت پیشنهاد ممنوع (قبلاً به وکیل نمونهٔ ۱ می‌افتاد)
    if (!ctx.lawyerId) {
      return NextResponse.json(
        { ok: false, error: "پروفایل وکیل مرتبط با حساب شما یافت نشد؛ ثبت پیشنهاد ممکن نیست. با پشتیبانی در تماس باشید." },
        { status: 403 },
      );
    }
    const aiMatchScore = computeMatchScore(ctx.lawyer, c);

    // اگر پیشنهاد در انتظارِ همان وکیل وجود دارد، همان به‌روزرسانی می‌شود (idempotent)
    const existing = (await db
      .select()
      .from(caseProposals)
      .where(and(eq(caseProposals.caseId, caseId), eq(caseProposals.lawyerId, ctx.lawyerId)))
      .limit(10)) as (typeof caseProposals.$inferSelect)[];
    const pending = (Array.isArray(existing) ? existing : []).find((p) => ["pending", "negotiating"].includes(String(p.status)));

    if (pending) {
      await db
        .update(caseProposals)
        .set({ amount: String(Math.round(amount)), note, durationMonths, aiMatchScore, updatedAt: new Date() })
        .where(eq(caseProposals.id, pending.id));
      return NextResponse.json({ ok: true, proposalId: pending.id, updated: true, aiMatchScore });
    }

    const inserted = await db
      .insert(caseProposals)
      .values({
        caseId,
        lawyerId: ctx.lawyerId,
        amount: String(Math.round(amount)),
        note,
        durationMonths,
        status: "pending",
        aiMatchScore,
      })
      .returning({ id: caseProposals.id });

    const proposalId = Array.isArray(inserted) && inserted[0] ? Number((inserted[0] as { id: number }).id) : 0;
    return NextResponse.json({ ok: true, proposalId, updated: false, aiMatchScore });
  } catch {
    return publicError();
  }
}
