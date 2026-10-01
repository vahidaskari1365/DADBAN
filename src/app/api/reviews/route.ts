import { NextResponse } from "next/server";
import { db } from "@/db";
import { reviews, consultations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * POST /api/reviews — ثبت نقد و امتیاز پس از مشاوره.
 * body: { consultationId, lawyerId, rating, comment, service }
 *
 * فقط کاربرانی که مشاوره داشتن می‌تونن نقد ثبت کنن.
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "review", 5, 60 * 60_000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "احراز هویت نشده" }, { status: 401 });
  }

  const body = await readJson(req, 4_096);
  const consultationId = Number(body?.consultationId);
  const lawyerId = Number(body?.lawyerId);
  const rating = Math.min(5, Math.max(1, Number(body?.rating) || 0));
  const comment = text(body?.comment, 1000);
  const service = text(body?.service, 100);

  if (!consultationId || !lawyerId || !rating) {
    return NextResponse.json({ ok: false, error: "اطلاعات ناقص" }, { status: 400 });
  }

  // بررسی اینکه کاربر واقعاً مشاوره داشته
  try {
    const consultation = await db
      .select()
      .from(consultations)
      .where(
        and(
          eq(consultations.id, consultationId),
          eq(consultations.clientPhone, user.phone)
        )
      )
      .limit(1);

    if (!consultation[0]) {
      return NextResponse.json(
        { ok: false, error: "شما در این مشاوره شرکت نداشته‌اید" },
        { status: 403 }
      );
    }

    if (consultation[0].status !== "completed") {
      return NextResponse.json(
        { ok: false, error: "فقط پس از تکمیل مشاوره می‌توانید نقد ثبت کنید" },
        { status: 400 }
      );
    }

    // بررسی نقد تکراری
    const existing = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.lawyerId, lawyerId),
          eq(reviews.clientName, user.name)
        )
      )
      .limit(1);

    if (existing[0]) {
      return NextResponse.json(
        { ok: false, error: "شما قبلاً نقد ثبت کرده‌اید" },
        { status: 400 }
      );
    }

    // ثبت نقد
    const [review] = await db
      .insert(reviews)
      .values({
        lawyerId,
        clientName: user.name,
        rating,
        comment: comment || "",
        service: service || null,
      })
      .returning();

    logger.info("review submitted", { reviewId: review.id, lawyerId, rating });

    return NextResponse.json({ ok: true, reviewId: review.id });
  } catch (err) {
    logger.error("review submission failed", err);
    return NextResponse.json(
      { ok: false, error: "ثبت نقد ناموفق بود" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reviews?lawyerId=123 — دریافت نظرات یک وکیل.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lawyerId = Number(url.searchParams.get("lawyerId"));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || "10")));

  if (!lawyerId) {
    return NextResponse.json({ ok: false, error: "lawyerId لازم است" }, { status: 400 });
  }

  try {
    const list = await db
      .select()
      .from(reviews)
      .where(eq(reviews.lawyerId, lawyerId))
      .limit(limit);

    return NextResponse.json({ ok: true, reviews: list });
  } catch {
    return NextResponse.json({ ok: true, reviews: [] });
  }
}
