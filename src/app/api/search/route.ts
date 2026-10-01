import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyers, articles, qaQuestions, contracts } from "@/db/schema";
import { or, ilike, sql, eq, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * جستجوی Full-text در سراسر سایت.
 *
 * GET /api/search?q=طلاق&type=all&limit=10
 *  - q: عبارت جستجو (حداقل ۲ کاراکتر)
 *  - type: all | lawyers | articles | qa | contracts
 *  - limit: حداکثر نتایج (پیش‌فرض ۱۰، حداکثر ۵۰)
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, "search", 60, 60_000);
  if (limited) return limited;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const type = url.searchParams.get("type") || "all";
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));

  if (q.length < 2) {
    return NextResponse.json(
      { ok: false, error: "عبارت جستجو باید حداقل ۲ کاراکتر باشد" },
      { status: 400 }
    );
  }

  const log = logger.child({ module: "search", query: q });
  log.info("search request", { type, limit });

  // الگوی LIKE برای PostgreSQL
  const pattern = `%${q}%`;

  try {
    const results: {
      lawyers?: any[];
      articles?: any[];
      qa?: any[];
      contracts?: any[];
    } = {};

    // ─── وکلا ────────────────────────────────────────────────────────────
    if (type === "all" || type === "lawyers") {
      try {
        results.lawyers = await db
          .select({
            slug: lawyers.slug,
            name: lawyers.name,
            title: lawyers.title,
            city: lawyers.city,
            specialties: lawyers.specialties,
            rating: lawyers.rating,
            verified: lawyers.verified,
          })
          .from(lawyers)
          .where(
            or(
              ilike(lawyers.name, pattern),
              ilike(lawyers.bio, pattern),
              ilike(lawyers.about, pattern),
              // جستجو در specialties array
              sql`${lawyers.specialties}::text ILIKE ${pattern}`
            )
          )
          .limit(limit);
      } catch {
        /* DB degraded */
        results.lawyers = [];
      }
    }

    // ─── مقالات ──────────────────────────────────────────────────────────
    if (type === "all" || type === "articles") {
      try {
        results.articles = await db
          .select({
            slug: articles.slug,
            title: articles.title,
            excerpt: articles.excerpt,
            category: articles.category,
            publishedAt: articles.publishedAt,
          })
          .from(articles)
          .where(
            or(
              ilike(articles.title, pattern),
              ilike(articles.excerpt, pattern),
              ilike(articles.content, pattern)
            )
          )
          .orderBy(desc(articles.publishedAt))
          .limit(limit);
      } catch {
        results.articles = [];
      }
    }

    // ─── پرسش و پاسخ ─────────────────────────────────────────────────────
    if (type === "all" || type === "qa") {
      try {
        results.qa = await db
          .select({
            slug: qaQuestions.slug,
            question: qaQuestions.question,
            answer: qaQuestions.answer,
            category: qaQuestions.category,
            helpful: qaQuestions.helpful,
          })
          .from(qaQuestions)
          .where(
            or(
              ilike(qaQuestions.question, pattern),
              ilike(qaQuestions.answer, pattern)
            )
          )
          .limit(limit);
      } catch {
        results.qa = [];
      }
    }

    // ─── قراردادها ───────────────────────────────────────────────────────
    if (type === "all" || type === "contracts") {
      try {
        results.contracts = await db
          .select({
            slug: contracts.slug,
            title: contracts.title,
            description: contracts.description,
            category: contracts.category,
            popular: contracts.popular,
          })
          .from(contracts)
          .where(
            or(
              ilike(contracts.title, pattern),
              ilike(contracts.description, pattern),
              ilike(contracts.useCase, pattern)
            )
          )
          .limit(limit);
      } catch {
        results.contracts = [];
      }
    }

    const totalCount = Object.values(results).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );

    log.info("search results", { count: totalCount });

    return NextResponse.json({
      ok: true,
      query: q,
      total: totalCount,
      ...results,
    });
  } catch (err) {
    log.error("search failed", err);
    return NextResponse.json(
      { ok: false, error: "جستجو در حال حاضر ممکن نیست" },
      { status: 500 }
    );
  }
}
