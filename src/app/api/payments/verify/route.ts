import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, consultations, users } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getPaymentProvider } from "@/lib/payments";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { sendPaymentReceiptEmail } from "@/lib/email";
import type { Payment } from "@/db/schema";

export const runtime = "nodejs";

/**
 * رسید پرداخت ایمیلی — best-effort: هرگز مسیر تأیید پرداخت را نمی‌شکند.
 * پرداخت → مشاوره → شمارهٔ موبایل پرداخت‌کننده → حساب کاربری → ایمیل.
 * اگر ایمیلی پیدا نشد (پرداخت مهمان/بدون ایمیل)، بی‌سروصدا رد می‌شود — این
 * ارسال داخل چرخهٔ request await می‌شود (Vercel serverless پس از پاسخ اجرا را نمی‌کشد).
 */
async function sendReceiptIfPossible(p: Payment): Promise<void> {
  try {
    let email: string | null = null;
    let description: string = p.orderType || "پرداخت دادبان";
    if (p.consultationId) {
      const [c] = await db
        .select({ clientPhone: consultations.clientPhone, subject: consultations.subject })
        .from(consultations)
        .where(eq(consultations.id, p.consultationId))
        .limit(1);
      if (c) {
        description = c.subject || description;
        // شماره‌ها گاهی با «۰» و گاهی بدون آن ذخیره شده‌اند — هر دو گونه را جستجو کن
        const digits = c.clientPhone.replace(/\D/g, "");
        const variants = new Set<string>([digits]);
        if (digits.startsWith("9")) variants.add("0" + digits);
        if (digits.startsWith("0")) variants.add(digits.slice(1));
        const [u] = await db
          .select({ email: users.email })
          .from(users)
          .where(inArray(users.phone, [...variants]))
          .limit(1);
        email = u?.email ?? null;
      }
    }
    if (!email) return;
    await sendPaymentReceiptEmail(email, { reference: p.reference, amount: p.amount, description });
  } catch {
    /* best-effort — خطای ایمیل هرگز پاسخ پرداخت را تغییر نمی‌دهد */
  }
}

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
      // رسید ایمیلی فقط در لحظهٔ گذار به verified (idempotent — ارسال تکراری ندارد)
      await sendReceiptIfPossible(p);
    }
    const result = await provider.verifyPayment(reference);
    return NextResponse.json({ ok: true, verified: true, status: "verified", message: result.message, sandbox: true });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
