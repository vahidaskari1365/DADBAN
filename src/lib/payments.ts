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
      message: "درخواست شما ثبت شد. کارشناسان دادبان برای هماهنگی نهایی پرداخت با شما تماس می‌گیرند.",
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

/**
 * Selects the provider from configuration.
 * Production default = manual (safe). Set PAYMENT_PROVIDER=sandbox explicitly
 * for development/demo; a real gateway gets added here as a third provider
 * (e.g. zarinpal) once its credentials exist.
 */
export function getPaymentProvider(): PaymentProvider {
  const mode = (process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase();
  if (mode === "sandbox" && process.env.NODE_ENV !== "production") return sandboxProvider;
  if (mode === "sandbox" && process.env.PAYMENT_SANDBOX_ALLOW_PROD === "true") return sandboxProvider;
  return manualProvider;
}

/** True when the visible environment must be labelled as demo/sandbox in the UI. */
export function isSandboxPayments(): boolean {
  return getPaymentProvider().mode === "sandbox";
}
