import { db } from "@/db";
import { userNotifications, users, lawyers } from "@/db/schema";
import { and, eq, isNotNull, notInArray, or } from "drizzle-orm";
import { ensureProfileSchema } from "@/lib/auto-seed";

/**
 * موتور اعلان‌های درون‌برنامه‌ای دادبان — فرآیند بازار پرونده‌ها:
 *
 *  ۱) موکل پرونده‌ای ثبت می‌کند  → اعلان برای وکلای همان استان (پنل وکیل)
 *  ۲) وکیل پیشنهاد قیمت ثبت می‌کند → اعلان برای موکل (پنل موکل + لینک مقایسهٔ پیشنهادها)
 *  ۳) موکل پیشنهادی را می‌پذیرد   → اعلان برای وکیلِ برنده
 *
 * متن‌ها به‌صورت «کلید i18n فارسی + meta» ذخیره می‌شوند تا پنل با t()/tf()
 * به زبان انتخابی کاربر رندر کند (همسو با قاعدهٔ بومی‌سازی کامل).
 * هیچ خطایی از این موتور نباید مسیر اصلی (ثبت پرونده/پیشنهاد) را بشکند —
 * همه‌جا best-effort با try/catch.
 */

export type NotificationType = "new_case" | "new_offer" | "offer_accepted";

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

function normalizeCity(c: string): string {
  return (c ?? "").replace(/\s+/g, " ").trim().replace(/\u200c/g, " ");
}

async function insertFor(userIds: number[], n: NotifyInput): Promise<void> {
  const unique = Array.from(new Set(userIds)).filter(Boolean).slice(0, BROADCAST_CAP);
  if (!unique.length) return;
  try {
    await db
      .insert(userNotifications)
      .values(unique.map((userId) => ({ userId, type: n.type, title: n.title, body: n.body ?? "", link: n.link ?? null, meta: n.meta ?? null })));
  } catch {
    /* non-fatal — اعلان هرگز مسیر اصلی را نباید بشکند */
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
    await insertFor(targets, {
      type: "new_case",
      title: "پروندهٔ جدید در استان شما ثبت شد",
      body: "موضوع: «{subject}» — در انتظار پیشنهاد قیمت شماست",
      link: "/case-board",
      meta: { subject: c.subject, city: c.city, caseId: c.id },
    });
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
    );
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
    });
  } catch {
    /* non-fatal */
  }
}
