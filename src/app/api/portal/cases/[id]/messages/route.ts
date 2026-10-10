import { NextResponse } from "next/server";
import { db } from "@/db";
import { caseMessages } from "@/db/schema-marketplace";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";
import { getCaseMessages, getCaseRow } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

/** GET /api/portal/cases/[id]/messages → { ok, messages } */
export async function GET(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-messages-get", 90, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

    const { id } = await params;
    const caseId = Number(id);
    if (!Number.isFinite(caseId) || caseId <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه پرونده نامعتبر است." }, { status: 422 });
    }

    const messages = await getCaseMessages(caseId);
    return NextResponse.json({ ok: true, messages });
  } catch {
    return publicError();
  }
}

/**
 * POST /api/portal/cases/[id]/messages — ارسال پیام (فرستنده از سشن: نقش + نام)
 * body: { body }
 */
export async function POST(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-messages-post", 40, 60_000);
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

    const payload = await readJson(req, 8_000);
    if (!payload) return NextResponse.json({ ok: false, error: "بدنه درخواست نامعتبر است." }, { status: 422 });

    const body = text(payload.body, 2000);
    if (!body) return NextResponse.json({ ok: false, error: "متن پیام الزامی است." }, { status: 422 });

    const senderRole = ["client", "lawyer", "trainee"].includes(user.role) ? user.role : "client";
    await db.insert(caseMessages).values({
      caseId,
      senderRole,
      senderName: user.name,
      body,
    });

    const messages = await getCaseMessages(caseId);
    return NextResponse.json({ ok: true, messages });
  } catch {
    return publicError();
  }
}
