import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { rateLimit, readJson, text } from "@/lib/api-security";

export const runtime = "nodejs";

/** درگاه‌های پرداخت قابل انتخاب — ثبت انتخاب، هرگز ساخت وضعیت «پرداخت‌شده» جعلی. */
const GATEWAYS: Record<string, string> = {
  zarinpal: "زرین‌پال",
  idpay: "آیدی‌پی",
  manual: "هماهنگی با کارشناس",
};

let schemaReady = false;
/** ستون payment_gateway — best-effort روی دیتابیس واقعی (بدون نیاز به مایگریشن دستی). */
async function ensurePaymentGatewayColumn(): Promise<void> {
  if (schemaReady) return;
  try {
    await db.execute(sql.raw(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS payment_gateway text`));
  } catch {
    /* non-fatal */
  }
  schemaReady = true;
}

/**
 * POST /api/cases/pay — ثبت درگاه پرداخت انتخابی موکل برای پرونده.
 * { caseNumber, gateway } → ثبت انتخاب + پیام صادقانه‌ی گام بعدی.
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "case-pay", 10, 60 * 60_000);
  if (limited) return limited;

  const body = (await readJson(req, 4_096)) as { caseNumber?: string; gateway?: string } | null;
  const caseNumber = text(body?.caseNumber, 60);
  const gateway = text(body?.gateway, 30);
  if (!caseNumber || !gateway || !GATEWAYS[gateway]) {
    return NextResponse.json({ ok: false, error: "درگاه پرداخت معتبر نیست." }, { status: 422 });
  }

  try {
    await ensurePaymentGatewayColumn();
    const rows = await db.select({ id: cases.id }).from(cases).where(eq(cases.caseNumber, caseNumber)).limit(1);
    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "پرونده‌ای با این شماره پیدا نشد." }, { status: 404 });
    }
    await db.update(cases).set({ paymentGateway: gateway }).where(eq(cases.caseNumber, caseNumber));
    const message =
      gateway === "manual"
        ? "انتخاب شما ثبت شد. کارشناسان دادبان برای هماهنگی پرداخت با شما تماس می‌گیرند."
        : `درگاه «${GATEWAYS[gateway]}» انتخاب شد. پس از تعیین هزینه نهایی توسط کارشناسان، لینک پرداخت از همین درگاه برای شما پیامک می‌شود.`;
    return NextResponse.json({ ok: true, gateway, message });
  } catch {
    return NextResponse.json({ ok: false, error: "ثبت درگاه پرداخت انجام نشد." }, { status: 500 });
  }
}
