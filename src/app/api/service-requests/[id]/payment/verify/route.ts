import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceRequests, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { isSandboxPayments } from "@/lib/payments";
import { rateLimit } from "@/lib/api-security";
import { originGuard } from "@/lib/api-security";
import { recordEvent, auditAction, notifyUser, resolveRequestFor } from "@/lib/managed-services";
import { sendPaymentReceiptEmail } from "@/lib/email";

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
  const crossSite = originGuard(req);
  if (crossSite) return crossSite;
  const limited = rateLimit(req, "sr-payment-verify", 10, 10 * 60_000);
  if (limited) return limited;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!id) return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });

  const reqRow = await resolveRequestFor(user, id);
  if (!reqRow) return NextResponse.json({ ok: false, error: "درخواست یافت نشد" }, { status: 404 });
  if (reqRow.userId !== user.id) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  // Sandbox/demo فقط خارج از تولید: در production هیچ «پرداخت آزمایشی» تأیید نمی‌شود
  // (اگر پیکربندی sandbox اشتباهاً در production فعال شده باشد، همیشه وضعیت واقعی گزارش می‌شود)
  if (isSandboxPayments() && process.env.NODE_ENV !== "production") {
    await db.update(serviceRequests).set({ paymentStatus: "paid", status: reqRow.assignedStaffId ? "ASSIGNED" : "IN_PROGRESS", updatedAt: new Date() }).where(eq(serviceRequests.id, id));
    await recordEvent({ requestId: id, type: "payment_required", title: "پرداخت (آزمایشی) تأیید شد", createdBy: user.id, createdByName: user.name, visibleToUser: true });
    await auditAction({ requestId: id, action: "verify_payment_sandbox", actorRole: user.role, actorId: user.id });
    await notifyUser({ userId: reqRow.userId, type: "payment_verified", title: `پرداخت درخواست ${reqRow.requestNumber}`, body: "پرداخت (آزمایشی) تأیید شد و درخواست به کارشناس واگذار شد.", requestId: id });
    // رسید ایمیلی — best-effort داخل چرخهٔ request؛ هرگز پاسخ پرداخت را نمی‌شکند.
    try {
      const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, reqRow.userId)).limit(1);
      const amount = typeof reqRow.price === "number" ? reqRow.price : Number(reqRow.price ?? 0);
      if (u?.email && Number.isFinite(amount) && amount > 0) {
        await sendPaymentReceiptEmail(u.email, {
          reference: reqRow.requestNumber,
          amount,
          description: reqRow.title || `درخواست خدمات ${reqRow.requestNumber}`,
        });
      }
    } catch {
      /* خطای ایمیل هرگز مسیر پرداخت را نمی‌شکند */
    }
    return NextResponse.json({ ok: true, sandbox: true, status: "ASSIGNED", statusLabel: "واگذارشده" });
  }

  // Production / manual: do NOT fabricate success. Report the truthful status.
  return NextResponse.json({
    ok: true,
    sandbox: false,
    status: reqRow.status,
    statusLabel: "منتظر تأیید پرداخت",
    message:
      "درخواست پرداخت ثبت شد. کارشناسان دادورزان پس از تأیید نهایی، وضعیت درخواست را بروزرسانی می‌کنند.",
  });
}
