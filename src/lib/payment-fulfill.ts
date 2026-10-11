import "server-only";
import { db } from "@/db";
import { payments, consultations, users } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { sendPaymentReceiptEmail } from "@/lib/email";
import type { Payment } from "@/db/schema";

/**
 * رسید پرداخت ایمیلی — best-effort: هرگز مسیر تأیید پرداخت را نمی‌شکند.
 * پرداخت → مشاوره → شمارهٔ موبایل پرداخت‌کننده → حساب کاربری → ایمیل.
 * اگر ایمیلی پیدا نشد (پرداخت مهمان/بدون ایمیل)، بی‌سروصدا رد می‌شود.
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
 * گذار idempotent به verified + پیشبرد سفارش مرتبط (مشاوره → paid) + رسید ایمیلی.
 * فقط پس از تأیید واقعی (درگاه زنده/آزمایشی مجاز یا کارشناس) صدا زده شود.
 * منطق مشترک مسیر /api/payments/verify و callback زرین‌پال — یک منبع حقیقت.
 */
export async function markVerifiedAndFulfill(p: Payment): Promise<void> {
  await db
    .update(payments)
    .set({ status: "verified", verifiedAt: sql`now()` })
    .where(and(eq(payments.reference, p.reference), sql`${payments.status} <> 'verified'`));
  if (p.consultationId) {
    await db
      .update(consultations)
      .set({ status: "paid" })
      .where(eq(consultations.id, p.consultationId));
  }
  // رسید فقط در لحظهٔ گذار به verified (idempotent — ارسال تکراری ندارد)
  await sendReceiptIfPossible(p);
}
