import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceQuotes, serviceRequests, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson } from "@/lib/api-security";
import { recordEvent, auditAction, notifyUser, resolveRequestFor, isOperative, faNumSafe } from "@/lib/managed-services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/service-requests/[id]/quote — latest quote (scoped). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!id) return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });
  const reqRow = await resolveRequestFor(user, id);
  if (!reqRow) return NextResponse.json({ ok: false, error: "درخواست یافت نشد" }, { status: 404 });

  const quotes = await db.select().from(serviceQuotes).where(eq(serviceQuotes.requestId, id)).orderBy(desc(serviceQuotes.createdAt)).limit(3);
  return NextResponse.json({
    ok: true,
    quotes: quotes.map((q) => ({
      id: q.id,
      subtotal: q.subtotal,
      discount: q.discount,
      total: q.total,
      currency: q.currency,
      totalLabel: `${faNumSafe(q.total)} تومان`,
      status: q.status,
      expiresAt: q.expiresAt,
      createdAt: q.createdAt,
    })),
  });
}

/** POST /api/service-requests/[id]/quote — operative creates a quote. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "service-quote", 20, 10 * 60_000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!isOperative(user.role) || (user.role !== "admin" && user.role !== "staff" && user.role !== "supervisor" && user.role !== "lawyer")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!id) return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });
  const reqRow = await resolveRequestFor(user, id);
  if (!reqRow) return NextResponse.json({ ok: false, error: "درخواست یافت نشد" }, { status: 404 });

  const body = (await readJson(req, 16_384)) as { subtotal?: number; discount?: number; total?: number; currency?: string; expiresAt?: string; note?: string } | null;
  const total = Math.max(0, Math.round(Number(body?.total ?? body?.subtotal ?? 0)));
  if (!total) return NextResponse.json({ ok: false, error: "مبلغ پیش‌فاکتور نامعتبر است" }, { status: 422 });
  const subtotal = Math.max(0, Math.round(Number(body?.subtotal ?? total)));
  const discount = Math.max(0, Math.round(Number(body?.discount ?? 0)));

  const [quote] = await db
    .insert(serviceQuotes)
    .values({
      requestId: id,
      subtotal,
      discount,
      total,
      currency: (body?.currency ?? "IRR").slice(0, 8),
      expiresAt: body?.expiresAt ? new Date(body.expiresAt) : null,
      status: "SENT",
      createdBy: user.id,
    })
    .returning({ id: serviceQuotes.id, total: serviceQuotes.total });

  // Set the request price to the quoted total and move to QUOTED.
  await db.update(serviceRequests).set({ price: total, status: "QUOTED", paymentStatus: "unpaid", updatedAt: new Date() }).where(eq(serviceRequests.id, id));
  await recordEvent({ requestId: id, type: "quote_ready", title: "پیش‌فاکتور آماده شد", description: `مبلغ: ${faNumSafe(total)} تومان`, createdBy: user.id, createdByName: user.name, visibleToUser: true });
  await auditAction({ requestId: id, action: "create_quote", actorRole: user.role, actorId: user.id, metadata: { total } });
  await notifyUser({ userId: reqRow.userId, type: "quote_ready", title: `پیش‌فاکتور درخواست ${reqRow.requestNumber}`, body: `پیش‌فاکتور به مبلغ ${faNumSafe(total)} تومان صادر شد.`, requestId: id });

  return NextResponse.json({ ok: true, quoteId: quote.id, total: quote.total });
}
