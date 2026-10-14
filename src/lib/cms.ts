import { db, isDbConfigured } from "@/db";
import { siteContent, forumTopics, forumReplies } from "@/db/schema";
import { ensureCmsSchema } from "@/lib/auto-seed";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { SiteContentRow, ForumTopicRow, ForumReplyRow } from "@/db/schema";

/**
 * CMS محتوای صفحات + تالار گفتگو — لایهٔ دادهٔ مشترک.
 * همهٔ خواندن‌ها DB-first با fallback «خالیِ صادقانه» (بدون دادهٔ جعلی) و
 * تضمین اسکیمای runtime با ensureCmsSchema (best-effort).
 */

/* ------------------------- رجیستری صفحات قابل مدیریت ------------------------- */
export const PAGE_REGISTRY: { key: string; label: string; hint?: string }[] = [
  { key: "home", label: "خانه (/)", hint: "بلوک‌ها زیر محتوای اصلی صفحهٔ خانه نمایش داده می‌شوند" },
  { key: "about", label: "دربارهٔ ما (/about)" },
  { key: "contact", label: "تماس با ما (/contact)" },
  { key: "lawyers", label: "وکیل‌یابی (/lawyers)" },
  { key: "plans", label: "پلن‌های عضویت (/plans)" },
  { key: "knowledge", label: "مقالات (/knowledge)" },
  { key: "qa", label: "پرسش و پاسخ (/qa)" },
  { key: "services", label: "خدمات حقوقی (/services)" },
  { key: "business", label: "کسب‌وکارها (/business)" },
  { key: "pricing", label: "تعرفه خدمات (/pricing)" },
  { key: "fee-payment", label: "پرداخت هزینه (/fee-payment)" },
  { key: "case-board", label: "بازار پرونده‌ها (/case-board)" },
  { key: "terms", label: "قوانین و مقررات (/terms)" },
  { key: "privacy", label: "حریم خصوصی (/privacy)" },
  { key: "forum", label: "تالار گفتگو (/forum)" },
];

/** برچسب فارسی صفحه از روی کلید — برای نمایش در پنل ادمین */
export function pageLabel(key: string): string {
  return PAGE_REGISTRY.find((p) => p.key === key)?.label ?? key;
}

/* ------------------------- دسته‌های تالار گفتگو ------------------------- */
export const FORUM_CATEGORIES: string[] = [
  "گفتگوی آزاد",
  "پرسش حقوقی",
  "تجربه‌های موکل‌ها",
  "گفتگوی وکلا",
  "کار و امور اداری",
  "پیشنهاد به دادورزان",
];

export function isForumCategory(c: string): boolean {
  return FORUM_CATEGORIES.includes(c);
}

/* ------------------------- بلوک‌های محتوایی صفحات ------------------------- */
export async function getPageBlocks(page: string): Promise<SiteContentRow[]> {
  if (!isDbConfigured()) return [];
  try {
    await ensureCmsSchema();
    const rows = await db
      .select()
      .from(siteContent)
      .where(and(eq(siteContent.page, page), eq(siteContent.active, true)))
      .orderBy(asc(siteContent.sortOrder), asc(siteContent.id))
      .limit(30);
    return rows as SiteContentRow[];
  } catch {
    return [];
  }
}

/* ------------------------- تالار گفتگو — دادهٔ صفحات عمومی ------------------------- */
export type ForumTopicWithCount = ForumTopicRow & { replyCount: number };

export async function getForumTopics(category?: string, limit = 40): Promise<ForumTopicWithCount[]> {
  if (!isDbConfigured()) return [];
  try {
    await ensureCmsSchema();
    const where = category
      ? and(eq(forumTopics.status, "visible"), eq(forumTopics.category, category))
      : eq(forumTopics.status, "visible");
    const rows = await db
      .select({
        topic: forumTopics,
        replyCount: sql<number>`(SELECT COUNT(*)::int FROM forum_replies r WHERE r.topic_id = ${forumTopics.id} AND r.status = 'visible')`,
      })
      .from(forumTopics)
      .where(where)
      .orderBy(desc(forumTopics.pinned), desc(forumTopics.createdAt))
      .limit(Math.min(Math.max(limit, 1), 80));
    return rows.map((r) => ({ ...(r.topic as ForumTopicRow), replyCount: Number(r.replyCount ?? 0) }));
  } catch {
    return [];
  }
}

export async function getForumTopic(id: number): Promise<ForumTopicRow | null> {
  if (!isDbConfigured() || !Number.isFinite(id) || id <= 0) return null;
  try {
    await ensureCmsSchema();
    const rows = await db.select().from(forumTopics).where(eq(forumTopics.id, id)).limit(1);
    const row = rows[0] as ForumTopicRow | undefined;
    if (!row || row.status !== "visible") return null;
    return row;
  } catch {
    return null;
  }
}

export async function getForumReplies(topicId: number): Promise<ForumReplyRow[]> {
  if (!isDbConfigured() || !Number.isFinite(topicId) || topicId <= 0) return [];
  try {
    await ensureCmsSchema();
    const rows = await db
      .select()
      .from(forumReplies)
      .where(and(eq(forumReplies.topicId, topicId), eq(forumReplies.status, "visible")))
      .orderBy(asc(forumReplies.createdAt))
      .limit(300);
    return rows as ForumReplyRow[];
  } catch {
    return [];
  }
}

/** افزایش بازدید موضوع — fire-safe، هرگز صفحه را نمی‌شکند */
export async function bumpForumViews(topicId: number): Promise<void> {
  if (!isDbConfigured() || !Number.isFinite(topicId) || topicId <= 0) return;
  try {
    await db
      .update(forumTopics)
      .set({ views: sql`${forumTopics.views} + 1` })
      .where(eq(forumTopics.id, topicId));
  } catch {
    /* non-fatal */
  }
}

/** برچسب فارسی نقش نویسنده — بج تالار گفتگو */
export function forumRoleLabel(role: string): string {
  switch (role) {
    case "admin":
    case "supervisor":
      return "مدیر";
    case "staff":
      return "کارشناس";
    case "lawyer":
      return "وکیل";
    case "employee":
      return "وکیل کارمندان";
    case "client":
      return "کاربر";
    default:
      return "مهمان";
  }
}
