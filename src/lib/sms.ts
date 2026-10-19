/**
 * ============================================================================
 * dadvarzan — SMS Notification Module
 * ----------------------------------------------------------------------------
 * Provider: فراز اس‌ام‌اس (Faraz SMS / IPPanel) — وب‌سرویس ارسال تکی.
 *   POST {API_BASE}/api/v1/sms/send/webservice/single
 *   headers: { apikey: SMS_FARAZ_API_KEY }
 *   body:    { originator: SMS_FARAZ_SENDER, recipient: "09…", message: "…" }
 * برای کاربرد: کد تأیید ثبت‌نام/ورود (OTP) + اطلاع‌رسانی‌های موکل/وکیل.
 * در حالت بدون کلید فقط لاگ می‌کند (dev mode) — هیچ موفقیتی ساختگی در پروداکشن نیست.
 * ============================================================================
 */

import { logger } from "./logger";
import { SITE_URL } from "@/lib/site";

export type SmsTemplate =
  | "otp"
  | "notify"
  | "welcome"
  | "consultation_reminder"
  | "case_status"
  | "payment_success";

interface SmsPayload {
  to: string;
  template: SmsTemplate;
  params: Record<string, string>;
}

/** آیا SMS فعال هست؟ (کلید فراز موجود باشه) */
export function isSmsConfigured(): boolean {
  return !!process.env.SMS_FARAZ_API_KEY;
}

/**
 * خط فرستندهٔ پیش‌فرض پنل فراز: 90008361 (خط خدماتی — مناسب OTP/اطلاع‌رسانی؛
 * پیام خدماتی مشمول بلاک‌لیست تبلیغاتی نمی‌شود). قابل بازنویسی با SMS_FARAZ_SENDER.
 */
const DEFAULT_SMS_SENDER = "90008361";

/** شمارهٔ خط فرستندهٔ پنل فراز — در پنل فراز بخش «خطوط» قابل مشاهده است */
function farazSender(): string {
  return (process.env.SMS_FARAZ_SENDER ?? "").trim() || DEFAULT_SMS_SENDER;
}

/** متن پیامک برای هر قالب — فارسی، کوتاه، با لینک سایت */
function buildMessage(template: SmsTemplate, params: Record<string, string>): string {
  const link = params.link ? `\n🔗 ${params.link}` : "";
  switch (template) {
    case "otp":
      return `دادورزان\nکد تأیید شما: ${params.code ?? ""}\nاین کد تا ۱۰ دقیقه معتبر است.`;
    case "notify": {
      const body = params.body ? `\n${params.body}` : "";
      return `🔔 دادورزان\n${params.title ?? ""}${body}${link}`;
    }
    case "welcome":
      return `${params.name ? `${params.name} عزیز، ` : ""}به دادورزان خوش آمدید!\n🔗 ${params.link || SITE_URL}`;
    case "consultation_reminder":
      return `🔔 دادورزان\nیادآوری: وقت مشاورهٔ شما ${params.time ?? ""} است.${link}`;
    case "case_status":
      return `🔔 دادورزان\nوضعیت پروندهٔ شما به‌روزرسانی شد: ${params.status ?? ""}${link}`;
    case "payment_success":
      return `پرداخت شما در دادورزان با موفقیت انجام شد.${params.amount ? `\nمبلغ: ${params.amount} تومان` : ""}\n🔗 ${SITE_URL}`;
    default:
      return `🔔 دادورزان`;
  }
}

/** ارسال خام با وب‌سرویس فراز — فالبک بین هاست‌های API در خطای شبکه */
async function farazSend(
  recipient09: string,
  message: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.SMS_FARAZ_API_KEY;
  if (!apiKey) return { success: false, error: "SMS not configured" };

  const bases = Array.from(
    new Set([
      (process.env.SMS_FARAZ_API_BASE ?? "").trim() || "https://api2.ippanel.com",
      "https://api.ippanel.com",
    ]),
  );
  const body = JSON.stringify({ originator: farazSender(), recipient: recipient09, message });
  let lastError = "";

  for (const base of bases) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      const res = await fetch(`${base}/api/v1/sms/send/webservice/single`, {
        method: "POST",
        headers: { apikey: apiKey, "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const text = await res.text();
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        logger.error("Faraz SMS API error", null, { base, status: res.status, body: text.slice(0, 300) });
        continue;
      }

      let data: {
        code?: string;
        status?: string;
        message?: string;
        error?: { message?: string } | string | null;
        data?: { messageid?: number | string; message_id?: number | string } | null;
      } | null = null;
      try {
        data = JSON.parse(text);
      } catch {
        lastError = `invalid JSON response`;
        logger.error("Faraz SMS bad response", null, { base, body: text.slice(0, 200) });
        continue;
      }

      const okCode = data?.code === "ok" || data?.status === "ok";
      const messageId = data?.data?.messageid ?? data?.data?.message_id;
      if (!okCode && !messageId) {
        const apiMsg =
          (typeof data?.error === "string" ? data.error : data?.error?.message) ?? data?.message ?? "unknown";
        lastError = `api: ${String(apiMsg).slice(0, 180)}`;
        logger.error("Faraz SMS rejected", null, { base, response: text.slice(0, 300) });
        continue;
      }

      const id = String(messageId ?? Date.now());
      logger.info("SMS sent via Faraz", { to: recipient09, messageId: id, base });
      return { success: true, messageId: id };
    } catch (err) {
      lastError = (err as Error).message;
      logger.error("Faraz SMS request failed", err, { base });
    }
  }

  return { success: false, error: lastError || "faraz send failed" };
}

/**
 * ارسال پیامک قالب‌بندی‌شده.
 * در dev mode (بدون کلید فراز)، فقط لاگ می‌کند و شناسهٔ dev_ برمی‌گرداند.
 */
export async function sendSms(
  payload: SmsPayload,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, template, params } = payload;

  const normalizedPhone = normalizePhone(to);
  if (!normalizedPhone) {
    return { success: false, error: "شماره موبایل نامعتبر" };
  }
  // قالب ۰۹… که فراز می‌پذیرد
  const recipient09 = `0${normalizedPhone.slice(2)}`;

  if (!isSmsConfigured()) {
    logger.info("[sms:dev] SMS not configured, logging instead", {
      to: recipient09,
      template,
      params,
    });
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  return farazSend(recipient09, buildMessage(template, params));
}

/** ارسال متن آزاد (برای اطلاع‌رسانی‌های ساخته‌شده بیرون از این ماژول — notify.ts) */
export async function sendSmsText(
  to: string,
  message: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const normalizedPhone = normalizePhone(to);
  if (!normalizedPhone) return { success: false, error: "شماره موبایل نامعتبر" };
  const recipient09 = `0${normalizedPhone.slice(2)}`;
  if (!isSmsConfigured()) {
    logger.info("[sms:dev] SMS not configured, logging instead", { to: recipient09, message });
    return { success: true, messageId: `dev_${Date.now()}` };
  }
  return farazSend(recipient09, message);
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
