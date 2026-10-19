/**
 * ============================================================================
 * dadvarzan — SMS Notification Module
 * ----------------------------------------------------------------------------
 * Provider: فراز اس‌ام‌اس (FarazSMS) — مستندات رسمی: docs.farazsms.com
 *   Host:    https://api.iranpayamak.com   (قابل بازنویسی با SMS_FARAZ_API_BASE)
 *   Header:  Api-Key: SMS_FARAZ_API_KEY   (نام هدر حساس به بزرگی/کوچکی حرف است!)
 *
 * دو کانال ارسال:
 *   ۱) POST /ws/v1/sms/pattern — پیامک قالبی (OTP/کد تأیید): بدون صف، زیر ۵ ثانیه.
 *      پیش‌نیاز: قالب تأییدشده در پنل فراز → کد قالب در SMS_FARAZ_PATTERN_CODE
 *      (نام متغیر داخل قالب با SMS_FARAZ_PATTERN_VAR، پیش‌فرض «code»)
 *   ۲) POST /ws/v1/sms/simple — متن آزاد به شماره‌ها: دارای معدل انسانی (چند دقیقه‌ای)
 *      → مناسب اطلاع‌رسانی‌های غیرفوری. اگر قالب OTP تنظیم نشده باشد، OTP هم
 *      با همین مسیر تلاش می‌شود (با تأخیر احتمالی) تا ثبت‌نام کاملاً قطع نشود.
 *
 * پاسخ موفق: 200/201 با {"status":"success","data":{"id":…}}؛ خطاها ممکن است
 * HTML عمومی باشند (۴۲۲/…)، پس تشخیص فقط بر اساس کد وضعیت HTTP است.
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

/** کد قالب OTP (پترن) از پنل فراز — بخش «قالب‌های پیامک» → کد وب‌سرویس */
function farazPatternCode(): string {
  return (process.env.SMS_FARAZ_PATTERN_CODE ?? "").trim();
}

/** نام متغیر داخل قالب OTP (مثلاً در پنل: %code%) */
function farazPatternVar(): string {
  return (process.env.SMS_FARAZ_PATTERN_VAR ?? "").trim() || "code";
}

function apiBase(): string {
  return ((process.env.SMS_FARAZ_API_BASE ?? "").trim() || "https://api.iranpayamak.com").replace(/\/+$/, "");
}

/**
 * ثبت رویداد/خطای فراز در جدول app_errors تا در «پنل ادمین → پایش خطاها»
 * (/admin/errors) دیده شود — چون لاگ کنسول هاست برای ادمین قابل مشاهده نیست.
 * best-effort: هیچ‌وقت throw نمی‌کند و در مسیر ارسال وقفه نمی‌اندازد.
 */
async function persistSmsEvent(
  message: string,
  level: "error" | "warning",
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    const { db } = await import("@/db");
    const { appErrors } = await import("@/db/schema");
    await db.insert(appErrors).values({
      level,
      source: "server",
      message: `Faraz SMS: ${message}`.slice(0, 500),
      stack: null,
      url: null,
      userId: null,
      userAgent: null,
      meta,
    });
  } catch {
    /* دیتابیس در دسترس نیست — لاگ کنسول کافی است */
  }
}

/** وضعیت پیکربندی SMS برای ابزار تشخیصی ادمین — هیچ رازی (کلید/کد پترن) برنمی‌گرداند */
export function smsStatus(): { configured: boolean; sender: string; patternConfigured: boolean; apiBase: string } {
  return {
    configured: isSmsConfigured(),
    sender: farazSender(),
    patternConfigured: !!farazPatternCode(),
    apiBase: apiBase(),
  };
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

export interface FarazResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** «pattern» یا «simple» — کدام کانال فراز استفاده شد */
  channel?: "pattern" | "simple";
}

/**
 * فراخوانی خام وب‌سرویس فراز — هدر Api-Key + تشخیص نتیجه فقط با کد HTTP.
 * خطاهای فراز گاهی HTML عمومی برمی‌گردانند (مثلاً 422 Upstream Error)، پس بدنهٔ
 * غیر-JSON را با کد وضعیت گزارش می‌کنیم و هرگز کرش نمی‌کنیم.
 */
async function farazRequest(
  path: string,
  body: Record<string, unknown>,
): Promise<FarazResult> {
  const apiKey = process.env.SMS_FARAZ_API_KEY;
  if (!apiKey) return { success: false, error: "SMS not configured" };

  let res: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    res = await fetch(`${apiBase()}${path}`, {
      method: "POST",
      headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    const msg = (err as Error).message || "network error";
    logger.error("Faraz SMS request failed", err, { path });
    void persistSmsEvent(`request failed: ${msg.slice(0, 120)}`, "error", { path });
    return { success: false, error: `network: ${msg.slice(0, 120)}` };
  }

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    // پیام خطای JSON فراز (اگر بود) — وگرنه کد HTTP
    let apiMsg = "";
    try {
      const data = JSON.parse(text) as { message?: string; errors?: Record<string, string[]> | string };
      if (data?.message) apiMsg = data.message;
      else if (data?.errors) apiMsg = typeof data.errors === "string" ? data.errors : Object.values(data.errors).flat().join("؛ ");
    } catch {
      /* HTML error page — apiMsg stays empty */
    }
    const err = apiMsg ? `api: ${apiMsg.slice(0, 160)}` : `HTTP ${res.status}`;
    logger.error("Faraz SMS API error", null, { path, status: res.status, body: text.slice(0, 200) });
    void persistSmsEvent(err, "error", { path, status: res.status, body: text.slice(0, 200) });
    return { success: false, error: err };
  }

  let data: { status?: string; message?: string; messages?: string; data?: number | string | null } | null = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* fallthrough */
  }
  // ⚠️ پاسخ موفق مستندات رسمی فراز: {"status":"success","data":0,"messages":"…"}
  // `data` خودِ شناسهٔ ارسال است (عدد — حتی ۰ معتبر است)، نه آبجکت با فیلد id.
  // موفقیت فقط با status سنجیده می‌شود؛ سنجیدن data.data.id باعث می‌شد حتی ارسالِ
  // موفق هم «شکست» گزارش شود (باگ واقعی که باعث 502 برای OTP سالم می‌شد).
  if (data?.status !== "success") {
    const err = `unexpected: ${(data?.message || text).slice(0, 140)}`;
    logger.error("Faraz SMS bad response", null, { path, body: text.slice(0, 200) });
    void persistSmsEvent(err, "error", { path, body: text.slice(0, 200) });
    return { success: false, error: err };
  }

  const rawId = data.data;
  const messageId = rawId !== undefined && rawId !== null && rawId !== "" ? String(rawId) : "-";
  logger.info("SMS sent via Faraz", { to: String(body.recipient ?? (body.recipients as string[])?.[0] ?? ""), messageId, path, channel: path.includes("pattern") ? "pattern" : "simple" });
  return { success: true, messageId, channel: path.includes("pattern") ? "pattern" : "simple" };
}

/** ارسال قالبی (پترن) — مسیر OTP: فوری و بدون صف. پیش‌نیاز: قالب تأییدشده در پنل */
async function farazPatternSend(
  recipient09: string,
  vars: Record<string, string>,
): Promise<FarazResult> {
  const code = farazPatternCode();
  if (!code) return { success: false, error: "pattern-not-configured: SMS_FARAZ_PATTERN_CODE خالی است (قالب را در پنل فراز بسازید)" };
  return farazRequest("/ws/v1/sms/pattern", {
    code,
    attributes: vars,
    recipient: recipient09,
    line_number: farazSender(),
    number_format: "english",
  });
}

/** ارسال متن آزاد — دارای معدل انسانی فراز (چند دقیقه‌ای)، مناسب اطلاع‌رسانی */
async function farazSimpleSend(recipient09: string, message: string): Promise<FarazResult> {
  return farazRequest("/ws/v1/sms/simple", {
    text: message,
    line_number: farazSender(),
    recipients: [recipient09],
    number_format: "english",
    schedule: null,
  });
}

/** ارسال پیامک قالب‌بندی‌شده — OTP اول پترن، در نبود پترن فالبک ساده */
export async function sendSms(
  payload: SmsPayload,
): Promise<FarazResult> {
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

  if (template === "otp") {
    // مسیر اصلی OTP: پترن (فوری). اگر پترن تنظیم/تأیید نشده → فالبک ساده با هشدار
    const patternRes = await farazPatternSend(recipient09, { [farazPatternVar()]: params.code ?? "" });
    if (patternRes.success) return patternRes;
    logger.warn("OTP pattern send failed — falling back to simple (moderated) send", {
      error: patternRes.error,
    });
    // هشدار قابل‌مشاهده در /admin/errors — یادآوری اینکه OTP بدون پترن، صف‌دار و کند است
    void persistSmsEvent(
      `OTP pattern fallback → simple (قسمت صف‌دار): ${patternRes.error ?? "unknown"}`,
      "warning",
      { to: recipient09 },
    );
  }

  return farazSimpleSend(recipient09, buildMessage(template, params));
}

/** ارسال متن آزاد (برای اطلاع‌رسانی‌های ساخته‌شده بیرون از این ماژول — notify.ts) */
export async function sendSmsText(
  to: string,
  message: string,
): Promise<FarazResult> {
  const normalizedPhone = normalizePhone(to);
  if (!normalizedPhone) return { success: false, error: "شماره موبایل نامعتبر" };
  const recipient09 = `0${normalizedPhone.slice(2)}`;
  if (!isSmsConfigured()) {
    logger.info("[sms:dev] SMS not configured, logging instead", { to: recipient09, message });
    return { success: true, messageId: `dev_${Date.now()}` };
  }
  return farazSimpleSend(recipient09, message);
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
