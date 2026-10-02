import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, consultations, serviceRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { logger } from "@/lib/logger";
import { formatJalaliDateTime } from "@/lib/jalali";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/invoice?paymentId=123 — دریافت اطلاعات فاکتور.
 *
 * این API داده‌ی فاکتور رو برمی‌گرداند (JSON).
 * تولید PDF در client با js-pdf انجام می‌شه.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "احراز هویت نشده" }, { status: 401 });
  }

  const url = new URL(req.url);
  const paymentId = Number(url.searchParams.get("paymentId"));

  if (!paymentId) {
    return NextResponse.json({ ok: false, error: "paymentId لازم است" }, { status: 400 });
  }

  try {
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);

    if (!payment) {
      return NextResponse.json({ ok: false, error: "پرداخت یافت نشد" }, { status: 404 });
    }

    // اطلاعات مشاوره یا خدمت مرتبط
    let orderInfo: any = null;
    if (payment.consultationId) {
      const [consultation] = await db
        .select()
        .from(consultations)
        .where(eq(consultations.id, payment.consultationId))
        .limit(1);
      orderInfo = consultation
        ? {
            type: "consultation",
            subject: consultation.subject,
            clientName: consultation.clientName,
            scheduledAt: consultation.scheduledAt,
          }
        : null;
    }

    const invoice = {
      invoiceNumber: `SHM-${payment.id}-${new Date(payment.createdAt).getFullYear()}`,
      date: formatJalaliDateTime(payment.createdAt),
      payment: {
        reference: payment.reference,
        amount: payment.amount,
        provider: payment.provider,
        status: payment.status,
        verifiedAt: payment.verifiedAt ? formatJalaliDateTime(payment.verifiedAt) : null,
      },
      order: orderInfo,
      customer: {
        name: user.name,
        phone: user.phone,
      },
      seller: {
        name: "دادبان — پلتفرم خدمات حقوقی",
        address: "تهران، ایران",
        phone: "021-66921500",
      },
    };

    logger.info("invoice generated", { paymentId, reference: payment.reference });

    return NextResponse.json({ ok: true, invoice });
  } catch (err) {
    logger.error("invoice generation failed", err);
    return NextResponse.json(
      { ok: false, error: "تولید فاکتور ناموفق بود" },
      { status: 500 }
    );
  }
}
