import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { caseEvents } from "@/db/schema-marketplace";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";
import { getCaseEvents, getCaseRow, isLawyerRole, canAccessCase, isCaseLawyerSide, isInternalRole } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

/** GET /api/portal/cases/[id]/events → { ok, events } */
export async function GET(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-events-get", 90, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

    const { id } = await params;
    const caseId = Number(id);
    if (!Number.isFinite(caseId) || caseId <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه پرونده نامعتبر است." }, { status: 422 });
    }

    const c = await getCaseRow(caseId);
    if (!c) return NextResponse.json({ ok: false, error: "پرونده یافت نشد." }, { status: 404 });
    // مجوزدستی: فقط طرفین پرونده یا نقش داخلی
    if (!canAccessCase(c, user)) {
      return NextResponse.json({ ok: false, error: "دسترسی به این پرونده مجاز نیست." }, { status: 403 });
    }

    const events = await getCaseEvents(caseId);
    return NextResponse.json({ ok: true, events });
  } catch {
    return publicError();
  }
}

/**
 * POST /api/portal/cases/[id]/events — ثبت اقدام جدید (فقط وکیل/کارآموز)
 * body: { title, description, progress?, visibleToClient? }
 */
export async function POST(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-events-post", 30, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (!isLawyerRole(user.role)) {
      return NextResponse.json({ ok: false, error: "ثبت اقدام فقط برای وکیل و کارآموز مجاز است." }, { status: 403 });
    }

    const { id } = await params;
    const caseId = Number(id);
    if (!Number.isFinite(caseId) || caseId <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه پرونده نامعتبر است." }, { status: 422 });
    }
    const c = await getCaseRow(caseId);
    if (!c) return NextResponse.json({ ok: false, error: "پرونده یافت نشد." }, { status: 404 });
    // مجوزدستی: فقط وکیلِ واگذارشده/کارآموزِ همان وکیل (یا نقش داخلی) — نه هر وکیلِ لاگین‌شده
    if (!isCaseLawyerSide(c, user) && !isInternalRole(user.role)) {
      return NextResponse.json({ ok: false, error: "دسترسی به این پرونده مجاز نیست." }, { status: 403 });
    }

    const body = await readJson(req, 8_000);
    if (!body) return NextResponse.json({ ok: false, error: "بدنه درخواست نامعتبر است." }, { status: 422 });

    const title = text(body.title, 140);
    if (!title) return NextResponse.json({ ok: false, error: "عنوان اقدام الزامی است." }, { status: 422 });
    const description = text(body.description, 1200) ?? "";

    let progress: number | null = null;
    if (body.progress !== undefined && body.progress !== null && body.progress !== "") {
      const p = Number(body.progress);
      if (!Number.isFinite(p) || p < 0 || p > 100) {
        return NextResponse.json({ ok: false, error: "پیشرفت باید بین ۰ تا ۱۰۰ باشد." }, { status: 422 });
      }
      progress = Math.round(p);
    }

    const visibleToClient = body.visibleToClient !== false;

    await db.insert(caseEvents).values({
      caseId,
      actor: user.role === "trainee" ? "trainee" : "lawyer",
      actorName: user.name,
      title,
      description,
      progress,
      visibleToClient,
    });

    // همگام‌سازی نوار پیشرفت پرونده (فقط رو به جلو)
    if (progress !== null && progress > c.progress) {
      await db.update(cases).set({ progress }).where(eq(cases.id, caseId));
    }

    const events = await getCaseEvents(caseId);
    return NextResponse.json({ ok: true, events });
  } catch {
    return publicError();
  }
}
