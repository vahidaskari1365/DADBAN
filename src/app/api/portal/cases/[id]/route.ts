import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases, lawyers } from "@/db/schema";
import { caseProposals as caseProposalsTable } from "@/db/schema-marketplace";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";
import { getCaseRow, isLawyerRole, canAccessCase, isCaseLawyerSide, isInternalRole } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * GET /api/portal/cases/[id] — جزئیات کامل پرونده (case + proposals با نام/امتیاز وکلا + وکیل منتخب)
 */
export async function GET(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-case-get", 90, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه پرونده نامعتبر است." }, { status: 422 });
    }

    const c = await getCaseRow(id);
    if (!c) return NextResponse.json({ ok: false, error: "پرونده یافت نشد." }, { status: 404 });

    // مجوزدستی: فقط مالک پرونده، وکیلِ واگذارشده یا نقش داخلی — جلوگیری از نشت trackingToken/اطلاعات تماس
    if (!canAccessCase(c, user)) {
      return NextResponse.json({ ok: false, error: "دسترسی به این پرونده مجاز نیست." }, { status: 403 });
    }

    let proposals: unknown[] = [];
    let assignedLawyer: Record<string, unknown> | null = null;
    try {
      const rows = (await db
        .select()
        .from(caseProposalsTable)
        .where(eq(caseProposalsTable.caseId, id))
        .limit(40)) as (typeof caseProposalsTable.$inferSelect)[];
      const list = Array.isArray(rows) ? rows : [];
      const lawyerRows = (await db.select().from(lawyers).limit(120)) as (typeof lawyers.$inferSelect)[];
      const lawyerMap = new Map((Array.isArray(lawyerRows) ? lawyerRows : []).map((l) => [l.id, l]));
      proposals = list.map((p) => {
        const l = lawyerMap.get(p.lawyerId);
        return {
          id: p.id,
          lawyerId: p.lawyerId,
          lawyerName: l?.name ?? "وکیل دادپیو",
          lawyerTitle: l?.title ?? "وکیل پایه یک دادگستری",
          lawyerRating: l?.rating ?? 0,
          lawyerCity: l?.city ?? "",
          amount: String(p.amount ?? "0"),
          note: p.note,
          durationMonths: p.durationMonths,
          status: String(p.status),
          aiMatchScore: p.aiMatchScore,
          createdAt: (p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)).toISOString(),
        };
      });
      if (c.assignedLawyerId) {
        const l = lawyerMap.get(c.assignedLawyerId);
        if (l) {
          assignedLawyer = {
            id: l.id,
            name: l.name,
            slug: l.slug,
            title: l.title,
            city: l.city,
            rating: l.rating,
            experienceYears: l.experienceYears,
            specialties: l.specialties,
          };
        }
      }
    } catch {
      /* degraded — proposals اختیاری */
    }

    return NextResponse.json({ ok: true, case: c, proposals, assignedLawyer });
  } catch {
    return publicError();
  }
}

/**
 * PATCH /api/portal/cases/[id] — به‌روزرسانی توسط وکیل
 * body: { stage?, progress?, assignedLawyerId?, feeAgreed?, contractStatus? }
 */
export async function PATCH(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-case-patch", 30, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (!isLawyerRole(user.role)) {
      return NextResponse.json({ ok: false, error: "این عملیات فقط برای وکیل مجاز است." }, { status: 403 });
    }

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه پرونده نامعتبر است." }, { status: 422 });
    }

    const c = await getCaseRow(id);
    if (!c) return NextResponse.json({ ok: false, error: "پرونده یافت نشد." }, { status: 404 });

    const body = await readJson(req, 4_000);
    if (!body) return NextResponse.json({ ok: false, error: "بدنه درخواست نامعتبر است." }, { status: 422 });

    const patch: Partial<typeof cases.$inferInsert> = {};

    const stage = text(body.stage, 80);
    if (stage) patch.stage = stage;

    if (body.progress !== undefined && body.progress !== null && body.progress !== "") {
      const progress = Number(body.progress);
      if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
        return NextResponse.json({ ok: false, error: "میزان پیشرفت باید بین ۰ تا ۱۰۰ باشد." }, { status: 422 });
      }
      patch.progress = Math.round(progress);
    }

    if (body.assignedLawyerId !== undefined && body.assignedLawyerId !== null && body.assignedLawyerId !== "") {
      const lawyerId = Number(body.assignedLawyerId);
      if (!Number.isFinite(lawyerId) || lawyerId <= 0) {
        return NextResponse.json({ ok: false, error: "شناسه وکیل نامعتبر است." }, { status: 422 });
      }
      patch.assignedLawyerId = Math.round(lawyerId);
      if (["new", "reviewing"].includes(String(c.status))) patch.status = "matched";
    }

    if (body.feeAgreed !== undefined && body.feeAgreed !== null && body.feeAgreed !== "") {
      const digits = String(body.feeAgreed).replace(/[^\d]/g, "");
      const fee = Number(digits);
      if (!Number.isFinite(fee) || fee <= 0 || fee > 1_000_000_000_000) {
        return NextResponse.json({ ok: false, error: "مبلغ حق‌الوکاله نامعتبر است." }, { status: 422 });
      }
      patch.feeAgreed = String(Math.round(fee));
    }

    if (body.contractStatus !== undefined && body.contractStatus !== null && body.contractStatus !== "") {
      const cs = String(body.contractStatus);
      if (!["none", "draft", "sent", "signed"].includes(cs)) {
        return NextResponse.json({ ok: false, error: "وضعیت قرارداد نامعتبر است." }, { status: 422 });
      }
      patch.contractStatus = cs;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "فیلد قابل به‌روزرسانی ارسال نشده است." }, { status: 422 });
    }

    // مجوزدستی نوشتن: فقط وکیلِ واگذارشده (یا نقش داخلی). وکیلِ واگذارنشده فقط
    // می‌تواند خودش را به پروندهٔ بدون وکیل «انتصاب» کند — نه وکیل دیگری را.
    if (!isInternalRole(user.role) && !isCaseLawyerSide(c, user)) {
      const selfAssignOk =
        !c.assignedLawyerId &&
        user.lawyerId != null &&
        Object.keys(patch).length === 1 &&
        patch.assignedLawyerId === user.lawyerId;
      if (!selfAssignOk) {
        return NextResponse.json({ ok: false, error: "دسترسی به این پرونده مجاز نیست." }, { status: 403 });
      }
    }

    await db.update(cases).set(patch).where(eq(cases.id, id));
    const updated = await getCaseRow(id);
    return NextResponse.json({ ok: true, case: updated });
  } catch {
    return publicError();
  }
}
