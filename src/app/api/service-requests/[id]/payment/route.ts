import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceRequests, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson } from "@/lib/api-security";
import { getPaymentProvider, isSandboxPayments } from "@/lib/payments";
import { recordEvent, auditAction, resolveRequestFor, faNumSafe } from "@/lib/managed-services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/service-requests/[id]/payment — create (or fetch) the payment for a
 * request. The price is taken from the persisted request row; the client never
 * supplies it. No fake success: the manual provider returns manual_review and
 * the UI never shows "paid" until a real verification occurs.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "service-payment", 20, 10 * 60_000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!id) return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });

  const reqRow = await resolveRequestFor(user, id);
  if (!reqRow) return NextResponse.json({ ok: false, error: "درخواست یافت نشد" }, { status: 404 });
  if (reqRow.userId !== user.id) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const amount = reqRow.price;
  if (!amount || amount <= 0) {
    return NextResponse.json({ ok: false, error: "هزینه این درخواست هنوز مشخص نشده است" }, { status: 422 });
  }
  if (reqRow.status === "CANCELLED" || reqRow.status === "REJECTED") {
    return NextResponse.json({ ok: false, error: "این درخواست قابل پرداخت نیست" }, { status: 409 });
  }

  const provider = getPaymentProvider();
  const payment = await provider.createPayment({
    reference: reqRow.requestNumber,
    amount,
    description: `خدمت دادبان — درخواست ${reqRow.requestNumber}`,
    orderId: id,
    orderType: "service",
  });

  try {
    await db
      .insert(payments)
      .values({
        reference: reqRow.requestNumber,
        orderType: "service",
        amount,
        provider: provider.id,
        status: payment.status === "manual_review" ? "pending" : payment.status,
      })
      .onConflictDoNothing({ target: payments.reference });
  } catch {
    /* payment bookkeeping must never fail the flow */
  }

  await db.update(serviceRequests).set({ paymentStatus: "pending", status: "AWAITING_PAYMENT", updatedAt: new Date() }).where(eq(serviceRequests.id, id));
  await recordEvent({ requestId: id, type: "payment_required", title: "پرداخت ایجاد شد", createdBy: user.id, createdByName: user.name, visibleToUser: true });
  await auditAction({ requestId: id, action: "create_payment", actorRole: user.role, actorId: user.id, metadata: { mode: provider.mode } });

  return NextResponse.json({
    ok: true,
    reference: reqRow.requestNumber,
    amount,
    amountLabel: `${faNumSafe(amount)} تومان`,
    mode: provider.mode,
    sandbox: isSandboxPayments(),
    status: payment.status,
    message: payment.message,
  });
}
