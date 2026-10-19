import { db } from "@/db";
import { lawyers, users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { hashPassword, isUserAuthConfigured } from "@/lib/user-auth";
import { ensureProfileSchema } from "@/lib/auto-seed";

/**
 * ============================================================================
 * dadvarzan — هستهٔ مشترک ایجاد حساب کاربری
 * ----------------------------------------------------------------------------
 * بین دو مسیر استفاده می‌شود:
 *  ① POST /api/auth/register        (ثبت‌نام مستقیم — سازگاری با جریان‌های قدیمی)
 *  ② POST /api/auth/register/verify (ثبت‌نام با تأیید شمارهٔ موبایل — OTP ۵ رقمی)
 * خروجی ساختاریافته؛ هیچ throwای به کلاینت نشت نمی‌کند.
 * ============================================================================
 */

export type RegisterCoreInput = {
  name: string;
  /** شمارهٔ نرمال‌شدهٔ ۱۱ رقمی 09… */
  mobile: string;
  email: string | null;
  password: string;
  /** "karamooz" = ثبت‌نام مستقیم کارآموز وکالت + پروفایل وکیل؛ null = حساب موکل */
  lawyerType: "karamooz" | null;
  city: string;
  specialties: string[];
  employeeLawyer: boolean;
};

export type RegisterCoreResult =
  | { ok: true; user: { id: number; name: string; role: string }; lawyerSlug: string | null }
  | { ok: false; status: number; error: string };

/** ساخت slug یکتا برای پروفایل کارآموز — لاتین‌سازی نام یا شناسهٔ تصادفی karamooz-… */
function karamoozSlug(name: string): string {
  const latin = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const rand = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return latin.length >= 3 ? `${latin}-${rand}` : `karamooz-${rand}`;
}

export async function createUserAccount(input: RegisterCoreInput): Promise<RegisterCoreResult> {
  const { name, mobile, email, password, lawyerType } = input;
  try {
    try {
      await ensureProfileSchema();
    } catch {
      /* migration best-effort */
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(email ? or(eq(users.phone, mobile), eq(users.email, email)) : eq(users.phone, mobile))
      .limit(1);
    if (existing.length) {
      return { ok: false, status: 409, error: "امکان ایجاد حساب با این مشخصات وجود ندارد." };
    }

    if (lawyerType === "karamooz") {
      if (!isUserAuthConfigured()) {
        return { ok: false, status: 503, error: "سامانه ثبت‌نام موقتاً در دسترس نیست؛ لطفاً بعداً تلاش کنید." };
      }
      const city = input.city ?? "";
      const employeeLawyer = input.employeeLawyer;
      // یک تراکنش: حساب وکیل ← پروفایل کارآموز ← اتصال lawyerId
      // پروفایل تازه verified=false: تا تأیید احراز هویت مدیر سایت در فهرست عمومی ظاهر نمی‌شود
      const result = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(users)
          .values({ name, phone: mobile, email, passwordHash: hashPassword(password), role: "lawyer" })
          .returning({ id: users.id, name: users.name, role: users.role });
        const [profile] = await tx
          .insert(lawyers)
          .values({
            slug: karamoozSlug(name),
            name,
            title: "کارآموز وکالت",
            licenseNo: `K-${mobile}`,
            city,
            province: city,
            lawyerType: "karamooz",
            specialties: input.specialties,
            employeeLawyer,
            verified: false,
            bio: "",
          })
          .returning({ id: lawyers.id, slug: lawyers.slug });
        await tx.update(users).set({ lawyerId: profile.id }).where(eq(users.id, created.id));
        return { user: created, lawyerSlug: profile.slug };
      });
      // حالت degraded (بدون DATABASE_URL) تراکنش را واقعاً اجرا نمی‌کند — خطای شفاف به‌جای کرش
      if (!result || !("user" in result) || !("lawyerSlug" in result)) {
        return { ok: false, status: 500, error: "خطا در ثبت‌نام" };
      }
      return { ok: true, user: result.user, lawyerSlug: result.lawyerSlug };
    }

    const [created] = await db
      .insert(users)
      .values({ name, phone: mobile, email, passwordHash: hashPassword(password) })
      .returning({ id: users.id, name: users.name, role: users.role });
    return { ok: true, user: created, lawyerSlug: null };
  } catch {
    return { ok: false, status: 500, error: "خطا در ثبت‌نام" };
  }
}
