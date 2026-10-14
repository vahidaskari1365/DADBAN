import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { forumTopics } from "@/db/schema";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson } from "@/lib/api-security";
import { ensureCmsSchema } from "@/lib/auto-seed";
import { isForumCategory } from "@/lib/cms";
import { desc, eq, and, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * تالار گفتگو — فهرست و ساخت موضوع (/forum).
 * GET  /api/forum/topics?category=…&limit=…  → موضوع‌های visible (سنجاق‌شده اول)
 * POST /api/forum/topics { title, body?, category, name? } → ساخت موضوع
 *      کاربر لاگین‌شده: نام و نقش حساب. مهمان: «مهمان» یا نام دلخواه + rate-limit سختگیرانه.
 */

const TITLE_MAX = 150;
const BODY_MAX = 5_000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = (url.searchParams.get("category") ?? "").trim().slice(0, 60);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 40) || 40, 1), 80);
  if (!isDbConfigured()) return NextResponse.json({ ok: true, topics: [] });
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
      .limit(limit);
    return NextResponse.json({
      ok: true,
      topics: rows.map((r) => ({ ...(r.topic as Record<string, unknown>), replyCount: Number(r.replyCount ?? 0) })),
    });
  } catch {
    return NextResponse.json({ ok: true, topics: [] });
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "forum-topic", 8, 60 * 60 * 1000);
  if (limited) return limited;
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });

  const body = await readJson(req, 32_768);
  if (!body) return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });

  const title = String(body.title ?? "").trim().slice(0, TITLE_MAX);
  const text = String(body.body ?? "").trim().slice(0, BODY_MAX);
  const categoryRaw = String(body.category ?? "گفتگوی آزاد").trim().slice(0, 60);
  const category = isForumCategory(categoryRaw) ? categoryRaw : "گفتگوی آزاد";
  if (title.length < 5) {
    return NextResponse.json({ ok: false, error: "عنوان باید حداقل ۵ نویسه باشد." }, { status: 400 });
  }

  /* هویت: کاربر لاگین‌شده با نام و نقش حساب؛ مهمان با نام دلخواه (rate-limit جداست) */
  const user = await getCurrentUser();
  const isGuest = !user;
  const guestLimited = isGuest ? rateLimit(req, "forum-topic-guest", 3, 60 * 60 * 1000) : null;
  if (guestLimited) return guestLimited;

  const guestName = String(body.name ?? "").trim().slice(0, 60);
  const authorName = user ? user.name || "کاربر دادورزان" : guestName || "مهمان";
  const authorRole = user ? user.role : "guest";

  try {
    await ensureCmsSchema();
    const inserted = await db
      .insert(forumTopics)
      .values({ userId: user?.id ?? null, authorName, authorRole, title, body: text, category })
      .returning({ id: forumTopics.id });
    const id = (inserted as { id: number }[])[0]?.id;
    return NextResponse.json({ ok: true, id, isGuest });
  } catch {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
  }
}
