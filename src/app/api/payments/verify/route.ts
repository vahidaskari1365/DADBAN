import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPaymentProvider } from "@/lib/payments";
import { markVerifiedAndFulfill } from "@/lib/payment-fulfill";
import { rateLimit, readJson, text } from "@/lib/api-security";

export const runtime = "nodejs";

/**
 * POST /api/payments/verify — بررسی/تأیید پرداخت بر اساس reference.
 * - manual (پیش‌فرض امن پروداکشن): فقط وضعیت واقعی گزارش می‌شود؛ تأیید با کارشناس.
 * - sandbox (فقط توسعه): تأیید خودکار آزمایشی.
 * - zarinpal (زنده): تأیید واقعی با verify.json درگاه؛ در صورت موفقیت سفارش پیش می‌رود.
 * هیچ مسیری هرگز «پرداخت موفق» را جعل نمی‌کند.
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

    if (p.status === "verified") {
      return NextResponse.json({
        ok: true,
        verified: true,
        status: "verified",
        message: "این پرداخت قبلاً تأیید شده است.",
      });
    }

    if (provider.mode === "manual") {
      return NextResponse.json({
        ok: true,
        verified: false,
        status: p.status,
        message: "تأیید پرداخت توسط کارشناسان انجام می‌شود و به شما اطلاع‌رسانی خواهد شد.",
      });
    }

    // sandbox (توسعه) یا live (زرین‌پال): از خود درگاه می‌پرسیم — هرگز جعل نمی‌کنیم
    const result = await provider.verifyPayment(reference);
    if (result.status === "verified") {
      await markVerifiedAndFulfill(p);
      return NextResponse.json({
        ok: true,
        verified: true,
        status: "verified",
        message: result.message,
        sandbox: provider.mode === "sandbox",
      });
    }
    return NextResponse.json({
      ok: true,
      verified: false,
      status: result.status,
      message: result.message,
      sandbox: provider.mode === "sandbox",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
