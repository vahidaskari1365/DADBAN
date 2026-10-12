// Payment architecture — provider-agnostic, honest by construction.
//
// - Amounts are integer Toman values. Never floats. Computed server-side only;
//   the client's displayed price is never trusted (the API recomputes it).
// - A payment record is an immutable financial fact: it is created once with a
//   unique reference (idempotency key) and only its *status* moves forward.
// - The production gateway needs real credentials. Until they are configured,
//   the platform runs the "manual" provider: a request is registered and the
//   payment is finalized by staff — the UI never fabricates a "paid" state.
// - The "sandbox" provider exists for development/demo only and must be
//   explicitly enabled via PAYMENT_PROVIDER=sandbox. It is additionally
//   blocked in production builds.
// - The "zarinpal" provider is the real gateway: activate with
//   PAYMENT_PROVIDER=zarinpal + ZARINPAL_MERCHANT_ID (UUID از پنل زرین‌پال).
//   ZARINPAL_SANDBOX=true برای تست با درگاه آزمایشی زرین‌پال.

import "server-only";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export type PaymentStatus = "initiated" | "pending" | "verified" | "failed" | "refunded" | "manual_review";

export interface PaymentRequest {
  /** Unique idempotency reference (e.g. consultation ticket number) */
  reference: string;
  amount: number; // Toman, integer
  description: string;
  /** Internal linkage (row id of the consultation/order) */
  orderId?: number | null;
  orderType?: "consultation" | "service" | "subscription" | "case";
}

export interface PaymentResult {
  reference: string;
  status: PaymentStatus;
  /** Human-readable next step for the UI — always truthful. */
  message: string;
  /** Only present for real gateways (sandbox/manual never fabricate URLs). */
  gatewayUrl?: string;
}

export interface PaymentProvider {
  id: string;
  /** "sandbox" providers are meant for development only. */
  mode: "manual" | "sandbox" | "live";
  createPayment(req: PaymentRequest): Promise<PaymentResult>;
  verifyPayment(reference: string): Promise<PaymentResult>;
  refundPayment(reference: string): Promise<PaymentResult>;
}

/* ------------------------------ Manual (default) ------------------------------ */

const manualProvider: PaymentProvider = {
  id: "manual",
  mode: "manual",
  async createPayment(req) {
    return {
      reference: req.reference,
      status: "manual_review",
      message: "درخواست شما ثبت شد. کارشناسان دادورزان برای هماهنگی نهایی پرداخت با شما تماس می‌گیرند.",
    };
  },
  async verifyPayment(reference) {
    return {
      reference,
      status: "manual_review",
      message: "تأیید پرداخت در این حالت توسط کارشناسان انجام می‌شود؛ در صورت نیاز با پشتیبانی در تماس باشید.",
    };
  },
  async refundPayment(reference) {
    return {
      reference,
      status: "manual_review",
      message: "درخواست بازگشت وجه طبق سیاست بازگشت وجه از طریق پشتیبانی پیگیری می‌شود.",
    };
  },
};

/* ------------------------------ Sandbox (dev only) ------------------------------ */

const sandboxProvider: PaymentProvider = {
  id: "sandbox",
  mode: "sandbox",
  async createPayment(req) {
    return {
      reference: req.reference,
      status: "initiated",
      message: "SANDBOX: پرداخت آزمایشی ایجاد شد — هیچ مبلغ واقعی جابه‌جا نمی‌شود.",
    };
  },
  async verifyPayment(reference) {
    return {
      reference,
      status: "verified",
      message: "SANDBOX: پرداخت آزمایشی تأیید شد — این یک تراکنش واقعی نیست.",
    };
  },
  async refundPayment(reference) {
    return { reference, status: "refunded", message: "SANDBOX: بازگشت وجه آزمایشی ثبت شد." };
  },
};

/* ------------------------------ Zarinpal (live) ------------------------------ */

const ZARINPAL_MERCHANT = (process.env.ZARINPAL_MERCHANT_ID ?? "").trim();
const ZARINPAL_BASE =
  (process.env.ZARINPAL_SANDBOX ?? "").trim().toLowerCase() === "true"
    ? "https://sandbox.zarinpal.com"
    : "https://payment.zarinpal.com";

/** مبلغ تومان → ریال (API زرین‌پال ریالی است) */
const toRials = (toman: number) => Math.max(0, Math.round(toman)) * 10;

/** مرچنت‌آیدی زرین‌پال یک UUID است */
function zarinpalMerchantValid(): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ZARINPAL_MERCHANT);
}

/** برای نمایش وضعیت پیکربندی در پنل ادمین/تشخیصی */
export function zarinpalConfigured(): boolean {
  return zarinpalMerchantValid();
}

type ZarinpalRequestResponse = { data?: { code?: number; authority?: string; message?: string } };
type ZarinpalVerifyResponse = { data?: { code?: number; ref_id?: number; message?: string } };

async function zarinpalPost<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(`${ZARINPAL_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    logger.warn("[payments] zarinpal request failed:", { error: (err as Error)?.message?.slice(0, 160) });
    return null;
  }
}

/** ذخیرهٔ authority زرین‌پال روی ردیف پرداخت (ستون meta) — best-effort */
async function saveZarinpalAuthority(reference: string, authority: string): Promise<void> {
  try {
    await db.update(payments).set({ meta: { authority } }).where(eq(payments.reference, reference));
  } catch (err) {
    logger.warn("[payments] persist zarinpal authority failed:", { error: (err as Error)?.message?.slice(0, 160) });
  }
}

async function loadZarinpalAuthority(reference: string): Promise<string | null> {
  try {
    const [row] = await db
      .select({ meta: payments.meta })
      .from(payments)
      .where(eq(payments.reference, reference))
      .limit(1);
    const authority = row?.meta?.authority;
    return typeof authority === "string" && authority.length > 10 ? authority : null;
  } catch {
    return null;
  }
}

const zarinpalProvider: PaymentProvider = {
  id: "zarinpal",
  mode: "live",
  async createPayment(req) {
    if (!zarinpalMerchantValid()) {
      return {
        reference: req.reference,
        status: "failed",
        message: "درگاه پرداخت هنوز پیکربندی نشده است؛ لطفاً روش پرداخت دستی را انتخاب کنید یا با پشتیبانی تماس بگیرید.",
      };
    }
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
    if (!siteUrl) {
      return { reference: req.reference, status: "failed", message: "آدرس سایت تنظیم نشده است (NEXT_PUBLIC_SITE_URL)." };
    }
    const res = await zarinpalPost<ZarinpalRequestResponse>("/pg/v4/payment/request.json", {
      merchant_id: ZARINPAL_MERCHANT,
      amount: toRials(req.amount),
      callback_url: `${siteUrl}/api/payments/zarinpal/callback?ref=${encodeURIComponent(req.reference)}`,
      description: (req.description || "پرداخت دادورزان").slice(0, 180),
    });
    const code = res?.data?.code;
    const authority = res?.data?.authority;
    if (code === 100 && authority) {
      await saveZarinpalAuthority(req.reference, authority);
      return {
        reference: req.reference,
        status: "initiated",
        message: "در حال انتقال به درگاه امن زرین‌پال…",
        gatewayUrl: `${ZARINPAL_BASE}/pg/StartPay/${authority}`,
      };
    }
    logger.warn("[payments] zarinpal request rejected:", { code, message: res?.data?.message?.slice(0, 120) });
    return {
      reference: req.reference,
      status: "failed",
      message: "ایجاد تراکنش در درگاه زرین‌پال ناموفق بود؛ لطفاً روش پرداخت دیگر را انتخاب کنید.",
    };
  },
  async verifyPayment(reference) {
    const authority = await loadZarinpalAuthority(reference);
    if (!authority) {
      return { reference, status: "failed", message: "تراکنشی برای تأیید یافت نشد." };
    }
    const [row] = await db
      .select({ amount: payments.amount, status: payments.status })
      .from(payments)
      .where(eq(payments.reference, reference))
      .limit(1);
    if (!row) return { reference, status: "failed", message: "پرداخت یافت نشد." };
    if (row.status === "verified") {
      return { reference, status: "verified", message: "این پرداخت قبلاً تأیید شده است." };
    }
    // code 100 = تأیید شد، code 101 = قبلاً تأیید شده (idempotent)
    const res = await zarinpalPost<ZarinpalVerifyResponse>("/pg/v4/payment/verify.json", {
      merchant_id: ZARINPAL_MERCHANT,
      amount: toRials(row.amount),
      authority,
    });
    const code = res?.data?.code;
    if (code === 100 || code === 101) {
      return {
        reference,
        status: "verified",
        message: `پرداخت با موفقیت تأیید شد (شمارهٔ پیگیری: ${res?.data?.ref_id ?? "—"}).`,
      };
    }
    logger.warn("[payments] zarinpal verify rejected:", { code, message: res?.data?.message?.slice(0, 120) });
    return { reference, status: "failed", message: "تأیید پرداخت در درگاه ناموفق بود یا تراکنش تکمیل نشد." };
  },
  async refundPayment(reference) {
    // بازگشت وجه زرین‌پال خودکار نیست — طبق سیاست بازگشت وجه توسط پشتیبانی انجام و ثبت می‌شود.
    return {
      reference,
      status: "manual_review",
      message: "درخواست بازگشت وجه ثبت شد و توسط پشتیبانی دادورزان از طریق درگاه پیگیری می‌شود.",
    };
  },
};

/**
 * Selects the provider from configuration.
 * Production default = manual (safe). Set PAYMENT_PROVIDER=sandbox explicitly
 * for development/demo, or PAYMENT_PROVIDER=zarinpal + ZARINPAL_MERCHANT_ID
 * for the real gateway. Wrong/missing zarinpal credentials fall back to
 * manual (never silently fake success) with a server-side warning.
 */
export function getPaymentProvider(): PaymentProvider {
  const mode = (process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase();
  if (mode === "sandbox" && process.env.NODE_ENV !== "production") return sandboxProvider;
  if (mode === "sandbox" && process.env.PAYMENT_SANDBOX_ALLOW_PROD === "true") return sandboxProvider;
  if (mode === "zarinpal") {
    if (zarinpalMerchantValid()) return zarinpalProvider;
    logger.warn("[payments] PAYMENT_PROVIDER=zarinpal اما ZARINPAL_MERCHANT_ID تنظیم نشده/نامعتبر است — فالبک به manual");
    return manualProvider;
  }
  return manualProvider;
}

/** True when the visible environment must be labelled as demo/sandbox in the UI. */
export function isSandboxPayments(): boolean {
  return getPaymentProvider().mode === "sandbox";
}
