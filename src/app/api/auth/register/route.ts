import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { lawyers, users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { hashPassword, isUserAuthConfigured, signUserSession, userCookieName } from "@/lib/user-auth";
import { ensureProfileSchema } from "@/lib/auto-seed";
import { phone, rateLimit, readJson, text, validPhone } from "@/lib/api-security";
import { sendWelcomeEmail } from "@/lib/email";
export const runtime = "nodejs";
const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** خوش‌آمد ایمیلی — best-effort: خطای ایمیل هرگز ثبت‌نام را نمی‌شکند (قرارداد ماژول email). */
async function welcomeBestEffort(to: string | null, name: string): Promise<void> {
  if (!to) return;
  try {
    await sendWelcomeEmail(to, name);
  } catch {
    /* هرگز به مسیر ثبت‌نام نشت نمی‌کند */
  }
}

/**
 * ساخت slug یکتا برای پروفایل کارآموز.
 * helper عمومی slug در src/lib وجود ندارد؛ اگر نام با حروف لاتین نوشته شده باشد
 * از خودِ نام استفاده می‌شود، وگرنه شناسهٔ تصادفی «karamooz-…» — در هر دو حالت
 * پسوند تصادفی برای یکتایی (قیود unique روی slug) اضافه می‌شود.
 */
function karamoozSlug(name: string): string {
  const latin = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const rand = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return latin.length >= 3 ? `${latin}-${rand}` : `karamooz-${rand}`;
}

export async function POST(req: Request) {
  const body = await readJson(req, 8192); const limited = rateLimit(req, "register", 5, 60 * 60_000); if (limited) return limited;
  const name = text(body?.name, 120); const mobile = phone(body?.phone); const email = text(body?.email, 254)?.toLowerCase() || null; const password = typeof body?.password === "string" ? body.password : "";
  if (!name || !validPhone(mobile) || (email && !emailOk.test(email)) || password.length < 8 || password.length > 1024) return NextResponse.json({ ok: false, error: "اطلاعات ثبت‌نام معتبر نیست." }, { status: 422 });
  // ثبت‌نام مستقیم «کارآموز وکالت»: حساب role=lawyer + پروفایل وکیل کارآموز + سشن؛
  // هر مقدار دیگری از lawyerType رفتار فعلی (ساخت حساب موکل) را حفظ می‌کند.
  const lawyerType = body?.lawyerType === "karamooz" ? "karamooz" : null;
  try { await ensureProfileSchema(); } catch { /* migration best-effort */ }
  try {
    const existing = await db.select({ id: users.id }).from(users).where(email ? or(eq(users.phone, mobile), eq(users.email, email)) : eq(users.phone, mobile)).limit(1);
    if (existing.length) return NextResponse.json({ ok: false, error: "امکان ایجاد حساب با این مشخصات وجود ندارد." }, { status: 409 });
    if (lawyerType === "karamooz") {
      if (!isUserAuthConfigured()) return NextResponse.json({ ok: false, error: "سامانه ثبت‌نام موقتاً در دسترس نیست؛ لطفاً بعداً تلاش کنید." }, { status: 503 });
      const city = text(body?.city, 60) ?? "";
      // تخصص‌ها (الزامی ≥۱، حداکثر ۶) + گزینهٔ اختیاری «وکیل کارمندان و کارهای اداری»
      const specialties = Array.isArray(body?.specialties)
        ? Array.from(new Set((body.specialties as unknown[]).map((s) => text(s, 60)).filter((s): s is string => !!s))).slice(0, 6)
        : [];
      if (!specialties.length) return NextResponse.json({ ok: false, error: "حداقل یک تخصص انتخاب کنید." }, { status: 422 });
      const employeeLawyer = body?.employeeLawyer === true;
      // یک تراکنش: حساب وکیل ← پروفایل کارآموز ← اتصال lawyerId
      // پروفایل تازه verified=false: تا تأیید احراز هویت مدیر سایت در فهرست عمومی ظاهر نمی‌شود
      const result = await db.transaction(async (tx) => {
        const [created] = await tx.insert(users).values({ name, phone: mobile, email, passwordHash: hashPassword(password), role: "lawyer" }).returning({ id: users.id, name: users.name, role: users.role });
        const [profile] = await tx.insert(lawyers).values({
          slug: karamoozSlug(name),
          name,
          title: "کارآموز وکالت",
          licenseNo: `K-${mobile}`,
          city,
          province: city,
          lawyerType: "karamooz",
          specialties,
          employeeLawyer,
          verified: false,
          bio: "",
        }).returning({ id: lawyers.id, slug: lawyers.slug });
        await tx.update(users).set({ lawyerId: profile.id }).where(eq(users.id, created.id));
        return { user: created, lawyerSlug: profile.slug };
      });
      // حالت degraded (بدون DATABASE_URL) تراکنش را واقعاً اجرا نمی‌کند — خطای شفاف به‌جای کرش
      if (!result || !("user" in result) || !("lawyerSlug" in result)) return NextResponse.json({ ok: false, error: "خطا در ثبت‌نام" }, { status: 500 });
      // سشن بلافاصله صادر می‌شود — همان الگوی /api/auth/login
      const store = await cookies();
      store.set(userCookieName(), signUserSession(result.user.id, "lawyer"), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
      await welcomeBestEffort(email, name);
      return NextResponse.json({ ok: true, user: { id: result.user.id, name: result.user.name, role: "lawyer" }, lawyerSlug: result.lawyerSlug });
    }
    const [created] = await db.insert(users).values({ name, phone: mobile, email, passwordHash: hashPassword(password) }).returning({ id: users.id, name: users.name, role: users.role });
    await welcomeBestEffort(email, name);
    return NextResponse.json({ ok: true, user: created });
  } catch { return NextResponse.json({ ok: false, error: "خطا در ثبت‌نام" }, { status: 500 }); }
}
