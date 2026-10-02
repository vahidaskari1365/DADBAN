import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, consultations } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getPaymentProvider } from "@/lib/payments";
import { rateLimit, readJson, text } from "@/lib/api-security";

export const runtime = "nodejs";

/**
 * POST /api/payments/verify — verifies a payment by reference.
 * Only the explicitly-enabled sandbox provider verifies automatically; in
 * manual (production-safe) mode verification is done by staff, so this
 * endpoint reports the true current state instead of faking success.
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "payments-verify", 20, 10 * 60_000);
  if (limited) return limited;

  const body = (await readJson(req, 8_192)) as { reference?: string } | null;
  const reference = text(body?.reference, 80);
  if (!reference) {
    return NextResponse.json({ ok: false, error: "ارجاع پرداخت نامعتبر" }, { status: 422 });
  }

  const provider = getPaymentProvider();
  try {
    const rows = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);
    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "پرداخت یافت نشد" }, { status: 404 });
    }
    const p = rows[0];

    if (provider.mode !== "sandbox") {
      return NextResponse.json({
        ok: true,
        verified: p.status === "verified",
        status: p.status,
        message:
          p.status === "verified"
            ? "این پرداخت قبلاً تأیید شده است."
            : "تأیید پرداخت توسط کارشناسان انجام می‌شود و به شما اطلاع‌رسانی خواهد شد.",
      });
    }

    // Sandbox (dev/demo): mark verified idempotently, advance the consultation.
    if (p.status !== "verified") {
      await db
        .update(payments)
        .set({ status: "verified", provider: "sandbox", verifiedAt: sql`now()` })
        .where(and(eq(payments.reference, reference), sql`${payments.status} <> 'verified'`));
      if (p.consultationId) {
        await db
          .update(consultations)
          .set({ status: "paid" })
          .where(eq(consultations.id, p.consultationId));
      }
    }
    const result = await provider.verifyPayment(reference);
    return NextResponse.json({ ok: true, verified: true, status: "verified", message: result.message, sandbox: true });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
