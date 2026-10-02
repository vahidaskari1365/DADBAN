import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";
import { isLawyerRole, resolveLawyerContext } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/portal/lawyer/profile — پروفایل وکیل جاری (فیلدهای عمومی) */
export async function GET(req: Request) {
  try {
    const limited = rateLimit(req, "portal-lawyer-profile-get", 60, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

    const ctx = await resolveLawyerContext(user);
    if (!ctx.lawyer) return NextResponse.json({ ok: false, error: "پروفایل وکیل یافت نشد." }, { status: 404 });

    const l = ctx.lawyer;
    return NextResponse.json({
      ok: true,
      demo: ctx.demo,
      profile: {
        id: l.id,
        name: l.name,
        title: l.title,
        bio: l.bio,
        about: l.about,
        specialties: l.specialties,
        city: l.city,
        rating: l.rating,
        reviewCount: l.reviewCount,
        caseCount: l.caseCount,
        experienceYears: l.experienceYears,
        verified: l.verified,
        priceChat: l.priceChat,
        priceVoice: l.priceVoice,
        priceVideo: l.priceVideo,
      },
    });
  } catch {
    return publicError();
  }
}

/**
 * PUT /api/portal/lawyer/profile — ذخیره پروفایل (فقط وکیل؛ محدود به فیلدهای مجاز خودش)
 * body: { name?, bio?, about?, specialties? }
 */
export async function PUT(req: Request) {
  try {
    const limited = rateLimit(req, "portal-lawyer-profile-put", 20, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (!isLawyerRole(user.role)) {
      return NextResponse.json({ ok: false, error: "ویرایش پروفایل فقط برای وکیل مجاز است." }, { status: 403 });
    }

    const ctx = await resolveLawyerContext(user);
    if (!ctx.lawyer) return NextResponse.json({ ok: false, error: "پروفایل وکیل یافت نشد." }, { status: 404 });

    const body = await readJson(req, 8_000);
    if (!body) return NextResponse.json({ ok: false, error: "بدنه درخواست نامعتبر است." }, { status: 422 });

    const patch: Partial<typeof lawyers.$inferInsert> = {};

    const name = text(body.name, 80);
    if (name) patch.name = name;

    const bio = text(body.bio, 300);
    if (bio !== null) patch.bio = bio;

    const about = text(body.about, 2000);
    if (about !== null) patch.about = about;

    if (body.specialties !== undefined && body.specialties !== null && String(body.specialties).trim() !== "") {
      const list = String(body.specialties)
        .split(/[،,]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length <= 40)
        .slice(0, 10);
      if (list.length > 0) patch.specialties = list;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "فیلد قابل ذخیره ارسال نشده است." }, { status: 422 });
    }

    await db.update(lawyers).set(patch).where(eq(lawyers.id, ctx.lawyerId));
    return NextResponse.json({ ok: true });
  } catch {
    return publicError();
  }
}
