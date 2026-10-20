import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyerOnboarding, lawyers, users } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { permDenied } from "@/lib/admin-guard";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { rateLimit, readJson, text, validPhone, publicError } from "@/lib/api-security";
import { toEn } from "@/lib/money";
import { LEGAL_TOPICS } from "@/lib/data";
import { sendOnboardingResultEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * روی‌بوردینگ وکلای واقعی — یک مسیر، دو فعل:
 *  - POST (عمومی): ثبت درخواست همکاری از /join-as-lawyer + امضای الکترونیکی قرارداد همکاری
 *  - PUT (فقط ادمین): تأیید (تراکنش واحد: پروفایل وکیل + اتصال حساب) یا رد درخواست
 *
 * صداقت: پیام موفقیت وعدهٔ SMS/ایمیل نمی‌دهد — نتیجه از «پنل کاربری یا پشتیبانی» اعلام می‌شود؛
 * ایمیل اگر پیکربندی شده باشد best-effort ارسال و نتیجه‌اش شفاف گزارش می‌شود.
 */

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AGREEMENT_VERSION = "cooperation-v1";
const TOPIC_LABELS = new Set(LEGAL_TOPICS.map((t) => t.label));

/** ساخت slug یکتا برای پروفایل وکیل جدید — همان رویکرد karamoozSlug در /api/auth/register:
 *  نام لاتین‌نویسی‌شده + پسوند تصادفی؛ نام غیرلاتین → پیشوند lawyer-. */
function lawyerProfileSlug(name: string): string {
  const latin = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const rand = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return latin.length >= 3 ? `${latin}-${rand}` : `lawyer-${rand}`;
}

/** موبایل: تبدیل ارقام فارسی/عربی → انگلیسی، حذف غیررقمی، نرمال‌سازی به ۱۱ رقمی 09… */
function parseMobile(v: unknown): string | null {
  const digits = toEn(String(v ?? "")).replace(/[^\d]/g, "");
  if (!validPhone(digits)) return null;
  return digits.length === 10 && digits.startsWith("9") ? `0${digits}` : digits;
}

/** سابقهٔ کار: عدد صحیح ۰ تا ۷۰ — نامعتبر → null */
function parseExperience(v: unknown): number | null {
  const digits = toEn(String(v ?? "")).replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0 || n > 70) return null;
  return n;
}

/** تخصص‌ها: فقط برچسب‌های شناخته‌شدهٔ LEGAL_TOPICS، یکتا، ۱ تا ۶ مورد */
function parseSpecialties(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const cleaned = Array.from(
    new Set(
      v
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ).filter((s) => TOPIC_LABELS.has(s));
  return cleaned.length >= 1 && cleaned.length <= 6 ? cleaned : null;
}

/** ایمیل اطلاع‌رسانی نتیجهٔ بررسی — best-effort awaited؛ هرگز مسیر اصلی را fail نمی‌کند */
async function tryNotifyResult(
  to: string,
  name: string,
  approved: boolean,
  note?: string,
): Promise<{ attempted: boolean; delivered: boolean; provider: string }> {
  try {
    const r = await sendOnboardingResultEmail(to, name, approved, note);
    return { attempted: true, delivered: !!r.delivered, provider: String(r.provider ?? "log") };
  } catch {
    return { attempted: true, delivered: false, provider: "log" };
  }
}

/* ============================================================================
 * POST /api/lawyer-onboarding — ثبت درخواست همکاری (عمومی، محدود ۳ در ساعت/IP)
 * ============================================================================ */
export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, "lawyer-onboarding-post", 3, 60 * 60_000);
    if (limited) return limited;

    try {
      await ensureExtendedSchema();
    } catch {
      /* migration best-effort */
    }

    const body = await readJson(req, 12_000);
    if (!body) {
      return NextResponse.json({ ok: false, error: "بدنهٔ درخواست نامعتبر است." }, { status: 422 });
    }

    /* ── اعتبارسنجی کامل سمت سرور (فرم هم اعتبارسنجی دارد؛ اینجا منبع حقیقت است) ── */
    const name = text(body.name, 120);
    const mobile = parseMobile(body.phone);
    const email = text(body.email, 254)?.toLowerCase() || null;
    const licenseNo = text(body.licenseNo, 60);
    const lawyerType = body.lawyerType === "karamooz" ? "karamooz" : body.lawyerType === "wakil" ? "wakil" : null;
    const province = text(body.province, 60);
    const city = text(body.city, 60);
    const experienceYears = parseExperience(body.experienceYears);
    const specialties = parseSpecialties(body.specialties);
    const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 1000) : "";

    if (!name) {
      return NextResponse.json({ ok: false, error: "نام و نام خانوادگی را کامل وارد کنید." }, { status: 422 });
    }
    if (!mobile) {
      return NextResponse.json({ ok: false, error: "شمارهٔ موبایل معتبر نیست (مثال: 09123456789)." }, { status: 422 });
    }
    if (email && !EMAIL_OK.test(email)) {
      return NextResponse.json({ ok: false, error: "ایمیل واردشده معتبر نیست." }, { status: 422 });
    }
    if (!licenseNo) {
      return NextResponse.json({ ok: false, error: "شمارهٔ پروانهٔ وکالت الزامی است." }, { status: 422 });
    }
    if (!lawyerType) {
      return NextResponse.json({ ok: false, error: "نوع وکالت را انتخاب کنید." }, { status: 422 });
    }
    if (!province || !city) {
      return NextResponse.json({ ok: false, error: "استان و شهر را انتخاب کنید." }, { status: 422 });
    }
    if (experienceYears === null) {
      return NextResponse.json({ ok: false, error: "سابقهٔ کار را به سال وارد کنید (۰ تا ۷۰)." }, { status: 422 });
    }
    if (!specialties) {
      return NextResponse.json({ ok: false, error: "دست‌کم یک تخصص (حداکثر ۶ مورد) انتخاب کنید." }, { status: 422 });
    }
    if (body.agree !== true) {
      return NextResponse.json(
        { ok: false, error: "برای ثبت درخواست، پذیرش قرارداد همکاری (امضای الکترونیکی) الزامی است." },
        { status: 422 },
      );
    }

    /* ── جلوگیری از درخواست موازی با همان شماره — پاسخ صادقانهٔ 409 ── */
    try {
      const inflight = await db
        .select({ id: lawyerOnboarding.id })
        .from(lawyerOnboarding)
        .where(and(eq(lawyerOnboarding.phone, mobile), inArray(lawyerOnboarding.status, ["pending", "approved"])))
        .limit(1);
      if (Array.isArray(inflight) && inflight.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "درخواستی با این شماره در جریان است؛ لطفاً منتظر نتیجهٔ بررسی بمانید یا با پشتیبانی تماس بگیرید.",
          },
          { status: 409 },
        );
      }
    } catch {
      /* جدول در دسترس نیست — insert خودش خطای شفاف می‌دهد */
    }

    const me = await getCurrentUser().catch(() => null);

    const inserted = await db
      .insert(lawyerOnboarding)
      .values({
        userId: me?.id ?? null,
        name,
        phone: mobile,
        email,
        licenseNo,
        lawyerType,
        city,
        province,
        experienceYears,
        specialties,
        bio,
        status: "pending",
        agreementVersion: AGREEMENT_VERSION,
        agreementSignedAt: new Date(),
      })
      .returning({ id: lawyerOnboarding.id, status: lawyerOnboarding.status });

    const row = Array.isArray(inserted) ? inserted[0] : undefined;
    if (!row) {
      // حالت degraded (بدون DATABASE_URL) — هیچ ردیفی واقعاً ثبت نشده؛ صادقانه اعلام می‌کنیم
      return NextResponse.json(
        { ok: false, error: "ثبت درخواست موقتاً در دسترس نیست؛ لطفاً بعداً تلاش کنید." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      request: { id: row.id, status: row.status },
    });
  } catch {
    return publicError();
  }
}

/* ============================================================================
 * PUT /api/lawyer-onboarding — بررسی درخواست توسط ادمین (تأیید / رد)
 * body: { id, action: "approve" | "reject", note? }
 * ============================================================================ */
export async function PUT(req: Request) {
  try {
    const limited = rateLimit(req, "lawyer-onboarding-put", 30, 60_000);
    if (limited) return limited;

    const _denied = await permDenied("lawyers");
    if (_denied) return _denied;

    const body = await readJson(req, 4_000);
    if (!body) {
      return NextResponse.json({ ok: false, error: "بدنهٔ درخواست نامعتبر است." }, { status: 422 });
    }

    const id = Number(body.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "شناسهٔ درخواست نامعتبر است." }, { status: 422 });
    }
    const action = body.action === "approve" ? "approve" : body.action === "reject" ? "reject" : null;
    if (!action) {
      return NextResponse.json({ ok: false, error: "اقدام مجاز: approve یا reject." }, { status: 422 });
    }

    const rows = await db.select().from(lawyerOnboarding).where(eq(lawyerOnboarding.id, id)).limit(1);
    const request = Array.isArray(rows) ? rows[0] : undefined;
    if (!request) {
      return NextResponse.json({ ok: false, error: "درخواست یافت نشد." }, { status: 404 });
    }
    if (request.status !== "pending") {
      return NextResponse.json(
        { ok: false, error: "این درخواست قبلاً بررسی شده است." },
        { status: 409 },
      );
    }

    const note = text(body.note, 500);

    /* ── رد: یک آپدیت ساده + توضیح الزامی ── */
    if (action === "reject") {
      if (!note) {
        return NextResponse.json(
          { ok: false, error: "برای رد درخواست، ثبت توضیح برای متقاضی الزامی است." },
          { status: 422 },
        );
      }
      await db
        .update(lawyerOnboarding)
        .set({ status: "rejected", adminNote: note, reviewedAt: new Date() })
        .where(eq(lawyerOnboarding.id, id));
      const emailInfo = request.email
        ? await tryNotifyResult(request.email, request.name, false, note)
        : null;
      return NextResponse.json({ ok: true, action: "rejected", emailNotified: emailInfo?.delivered ?? false });
    }

    /* ── تأیید: همه‌چیز در «یک تراکنش» — پروفایل وکیل + اتصال حساب + وضعیت درخواست ── */
    const result = await db.transaction(async (tx) => {
      const [profile] = await tx
        .insert(lawyers)
        .values({
          slug: lawyerProfileSlug(request.name),
          name: request.name,
          // عنوان پروفایل از نوع عضویت: کانون وکلا / مرکز وکلا / کارآموز
          title:
            request.barType === "markaz"
              ? "وکیل مرکز وکلا"
              : request.lawyerType === "karamooz"
                ? "کارآموز وکالت"
                : "وکیل پایه یک دادگستری",
          lawyerType: request.lawyerType,
          licenseNo: request.licenseNo,
          city: request.city,
          province: request.province,
          experienceYears: request.experienceYears,
          specialties: request.specialties,
          bio: request.bio ?? "",
          verified: true,
          // تعرفه‌ها صفر شروع می‌شوند — وکیل پس از اتصال از پنل خودش تعیین می‌کند
          priceChat: 0,
          priceVoice: 0,
          priceVideo: 0,
        })
        .returning({ id: lawyers.id, slug: lawyers.slug });
      if (!profile) return null;

      if (request.userId) {
        // اتصال حساب متقاضی به پروفایل تازه‌ساخته‌شده + ارتقای نقش به وکیل
        await tx.update(users).set({ role: "lawyer", lawyerId: profile.id }).where(eq(users.id, request.userId));
      }

      await tx
        .update(lawyerOnboarding)
        .set({ status: "approved", adminNote: note ?? null, reviewedAt: new Date() })
        .where(eq(lawyerOnboarding.id, request.id));

      return { lawyerId: profile.id, slug: profile.slug };
    });

    if (!result || !("lawyerId" in result) || !("slug" in result)) {
      // حالت degraded یا شکست تراکنش — هیچ‌چیز نیمه‌کاره نمانده (transaction atomic است)
      return NextResponse.json(
        { ok: false, error: "تأیید درخواست نیمه‌کاره ماند؛ لطفاً دوباره تلاش کنید." },
        { status: 500 },
      );
    }

    const emailInfo = request.email
      ? await tryNotifyResult(request.email, request.name, true)
      : null;

    return NextResponse.json({
      ok: true,
      action: "approved",
      lawyerId: result.lawyerId,
      slug: result.slug,
      emailNotified: emailInfo?.delivered ?? false,
      emailAttempted: emailInfo?.attempted ?? false,
    });
  } catch {
    return publicError();
  }
}
