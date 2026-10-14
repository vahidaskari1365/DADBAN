import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { forumTopics, forumReplies } from "@/db/schema";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson } from "@/lib/api-security";
import { ensureCmsSchema } from "@/lib/auto-seed";
import { getForumReplies } from "@/lib/cms";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * تالار گفتگو — جزئیات موضوع و پاسخ‌دادن.
 * GET  /api/forum/topics/[id] → موضوع visible + پاسخ‌های visible
 * POST /api/forum/topics/[id] { body, name? } → ثبت پاسخ (همه: لاگین‌شده یا مهمان)
 */

const BODY_MAX = 5_000;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
  try {
    await ensureCmsSchema();
    const rows = await db.select().from(forumTopics).where(and(eq(forumTopics.id, numId), eq(forumTopics.status, "visible"))).limit(1);
    const topic = rows[0];
    if (!topic) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    const replies = await getForumReplies(numId);
    return NextResponse.json({ ok: true, topic, replies });
  } catch {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  const limited = rateLimit(req, "forum-reply", 20, 60 * 60 * 1000);
  if (limited) return limited;
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });

  const body = await readJson(req, 32_768);
  if (!body) return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });

  const text = String(body.body ?? "").trim().slice(0, BODY_MAX);
  if (text.length < 2) return NextResponse.json({ ok: false, error: "متن پاسخ خیلی کوتاه است." }, { status: 400 });

  const user = await getCurrentUser();
  const guestLimited = user ? null : rateLimit(req, "forum-reply-guest", 5, 60 * 60 * 1000);
  if (guestLimited) return guestLimited;

  try {
    await ensureCmsSchema();
    const rows = await db.select({ id: forumTopics.id }).from(forumTopics).where(and(eq(forumTopics.id, numId), eq(forumTopics.status, "visible"))).limit(1);
    if (!rows[0]) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

    const guestName = String(body.name ?? "").trim().slice(0, 60);
    const authorName = user ? user.name || "کاربر دادورزان" : guestName || "مهمان";
    const authorRole = user ? user.role : "guest";
    const inserted = await db
      .insert(forumReplies)
      .values({ topicId: numId, userId: user?.id ?? null, authorName, authorRole, body: text })
      .returning({ id: forumReplies.id });
    return NextResponse.json({ ok: true, id: (inserted as { id: number }[])[0]?.id, isGuest: !user });
  } catch {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
  }
}
