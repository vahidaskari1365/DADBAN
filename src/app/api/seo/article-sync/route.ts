import { NextResponse } from "next/server";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { AEO_ARTICLES } from "@/data/aeo-articles";
import { isAdmin } from "@/lib/admin-auth";
import { submitIndexNow } from "@/lib/indexnow";

/**
 * /api/seo/article-sync — انتشار مقاله‌های AEO بسته در ریپو (فاز ۲ نقشه سئو).
 *
 * احراز: Authorization: Bearer <LAW_SYNC_TOKEN|CRON_SECRET> یا ?key=<همان>
 *        یا نشست معتبر پنل ادمین (کوکی dadban_admin) — برای انتشار دستی.
 * امنیت: رویه add-only — مقاله‌ای که از قبل در DB هست (مثلاً در پنل ادمین ویرایش شده)
 * هیچ‌وقت بازنویسی نمی‌شود (onConflictDoNothing) تا محتوای ادمین آسیب نبیند.
 *
 *  GET  → وضعیت بسته: کدام slugها منتشر شده‌اند
 *  POST → انتشار مقاله‌های تازه (idempotent — هر چند بار هم صدا بزنی امن است)
 *         + پینگ IndexNow برای مقاله‌های تازه‌منتشرشده (best-effort)
 */

export const dynamic = "force-dynamic";

async function authorized(req: Request): Promise<boolean> {
  const token = process.env.LAW_SYNC_TOKEN || process.env.CRON_SECRET;
  if (token) {
    const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const key = bearer || new URL(req.url).searchParams.get("key") || "";
    if (key === token) return true;
  }
  try {
    return await isAdmin();
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  if (!(await authorized(req))) {
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
  if (!(await authorized(req))) {
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

    const insertedSlugs = inserted.map((r) => r.slug);

    // پینگ IndexNow برای مقاله‌های تازه (best-effort — هرگز جریان اصلی را نمی‌شکند)
    let indexnow: { ok: boolean; status?: number; submitted: number; error?: string } | null = null;
    if (insertedSlugs.length) {
      const result = await submitIndexNow([
        "/knowledge",
        ...insertedSlugs.map((s) => `/knowledge/${s}`),
      ]);
      indexnow = { ok: result.ok, status: result.status, submitted: result.submitted, error: result.error };
    }

    return NextResponse.json({
      ok: true,
      total: rows.length,
      inserted: insertedSlugs,
      skipped: rows.length - insertedSlugs.length,
      indexnow,
    });
  } catch (err) {
    console.error("[dadban] article-sync failed:", err);
    return NextResponse.json({ ok: false, error: "sync failed" }, { status: 500 });
  }
}
