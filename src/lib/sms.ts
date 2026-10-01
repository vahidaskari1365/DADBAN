/**
 * ============================================================================
 * sharifmand — SMS Notification Module
 * ----------------------------------------------------------------------------
 * ارسال پیامک برای:
 *  - تأیید شماره موبایل (OTP)
 *  - یادآوری نوبت مشاوره
 *  - اطلاع‌رسانی تغییر وضعیت پرونده
 *  - خوش‌آمدگویی
 *
 * Provider: کاوه‌نگار (پیش‌فرض) — قابل تعویض با فراز SMS یا ملی پیامک.
 * در حالت بدون کلید، فقط لاگ می‌کنه (dev mode).
 * ============================================================================
 */

import { logger } from "./logger";

export type SmsTemplate =
  | "otp"
  | "consultation_reminder"
  | "case_status"
  | "welcome"
  | "payment_success";

interface SmsPayload {
  to: string;
  template: SmsTemplate;
  params: Record<string, string>;
}

/** آیا SMS فعال هست؟ (کلید API موجود باشه) */
export function isSmsConfigured(): boolean {
  return !!(process.env.KAVEHNEGAR_API_KEY && process.env.KAVEHNEGAR_SENDER);
}

/**
 * ارسال پیامک.
 * در dev mode (بدون کلید)، فقط لاگ می‌کنه.
 */
export async function sendSms(payload: SmsPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, template, params } = payload;

  // validation شماره موبایل
  const normalizedPhone = normalizePhone(to);
  if (!normalizedPhone) {
    return { success: false, error: "شماره موبایل نامعتبر" };
  }

  // اگه SMS configured نیست، در dev mode لاگ کن
  if (!isSmsConfigured()) {
    logger.info("[sms:dev] SMS not configured, logging instead", { to: normalizedPhone, template, params });
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  try {
    const apiKey = process.env.KAVEHNEGAR_API_KEY!;
    const sender = process.env.KAVEHNEGAR_SENDER!;
    const templateId = KAVEHNEGAR_TEMPLATES[template];

    if (!templateId) {
      return { success: false, error: "template not found" };
    }

    // کاوه‌نگار API: lookup endpoint
    const url = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json`;
    const body = new URLSearchParams({
      receptor: normalizedPhone,
      token: params.code || params.name || "",
      token2: params.time || params.status || "",
      token3: params.date || "",
      template: templateId,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      logger.error("SMS API error", null, { status: res.status, body: text });
      return { success: false, error: `SMS API ${res.status}` };
    }

    const data = await res.json();
    const messageId = data?.entries?.[0]?.messageid || data?.return?.messageid;

    logger.info("SMS sent", { to: normalizedPhone, template, messageId });
    return { success: true, messageId: String(messageId) };
  } catch (err) {
    logger.error("SMS send failed", err, { to: normalizedPhone, template });
    return { success: false, error: (err as Error).message };
  }
}

/**
 * تولید OTP تصادفی (۶ رقم).
 */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * ذخیره و تأیید OTP.
 * در production: Redis یا DB با TTL ۵ دقیقه.
 * فعلاً: در-memory map (برای single-instance).
 */
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

/** ذخیره‌ی OTP برای یک شماره. */
export function storeOtp(phone: string, code: string, ttlMs = 5 * 60 * 1000) {
  otpStore.set(normalizePhone(phone)!, {
    code,
    expiresAt: Date.now() + ttlMs,
    attempts: 0,
  });
}

/** تأیید OTP واردشده توسط کاربر. */
export function verifyOtp(phone: string, code: string): { valid: boolean; reason?: string } {
  const normalized = normalizePhone(phone);
  if (!normalized) return { valid: false, reason: "شماره نامعتبر" };

  const record = otpStore.get(normalized);
  if (!record) return { valid: false, reason: "کد منقضی شده یا ارسال نشده" };

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalized);
    return { valid: false, reason: "کد منقضی شده" };
  }

  if (record.attempts >= 5) {
    otpStore.delete(normalized);
    return { valid: false, reason: "تعداد تلاش‌ها بیش از حد" };
  }

  record.attempts++;
  if (record.code !== code) {
    return { valid: false, reason: "کد اشتباه" };
  }

  otpStore.delete(normalized);
  return { valid: true };
}

/**
 * نرمال‌سازی شماره موبایل ایرانی.
 * 09123456789 → 9123456789 (با +98)
 * 00989123456789 → 9123456789
 */
export function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  // 09xxxxxxxxx
  if (/^09\d{9}$/.test(cleaned)) {
    return "98" + cleaned.slice(1);
  }
  // +989xxxxxxxxx
  if (/^\+989\d{9}$/.test(cleaned)) {
    return cleaned.slice(1);
  }
  // 00989xxxxxxxxx
  if (/^00989\d{9}$/.test(cleaned)) {
    return "98" + cleaned.slice(4);
  }
  // 9xxxxxxxxx (بدون 0)
  if (/^9\d{9}$/.test(cleaned)) {
    return "98" + cleaned;
  }
  return null;
}

/** قالب‌های پیامک کاوه‌نگار. */
const KAVEHNEGAR_TEMPLATES: Record<SmsTemplate, string> = {
  otp: "sharifmand-otp",
  consultation_reminder: "sharifmand-consultation",
  case_status: "sharifmand-case",
  welcome: "sharifmand-welcome",
  payment_success: "sharifmand-payment",
};
