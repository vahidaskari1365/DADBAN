import "server-only";
import { randomInt } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { otpCodes } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/user-auth";

/**
 * ============================================================================
 * dadban — زیرساخت کد یکبارمصرف (OTP) — مشترک بین مسیرهای auth/otp و auth/password
 * ----------------------------------------------------------------------------
 * - ذخیره در جدول otp_codes با هش scrypt (همان قالب salt:hash رمزها)
 * - هر درخواست جدید، کدهای قبلیِ همان شماره+هدف را بی‌اثر می‌کند (consumedAt=now)
 * - تلاش ناموفق بیش از ۵ بار کد را مصرف و رد می‌کند
 * - TTL پیش‌فرض ۱۰ دقیقه
 * هرگز throw به کلاینت نشت نمی‌کند — همیشه نتیجهٔ ساختاریافته برمی‌گردد.
 * ============================================================================
 */

export type OtpPurpose = "login" | "verify" | "reset" | "register";

/** طول کد برای هر هدف — ثبت‌نام ۵ رقمی (خواستهٔ محصول)، بقیه ۶ رقمی */
const CODE_LENGTH: Record<OtpPurpose, number> = {
  login: 6,
  verify: 6,
  reset: 6,
  register: 5,
};

/** طول کد مورد انتظار برای هر هدف (سمت کلاینت/سرور برای اعتبارسنجی) */
export function otpCodeLength(purpose: OtpPurpose): number {
  return CODE_LENGTH[purpose] ?? 6;
}

export const OTP_TTL_MIN = 10;
export const OTP_MAX_ATTEMPTS = 5;

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** یکسان‌سازی ارقام فارسی/عربی → لاتین و حذف هر نویسهٔ غیررقمی */
export function digitsOnly(value: unknown): string {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[^\d]/g, "");
}

/**
 * شمارهٔ موبایل ایرانی در قالب ذخیره‌شدهٔ ۱۱ رقمی «09…» —
 * ارقام فارسی/عربی هم پذیرفته می‌شود؛ null یعنی نامعتبر.
 */
export function normalizeIranPhone(value: unknown): string | null {
  const raw = digitsOnly(value);
  if (!/^0?9\d{9}$/.test(raw)) return null;
  return raw.startsWith("0") ? raw : `0${raw}`;
}

/** دو شکل رایج شماره در app_users (با و بدون صفر ابتدای) برای پرس‌وجو */
export function phoneLookupVariants(normalized: string): [string, string] {
  return normalized.startsWith("0") ? [normalized, normalized.slice(1)] : [normalized, `0${normalized}`];
}

/**
 * صدور کد جدید: کدهای قبلِ همان شماره+هدف بی‌اثر و ردیف جدید درج می‌شود.
 * کدِ متنی فقط برای ارسال به کانال تحویل (پیامک/ایمیل) برمی‌گردد و هرگز
 * مستقیم به کلاینتِ پروداکشن داده نمی‌شود (فقط devCode در dev).
 */
export async function issueOtp(phoneNormalized: string, purpose: OtpPurpose): Promise<string> {
  const len = CODE_LENGTH[purpose] ?? 6;
  const code = String(randomInt(10 ** (len - 1), 10 ** len)); // تصادفی رمزنگارانه — ثبت‌نام ۵ رقم، بقیه ۶ رقم
  const now = new Date();
  try {
    // باطل‌کردن کدهای قبلی همان شماره+هدف (best-effort)
    await db
      .update(otpCodes)
      .set({ consumedAt: now })
      .where(and(eq(otpCodes.phone, phoneNormalized), eq(otpCodes.purpose, purpose), isNull(otpCodes.consumedAt)));
  } catch {
    /* non-fatal — ردیف جدید با تازه‌ترین createdAt برندهٔ انتخاب در verify است */
  }
  await db.insert(otpCodes).values({
    phone: phoneNormalized,
    purpose,
    codeHash: hashPassword(code),
    attempts: 0,
    expiresAt: new Date(now.getTime() + OTP_TTL_MIN * 60_000),
  });
  return code;
}

export type OtpVerifyResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * بررسی و مصرف کد — جدیدترین ردیفِ مصرف‌نشدهٔ شماره+هدف:
 * - انقضا → مصرف و رد
 * - کد غلط → attempts++ و در تلاش پنجم مصرف و رد
 * - موفق → مصرف
 */
export async function verifyAndConsumeOtp(
  phoneNormalized: string,
  code: string,
  purpose: OtpPurpose,
): Promise<OtpVerifyResult> {
  try {
    const [row] = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, phoneNormalized), eq(otpCodes.purpose, purpose), isNull(otpCodes.consumedAt)))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    if (!row) {
      return { ok: false, status: 400, error: "کد فعالی برای این شماره پیدا نشد؛ دوباره درخواست کد بدهید." };
    }
    const now = new Date();
    if (row.expiresAt.getTime() <= now.getTime()) {
      await db.update(otpCodes).set({ consumedAt: now }).where(eq(otpCodes.id, row.id));
      return { ok: false, status: 400, error: "کد منقضی شده؛ دوباره درخواست کنید" };
    }
    if (!otpCodeMatches(code, row.codeHash)) {
      const attempts = row.attempts + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await db.update(otpCodes).set({ attempts, consumedAt: now }).where(eq(otpCodes.id, row.id));
        return { ok: false, status: 400, error: "کد منقضی شده؛ دوباره درخواست کنید" };
      }
      await db.update(otpCodes).set({ attempts }).where(eq(otpCodes.id, row.id));
      return { ok: false, status: 400, error: "کد واردشده صحیح نیست." };
    }
    await db.update(otpCodes).set({ consumedAt: now }).where(eq(otpCodes.id, row.id));
    return { ok: true };
  } catch {
    return { ok: false, status: 500, error: "خطای داخلی رخ داد." };
  }
}

/** مقایسهٔ زمان-ثابت کد با هش scrypt (قالب salt:hash — همان verifyPassword رمزها) */
function otpCodeMatches(code: string, stored: string): boolean {
  return verifyPassword(code, stored);
}
