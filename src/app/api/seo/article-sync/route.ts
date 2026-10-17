import { NextResponse } from "next/server";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { AEO_ARTICLES } from "@/data/aeo-articles";

/**
 * /api/seo/article-sync — انتشار مقاله‌های AEO بسته در ریپو (فاز ۲ نقشه سئو).
 *
 * احراز: Authorization: Bearer <LAW_SYNC_TOKEN|CRON_SECRET> یا ?key=<همان>
 * امنیت: رویه add-only — مقاله‌ای که از قبل در DB هست (مثلاً در پنل ادمین ویرایش شده)
 * هیچ‌وقت بازنویسی نمی‌شود (onConflictDoNothing) تا محتوای ادمین آسیب نبیند.
 *
 *  GET  → وضعیت بسته: کدام slugها منتشر شده‌اند
 *  POST → انتشار مقاله‌های تازه (idempotent — هر چند بار هم صدا بزنی امن است)
 */

export const dynamic = "force-dynamic";

const token = process.env.LAW_SYNC_TOKEN || process.env.CRON_SECRET;

function authorized(req: Request): boolean {
  if (!token) return false;
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const key = bearer || new URL(req.url).searchParams.get("key") || "";
  return key === token;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const slugs = AEO_ARTICLES.map((a) => a.slug);
    const rows = await db
      .select({ slug: articles.slug, publishedAt: articles.publishedAt })
      .from(articles)
      .where(inArray(articles.slug, slugs));
    const published = new Set(rows.map((r) => r.slug));
    return NextResponse.json({
      ok: true,
      batch: AEO_ARTICLES.map((a) => ({
        slug: a.slug,
        title: a.title,
        published: published.has(a.slug),
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const rows = AEO_ARTICLES.map((a) => ({
      slug: a.slug,
      title: a.title,
      category: a.category,
      excerpt: a.excerpt,
      quickAnswer: a.quickAnswer,
      content: a.content,
      faq: JSON.stringify(a.faq),
      readTime: a.readTime,
      author: "تیم تحریریه دادورزان",
      authorRole: "پژوهشگر حقوق",
    }));

    const inserted = await db
      .insert(articles)
      .values(rows)
      .onConflictDoNothing({ target: articles.slug })
      .returning({ slug: articles.slug });

    return NextResponse.json({
      ok: true,
      total: rows.length,
      inserted: inserted.map((r) => r.slug),
      skipped: rows.length - inserted.length,
    });
  } catch (err) {
    console.error("[dadban] article-sync failed:", err);
    return NextResponse.json({ ok: false, error: "sync failed" }, { status: 500 });
  }
}
