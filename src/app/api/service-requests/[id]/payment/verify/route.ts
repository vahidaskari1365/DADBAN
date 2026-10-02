import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { isSandboxPayments } from "@/lib/payments";
import { recordEvent, auditAction, notifyUser, resolveRequestFor } from "@/lib/managed-services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/service-requests/[id]/payment/verify — finalize a payment.
 *
 * Honesty rule (per platform policy):
 *  - In production the gateway/manual provider is authoritative; this endpoint
 *    only advances the request to "paid" automatically when the environment is
 *    explicitly in sandbox/demo mode (dev/demo only). Otherwise it reports the
 *    real, pending status and asks the user to wait for staff confirmation.
 *  - No fake "paid" state is ever shown in production.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!id) return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });

  const reqRow = await resolveRequestFor(user, id);
  if (!reqRow) return NextResponse.json({ ok: false, error: "درخواست یافت نشد" }, { status: 404 });
  if (reqRow.userId !== user.id) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  // Sandbox/demo only: auto-confirm the payment (no real money moves).
  if (isSandboxPayments()) {
    await db.update(serviceRequests).set({ paymentStatus: "paid", status: reqRow.assignedStaffId ? "ASSIGNED" : "IN_PROGRESS", updatedAt: new Date() }).where(eq(serviceRequests.id, id));
    await recordEvent({ requestId: id, type: "payment_required", title: "پرداخت (آزمایشی) تأیید شد", createdBy: user.id, createdByName: user.name, visibleToUser: true });
    await auditAction({ requestId: id, action: "verify_payment_sandbox", actorRole: user.role, actorId: user.id });
    await notifyUser({ userId: reqRow.userId, type: "payment_verified", title: `پرداخت درخواست ${reqRow.requestNumber}`, body: "پرداخت (آزمایشی) تأیید شد و درخواست به کارشناس واگذار شد.", requestId: id });
    return NextResponse.json({ ok: true, sandbox: true, status: "ASSIGNED", statusLabel: "واگذارشده" });
  }

  // Production / manual: do NOT fabricate success. Report the truthful status.
  return NextResponse.json({
    ok: true,
    sandbox: false,
    status: reqRow.status,
    statusLabel: "منتظر تأیید پرداخت",
    message:
      "درخواست پرداخت ثبت شد. کارشناسان دادبان پس از تأیید نهایی، وضعیت درخواست را بروزرسانی می‌کنند.",
  });
}
