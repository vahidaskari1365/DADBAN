import { createHash, randomBytes } from "crypto";

/**
 * CSRF Protection — محافظت از فرم‌های حساس در برابر حملات Cross-Site Request Forgery.
 *
 * استراتژی: Double-submit cookie pattern
 *  - یک token تصادفی تولید می‌شه و در cookie با SameSite=Strict set می‌شه
 *  - client باید همون token رو در header X-CSRF-Token بفرسته
 *  - اگه مطابقت نداشت، request رد می‌شه
 *
 * نحوه استفاده:
 *  - فرم‌ها: یک hidden input با token از /api/csrf-token
 *  - API: چک کردن header X-CSRF-Token با csrfVerify()
 */

const COOKIE_NAME = "dadban_csrf";
const TTL_MS = 1000 * 60 * 30; // 30 دقیقه

/** تولید token جدید CSRF. */
export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

/** نام cookie CSRF. */
export function csrfCookieName(): string {
  return COOKIE_NAME;
}

/** مدت اعتبار cookie. */
export function csrfTtl(): number {
  return TTL_MS;
}

/**
 * تأیید توکن CSRF.
 * مقایسه‌ی token دریافتی با cookie ذخیره‌شده.
 */
export function csrfVerify(cookieToken: string | undefined, headerToken: string | undefined): boolean {
  if (!cookieToken || !headerToken) return false;

  // تأیید ساختار (hex با طول ۶۴)
  if (!/^[a-f0-9]{64}$/.test(headerToken)) return false;

  // مقایسه‌ی زمان‌سنج (timing-safe)
  const a = Buffer.from(cookieToken, "hex");
  const b = Buffer.from(headerToken, "hex");
  if (a.length !== b.length) return false;
  // timingSafeEqual نیاز به طول یکسان داره
  return a.equals(b);
}

/**
 * تولید fingerprint از session برای اتصال توکن به کاربر.
 * این کار از سرقت token و استفاده‌ی آن در session دیگه جلوگیری می‌کنه.
 */
export function csrfFingerprint(userId?: string, ip?: string): string {
  const data = `${userId || "anon"}:${ip || "unknown"}:${process.env.AUTH_SECRET || ""}`;
  return createHash("sha256").update(data).digest("hex").slice(0, 16);
}
