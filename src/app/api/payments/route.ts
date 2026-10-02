import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPaymentProvider } from "@/lib/payments";
import { rateLimit, readJson, text } from "@/lib/api-security";

export const runtime = "nodejs";

/**
 * POST /api/payments — look up or finalize a payment by reference.
 * { reference } → the payment record + the truth about what happens next.
 * Creation happens inside /api/consultations (transactional with the order).
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "payments", 30, 10 * 60_000);
  if (limited) return limited;

  const body = (await readJson(req, 8_192)) as { reference?: string } | null;
  const reference = text(body?.reference, 80);
  if (!reference) {
    return NextResponse.json({ ok: false, error: "ارجاع پرداخت نامعتبر" }, { status: 422 });
  }

  try {
    const rows = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);
    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "پرداخت یافت نشد" }, { status: 404 });
    }
    const p = rows[0];
    const provider = getPaymentProvider();
    const view = await provider.verifyPayment(reference); // status hint only in manual mode
    return NextResponse.json({
      ok: true,
      payment: {
        reference: p.reference,
        amount: p.amount,
        status: p.status,
        provider: p.provider,
        mode: provider.mode,
        message: view.message,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
