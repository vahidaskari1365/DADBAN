import { NextResponse } from "next/server";
import { db } from "@/db";
import { favoriteLawyers, lawyers } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, publicError } from "@/lib/api-security";
import { ensureProfileSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/favorites — وکلای نشان‌شده کاربر (با ردیف کامل وکیل) */
export async function GET(req: Request) {
  try {
    const limited = rateLimit(req, "favorites-get", 60, 60_000);
    if (limited) return limited;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    await ensureProfileSchema();
    try {
      const rows = await db
        .select({ lawyer: lawyers, createdAt: favoriteLawyers.createdAt })
        .from(favoriteLawyers)
        .innerJoin(lawyers, eq(favoriteLawyers.lawyerId, lawyers.id))
        .where(eq(favoriteLawyers.userId, user.id))
        .orderBy(desc(favoriteLawyers.createdAt));
      return NextResponse.json({
        ok: true,
        favorites: rows.map((r) => ({
          id: r.lawyer.id,
          slug: r.lawyer.slug,
          name: r.lawyer.name,
          title: r.lawyer.title,
          city: r.lawyer.city,
          province: r.lawyer.province,
          rating: r.lawyer.rating,
          reviewCount: r.lawyer.reviewCount,
          experienceYears: r.lawyer.experienceYears,
          specialties: r.lawyer.specialties,
          avatarColor: r.lawyer.avatarColor,
          photoUrl: r.lawyer.photoUrl,
          priceChat: r.lawyer.priceChat,
          verified: r.lawyer.verified,
          savedAt: r.createdAt,
        })),
      });
    } catch {
      return NextResponse.json({ ok: true, favorites: [] });
    }
  } catch {
    return publicError();
  }
}

/** POST /api/favorites — نشان‌گذاری/حذف یک وکیل (toggle) — body: { lawyerId } */
export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, "favorites-post", 30, 60_000);
    if (limited) return limited;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "برای نشان‌کردن وکیل ابتدا وارد حساب شوید." }, { status: 401 });
    await ensureProfileSchema();

    const body = await readJson(req, 2_048);
    const lawyerId = Number(body?.lawyerId);
    if (!Number.isInteger(lawyerId) || lawyerId <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه وکیل نامعتبر است." }, { status: 422 });
    }
    const [lawyer] = await db.select({ id: lawyers.id }).from(lawyers).where(eq(lawyers.id, lawyerId)).limit(1);
    if (!lawyer) return NextResponse.json({ ok: false, error: "وکیل یافت نشد." }, { status: 404 });

    const [existing] = await db
      .select({ id: favoriteLawyers.id })
      .from(favoriteLawyers)
      .where(and(eq(favoriteLawyers.userId, user.id), eq(favoriteLawyers.lawyerId, lawyerId)))
      .limit(1);

    if (existing) {
      try {
        await db.delete(favoriteLawyers).where(eq(favoriteLawyers.id, existing.id));
      } catch {
        return NextResponse.json({ ok: false, error: "عملیات موقتاً در دسترس نیست." }, { status: 503 });
      }
      return NextResponse.json({ ok: true, saved: false });
    }
    try {
      await db.insert(favoriteLawyers).values({ userId: user.id, lawyerId }).onConflictDoNothing();
    } catch {
      return NextResponse.json({ ok: false, error: "عملیات موقتاً در دسترس نیست." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, saved: true });
  } catch {
    return publicError();
  }
}

/** DELETE /api/favorites?lawyerId= — حذف نشان */
export async function DELETE(req: Request) {
  try {
    const limited = rateLimit(req, "favorites-delete", 30, 60_000);
    if (limited) return limited;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    await ensureProfileSchema();
    const lawyerId = Number(new URL(req.url).searchParams.get("lawyerId"));
    if (!Number.isInteger(lawyerId) || lawyerId <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه وکیل نامعتبر است." }, { status: 422 });
    }
    try {
      await db.delete(favoriteLawyers).where(and(eq(favoriteLawyers.userId, user.id), eq(favoriteLawyers.lawyerId, lawyerId)));
    } catch {
      return NextResponse.json({ ok: false, error: "عملیات موقتاً در دسترس نیست." }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return publicError();
  }
}
