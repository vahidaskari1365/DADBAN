import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getPaymentProvider } from "@/lib/payments";
import { markVerifiedAndFulfill } from "@/lib/payment-fulfill";
import { rateLimit } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/zarinpal/callback — بازگشت کاربر از درگاه زرین‌پال.
 * معیار تأیید فقط پاسخ verify.json درگاه است (پارامترهای مرورگر هرگز معیار نیستند).
 * کاربر در پایان به صفحهٔ قابل‌فهم /payment/result هدایت می‌شود.
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, "zarinpal-callback", 30, 60_000);
  if (limited) return limited;

  const url = new URL(req.url);
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") || url.origin;
  const reference = (url.searchParams.get("ref") ?? "").slice(0, 80);
  const status = (url.searchParams.get("Status") ?? "").toUpperCase();

  if (!reference) {
    return NextResponse.redirect(`${site}/payment/result?state=invalid`, 302);
  }

  // کاربر درگاه را رها کرد / لغو کرد — وضعیت صادقانه ثبت می‌شود (هرگز verified نمی‌شود)
  if (status !== "OK") {
    try {
      await db
        .update(payments)
        .set({ status: "failed" })
        .where(and(eq(payments.reference, reference), sql`${payments.status} <> 'verified'`));
    } catch {
      /* best-effort */
    }
    return NextResponse.redirect(`${site}/payment/result?ref=${encodeURIComponent(reference)}&state=cancelled`, 302);
  }

  try {
    const [p] = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);
    if (!p) {
      return NextResponse.redirect(`${site}/payment/result?state=notfound`, 302);
    }
    if (p.status === "verified") {
      return NextResponse.redirect(`${site}/payment/result?ref=${encodeURIComponent(reference)}&state=ok`, 302);
    }
    const provider = getPaymentProvider();
    const result = await provider.verifyPayment(reference);
    if (result.status === "verified") {
      await markVerifiedAndFulfill(p);
      return NextResponse.redirect(`${site}/payment/result?ref=${encodeURIComponent(reference)}&state=ok`, 302);
    }
    return NextResponse.redirect(`${site}/payment/result?ref=${encodeURIComponent(reference)}&state=failed`, 302);
  } catch {
    return NextResponse.redirect(`${site}/payment/result?ref=${encodeURIComponent(reference)}&state=error`, 302);
  }
}
