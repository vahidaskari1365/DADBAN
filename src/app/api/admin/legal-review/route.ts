import { NextResponse } from "next/server";
import { db } from "@/db";
import { legalReviews } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin-auth";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";
import { ensureExtendedSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** صفحاتی که نشان «بازبینی حقوقی» می‌توانند بگیرند */
const ALLOWED_SLUGS = ["terms", "privacy"] as const;

/**
 * POST /api/admin/legal-review — ثبت/به‌روزرسانی بازبینی حقوقی یک صفحه (upsert روی pageSlug).
 * گارد ادمین: همان مکانیزم کوکی dadban_admin با isAdmin() — مثل بقیهٔ APIهای ادمین.
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "admin-legal-review", 30, 60_000);
  if (limited) return limited;
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const body = await readJson(req, 4_096);
  if (!body) return NextResponse.json({ ok: false, error: "بدنهٔ درخواست نامعتبر است." }, { status: 422 });

  const slug = text(body.pageSlug, 40);
  if (!slug || !(ALLOWED_SLUGS as readonly string[]).includes(slug)) {
    return NextResponse.json({ ok: false, error: "صفحهٔ انتخابی مجاز نیست (terms یا privacy)." }, { status: 422 });
  }
  const reviewerName = text(body.reviewerName, 120);
  if (!reviewerName) {
    return NextResponse.json({ ok: false, error: "نام بازبین الزامی است." }, { status: 422 });
  }
  const reviewerTitle = text(body.reviewerTitle, 120) ?? "وکیل دادگستری";
  const summary = typeof body.summary === "string" ? body.summary.trim().slice(0, 1000) : "";

  try {
    try {
      await ensureExtendedSchema();
    } catch {
      /* best-effort */
    }
    const reviewedAt = new Date();
    const [row] = await db
      .insert(legalReviews)
      .values({ pageSlug: slug, reviewerName, reviewerTitle, summary, reviewedAt })
      .onConflictDoUpdate({
        target: legalReviews.pageSlug,
        set: { reviewerName, reviewerTitle, summary, reviewedAt },
      })
      .returning();
    return NextResponse.json({
      ok: true,
      review: row
        ? { ...row, reviewedAt: (row.reviewedAt instanceof Date ? row.reviewedAt : new Date(row.reviewedAt)).toISOString() }
        : null,
    });
  } catch (err) {
    console.error("[dadban] admin legal-review POST failed:", err);
    return publicError();
  }
}

/** DELETE /api/admin/legal-review?id=N — حذف بازبینی */
export async function DELETE(req: Request) {
  const limited = rateLimit(req, "admin-legal-review-delete", 30, 60_000);
  if (limited) return limited;
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const id = Number(new URL(req.url).searchParams.get("id") ?? "");
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "شناسهٔ بازبینی نامعتبر است." }, { status: 422 });
  }

  try {
    try {
      await ensureExtendedSchema();
    } catch {
      /* best-effort */
    }
    await db.delete(legalReviews).where(eq(legalReviews.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[dadban] admin legal-review DELETE failed:", err);
    return publicError();
  }
}
