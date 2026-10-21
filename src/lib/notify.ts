import { db } from "@/db";
import { userNotifications, users, lawyers } from "@/db/schema";
import { and, eq, inArray, isNotNull, notInArray, or } from "drizzle-orm";
import { ensureProfileSchema } from "@/lib/auto-seed";
import { after } from "next/server";
import { notifyTelegramByUserIds } from "@/lib/telegram";
import { isSmsConfigured, sendSms } from "@/lib/sms";
import { SITE_URL } from "@/lib/site";

/**
 * موتور اعلان‌های درون‌برنامه‌ای دادورزان — فرآیند بازار پرونده‌ها:
 *
 *  ۱) موکل پرونده‌ای ثبت می‌کند  → اعلان برای وکلای همان استان (پنل وکیل)
 *  ۲) وکیل پیشنهاد قیمت ثبت می‌کند → اعلان برای موکل (پنل موکل + لینک مقایسهٔ پیشنهادها)
 *  ۳) موکل پیشنهادی را می‌پذیرد   → اعلان برای وکیلِ برنده
 *  ۴) پیغام جدید در پرتال پرونده  → اعلان برای طرف مقابل + پیامک
 *  ۵) درخواست/وقت مشاورهٔ جدید    → اعلان برای وکیل + پیامک
 *
 * متن‌ها به‌صورت «کلید i18n فارسی + meta» ذخیره می‌شوند تا پنل با t()/tf()
 * به زبان انتخابی کاربر رندر کند (همسو با قاعدهٔ بومی‌سازی کامل).
 * کانال‌های تحویل: پنل (DB) + تلگرام + پیامک فراز — برای اعلان‌های هدفمند.
 * هیچ خطایی از این موتور نباید مسیر اصلی (ثبت پرونده/پیشنهاد/پیام) را بشکند —
 * همه‌جا best-effort با try/catch.
 */

export type NotificationType =
  | "new_case"
  | "new_offer"
  | "offer_accepted"
  | "verification"
  | "case_message"
  | "consultation"
  | "tovakil_request"
  | "tovakil_assigned"
  | "tovakil_taken";

interface NotifyInput {
  type: NotificationType;
  /** عنوان فارسی — کلید i18n */
  title: string;
  /** متن تکمیلی فارسی — الگوی کلید i18n */
  body?: string;
  link?: string;
  meta?: Record<string, unknown>;
}

/** سقف گیرنده‌های یک اعلان broadcast (پرهیز از درج انبوه) */
const BROADCAST_CAP = 80;
/** سقف پیامک برای اعلان‌های broadcast — هزینهٔ پیامک کنترل شود */
const SMS_BROADCAST_CAP = 10;
/** حداقل فاصلهٔ دو پیامک به یک شماره (آنتی‌اسپم گفتگوهای پرتکرار) */
const SMS_PER_PHONE_COOLDOWN_MS = 90_000;

function normalizeCity(c: string): string {
  return (c ?? "").replace(/\s+/g, " ").trim().replace(/\u200c/g, " ");
}

/** جایگذاری {متغیرها} از meta در متن قالبی */
function renderTemplate(tpl: string, meta?: Record<string, unknown>): string {
  return (tpl ?? "").replace(/\{(\w+)\}/g, (_m, k: string) => {
    const v = meta?.[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

/** لینک کامل برای پیامک — دامنهٔ مطلق */
function absoluteLink(link?: string | null): string | null {
  if (!link) return null;
  if (/^https?:\/\//i.test(link)) return link;
  return `${SITE_URL}${link.startsWith("/") ? "" : "/"}${link}`;
}

/* ───────────────── کانال پیامک (فراز) — فقط اعلان‌های هدفمند ───────────────── */

/** آخرین ارسال پیامک به هر شماره — آنتی‌اسپم در حافظه (single instance) */
const lastSmsAt = new Map<string, number>();

async function smsChannel(userIds: number[], n: NotifyInput, cap?: number): Promise<void> {
  try {
    if (!isSmsConfigured() || !userIds.length) return;
    const ids = Array.from(new Set(userIds)).filter(Boolean).slice(0, cap ?? userIds.length);
    if (!ids.length) return;
    const rows = await db
      .select({ id: users.id, phone: users.phone })
      .from(users)
      .where(inArray(users.id, ids));
    const link = absoluteLink(n.link);
    const title = renderTemplate(n.title, n.meta);
    const body = n.body ? renderTemplate(n.body, n.meta) : "";
    for (const r of rows) {
      if (!r.phone) continue;
      const key = r.phone.replace(/\D/g, "");
      const last = lastSmsAt.get(key) ?? 0;
      if (Date.now() - last < SMS_PER_PHONE_COOLDOWN_MS) continue; // اسپم پیامکی ممنوع
      lastSmsAt.set(key, Date.now());
      // هر پیامک مستقل و best-effort — خطای یکی بقیه را نمی‌شکند
      void sendSms({ to: r.phone, template: "notify", params: { title, body, link: link ?? "" } }).catch(() => {});
    }
  } catch {
    /* non-fatal — پیامک هرگز مسیر اصلی را نمی‌شکند */
  }
}

async function insertFor(userIds: number[], n: NotifyInput, opts?: { sms?: boolean; smsCap?: number }): Promise<void> {
  const unique = Array.from(new Set(userIds)).filter(Boolean).slice(0, BROADCAST_CAP);
  if (!unique.length) return;
  try {
    await db
      .insert(userNotifications)
      .values(unique.map((userId) => ({ userId, type: n.type, title: n.title, body: n.body ?? "", link: n.link ?? null, meta: n.meta ?? null })));
  } catch {
    /* non-fatal — اعلان هرگز مسیر اصلی را نباید بشکند */
  }
  /* اطلاع‌رسانی تلگرامی موازی — بعد از پاسخ اجرا می‌شود، best-effort، هرگز نمی‌شکند */
  try {
    const text = [
      "🔔 دادورزان",
      n.title,
      n.body
        ? n.body.replace(/\{(\w+)\}/g, (_m, k: string) => {
            const v = n.meta?.[k];
            return v === undefined || v === null ? "" : String(v);
          })
        : "",
      n.link ? `🔗 ${n.link}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    after(() => notifyTelegramByUserIds(unique, text));
  } catch {
    /* non-fatal — after() فقط در زمینهٔ درخواست معتبر است؛ بیرون آن نادیده گرفته می‌شود */
  }
  /* اطلاع‌رسانی پیامکی (فراز) — فقط برای اعلان‌های هدفمند؛ broadcast با سقف */
  if (opts?.sms) {
    try {
      after(() => smsChannel(unique, n, opts.smsCap));
    } catch {
      /* non-fatal */
    }
  }
}

/* ───────────────── ۱) پروندهٔ جدید → وکلای استان ───────────────── */

/** ثبت پرونده در بازار → اعلان برای وکلای همان استان؛ اگر وکیل هم‌استانی نبود، همهٔ وکلا */
export async function notifyNewCase(c: { id: number; subject: string; city: string }): Promise<void> {
  try {
    await ensureProfileSchema();
    const rows = await db
      .select({ userId: users.id, city: lawyers.city })
      .from(users)
      .innerJoin(lawyers, eq(users.lawyerId, lawyers.id))
      .where(and(eq(users.role, "lawyer"), isNotNull(users.lawyerId)));
    const wanted = normalizeCity(c.city);
    const matched = rows.filter((r) => r.city && normalizeCity(r.city) === wanted).map((r) => r.userId);
    const targets = matched.length ? matched : rows.map((r) => r.userId);
    await insertFor(
      targets,
      {
        type: "new_case",
        title: "پروندهٔ جدید در استان شما ثبت شد",
        body: "موضوع: «{subject}» — در انتظار پیشنهاد قیمت شماست",
        link: "/case-board",
        meta: { subject: c.subject, city: c.city, caseId: c.id },
      },
      // پیامک فقط برای اولین وکلای هم‌استانی — سقف هزینهٔ پیامک
      { sms: true, smsCap: SMS_BROADCAST_CAP },
    );
  } catch {
    /* non-fatal */
  }
}

/* ───────────────── ۲) پیشنهاد جدید → موکل ───────────────── */

/** ثبت پیشنهاد قیمت وکیل → اعلان برای حساب(های) موکلِ همان شمارهٔ تماس */
export async function notifyClientNewOffer(c: {
  caseNumber: string;
  trackingToken: string;
  subject: string;
  contactPhone: string;
  lawyerName: string;
  price: number;
}): Promise<void> {
  try {
    await ensureProfileSchema();
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.phone, c.contactPhone), notInArray(users.role, ["lawyer", "team"])));
    await insertFor(
      rows.map((r) => r.id),
      {
        type: "new_offer",
        title: "پیشنهاد جدیدی برای پروندهٔ شما ثبت شد",
        body: "وکیل «{lawyer}» برای «{subject}» پیشنهاد قیمت داد",
        link: `/case/offers?cn=${encodeURIComponent(c.caseNumber)}&t=${encodeURIComponent(c.trackingToken)}`,
        meta: { lawyer: c.lawyerName, price: c.price, subject: c.subject, caseNumber: c.caseNumber },
      },
      { sms: true },
    );
  } catch {
    /* non-fatal */
  }
}

/* ───────────────── ۴) نتیجهٔ احراز هویت وکلا → وکیل ───────────────── */

/** مدیر سایت درخواست احراز هویت را تایید/رد کرد → اعلان به وکیل (پیغام در پنل) */
export async function notifyVerificationResult(userId: number | null, approved: boolean, adminNote?: string | null): Promise<void> {
  if (!userId) return;
  try {
    await insertFor([userId], approved
      ? {
          type: "verification",
          title: "احراز هویت شما تأیید شد",
          body: "پروفایل شما تأیید و در فهرست وکلای دادورزان نمایش داده شد",
          link: "/dashboard/lawyer/verification",
          meta: { approved: true },
        }
      : {
          type: "verification",
          title: "درخواست احراز هویت شما بررسی شد",
          body: adminNote ? "تأیید نشد — {note}" : "تأیید نشد؛ می‌توانید مدارک را اصلاح و مجدد ارسال کنید",
          link: "/dashboard/lawyer/verification",
          meta: { approved: false, ...(adminNote ? { note: adminNote } : {}) },
        }, { sms: true });
  } catch {
    /* non-fatal */
  }
}

/* ───────────────── ۳) پذیرش پیشنهاد → وکیل برنده ───────────────── */

/** موکل پیشنهاد را پذیرفت → اعلان برای وکیلِ برنده و اعضای تیمِ دارای دسترسی offers */
export async function notifyOfferAccepted(lawyerId: number, caseSubject: string): Promise<void> {
  try {
    await ensureProfileSchema();
    const rows = await db
      .select({ id: users.id, role: users.role, teamPermissions: users.teamPermissions })
      .from(users)
      .where(or(eq(users.lawyerId, lawyerId), eq(users.parentLawyerId, lawyerId)));
    const targets = rows
      .filter((r) => r.role === "lawyer" || (r.role === "team" && (r.teamPermissions ?? "").split(",").map((s) => s.trim()).includes("offers")))
      .map((r) => r.id);
    await insertFor(targets, {
      type: "offer_accepted",
      title: "موکل پیشنهاد شما را پذیرفت",
      body: "پروندهٔ «{subject}» به شما واگذار شد — گفتگوی رایگان فعال است",
      link: "/dashboard/lawyer#offers",
      meta: { subject: caseSubject },
    }, { sms: true });
  } catch {
    /* non-fatal */
  }
}

/* ───────────────── ۵) پیغام جدید پرتال پرونده → طرف مقابل ───────────────── */

/**
 * پیغام جدید در چت پرونده → اعلان در پنلِ طرف مقابل + پیامک.
 * فرستندهٔ موکل → وکیل واگذارشده · فرستندهٔ سمت وکالت → موکل پرونده.
 * برای موکل بدون حساب، فقط پیامک به شمارهٔ تماس پرونده می‌رود.
 */
export async function notifyCaseMessage(c: {
  caseId: number;
  caseNumber: string;
  /** senderRole از سشن: "client" | "lawyer" | "trainee" */
  senderRole: string;
  senderName: string;
  clientPhone: string;
  clientUserPhone?: string | null;
  assignedLawyerId?: number | null;
}): Promise<void> {
  try {
    await ensureProfileSchema();
    const fromClientSide = c.senderRole === "client";

    if (fromClientSide) {
      if (!c.assignedLawyerId) return;
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.lawyerId, c.assignedLawyerId), eq(users.role, "lawyer")));
      await insertFor(
        rows.map((r) => r.id),
        {
          type: "case_message",
          title: "پیغام جدید از موکل دارید",
          body: "{name} در پروندهٔ «{subject}» پیغامی فرستاد",
          link: `/case-desk/${encodeURIComponent(c.caseNumber)}`,
          meta: { name: c.senderName, caseNumber: c.caseNumber, caseId: c.caseId },
        },
        { sms: true },
      );
      return;
    }

    // فرستنده سمت وکالت → موکل (با حساب یا فقط با شمارهٔ تماس)
    const ownerPhone = c.clientUserPhone || c.clientPhone;
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.phone, ownerPhone), notInArray(users.role, ["lawyer", "team"])));
    await insertFor(
      rows.map((r) => r.id),
      {
        type: "case_message",
        title: "شما یک پیغام دارید",
        body: "وکیل پروندهٔ «{subject}» برای شما پیغامی فرستاد",
        link: `/dashboard/cases/${c.caseId}`,
        meta: { name: c.senderName, caseNumber: c.caseNumber, caseId: c.caseId },
      },
      { sms: true },
    );
    // موکل بدون حساب — پیامک مستقیم به شمارهٔ تماس پرونده
    if (!rows.length && c.clientPhone) {
      try {
        const link = absoluteLink(`/case/track?cn=${encodeURIComponent(c.caseNumber)}`);
        await sendSms({
          to: c.clientPhone,
          template: "notify",
          params: { title: "شما یک پیغام دارید", body: "وکیل پرونده شما پیغامی فرستاد", link: link ?? "" },
        });
      } catch {
        /* non-fatal */
      }
    }
  } catch {
    /* non-fatal */
  }
}

/* ───────────────── ۶) درخواست/وقت مشاورهٔ جدید → وکیل ───────────────── */

const CONSULT_TYPE_FA: Record<string, string> = {
  chat: "گفتگوی متنی",
  voice: "تماس صوتی",
  video: "مشاورهٔ ویدئویی",
};

/** موکل وقت/درخواست مشاوره ثبت کرد → اعلان + پیامک برای وکیل */
export async function notifyConsultationRequest(c: {
  lawyerId: number;
  clientName: string;
  /** chat | voice | video */
  type: string;
  scheduledAt?: Date | null;
}): Promise<void> {
  try {
    await ensureProfileSchema();
    const typeFa = CONSULT_TYPE_FA[c.type] ?? "مشاوره";
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.lawyerId, c.lawyerId), eq(users.role, "lawyer")));
    await insertFor(
      rows.map((r) => r.id),
      {
        type: "consultation",
        title: "شما یک وقت مشاورهٔ جدید دارید",
        body: "{name} برای {type} ثبت‌نام کرد",
        link: "/dashboard/lawyer",
        meta: { name: c.clientName, type: typeFa },
      },
      { sms: true },
    );
  } catch {
    /* non-fatal */
  }
}

/* ───────────────── ۸) توکیل — واگذاری پرونده بین وکلا ───────────────── */

/** درخواست جدید توکیل → اعلان به وکیل مالک پرونده */
export async function notifyTovakilNewRequest(c: {
  ownerLawyerId: number;
  subject: string;
  requesterName: string;
  caseNumber: string;
}): Promise<void> {
  try {
    await ensureProfileSchema();
    const rows = await db
      .select({ id: users.id, role: users.role, teamPermissions: users.teamPermissions })
      .from(users)
      .where(eq(users.lawyerId, c.ownerLawyerId));
    const targets = rows.filter((r) => r.role === "lawyer").map((r) => r.id);
    await insertFor(targets, {
      type: "tovakil_request",
      title: "درخواست توکیل جدید",
      body: "وکیل «{name}» برای پروندهٔ «{subject}» درخواست توکیل ثبت کرد.",
      link: "/dashboard/lawyer/tovakil",
      meta: { name: c.requesterName, subject: c.subject, caseNumber: c.caseNumber },
    });
  } catch {
    /* non-fatal */
  }
}

/** واگذاری پرونده توکیل → اعلان به وکیل دریافت‌کننده + بقیه درخواست‌دهنده‌ها */
export async function notifyTovakilAssigned(c: {
  caseId: number;
  subject: string;
  caseNumber: string;
  assignedLawyerId: number;
  otherRequesterIds: number[];
}): Promise<void> {
  try {
    await ensureProfileSchema();
    const assigned = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.lawyerId, c.assignedLawyerId), eq(users.role, "lawyer")));
    await insertFor(
      assigned.map((r) => r.id),
      {
        type: "tovakil_assigned",
        title: "پروندهٔ توکیل به شما واگذار شد",
        body: "پروندهٔ «{subject}» در توکیل به شما واگذار شد — هماهنگی جزئیات با وکیل معرفی‌کننده.",
        link: "/dashboard/lawyer/tovakil",
        meta: { subject: c.subject, caseNumber: c.caseNumber },
      },
      { sms: true },
    );
    if (c.otherRequesterIds.length) {
      await insertFor(c.otherRequesterIds, {
        type: "tovakil_taken",
        title: "پروندهٔ توکیل واگذار شد",
        body: "پروندهٔ «{subject}» به وکیل دیگری واگذار شد؛ پرونده‌های باز دیگر را ببینید.",
        link: "/dashboard/lawyer/tovakil",
        meta: { subject: c.subject },
      });
    }
  } catch {
    /* non-fatal */
  }
}
