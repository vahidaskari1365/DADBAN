import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, favoriteLawyers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";
import { ALL_PROVINCES, LOCATIONS } from "@/lib/data";
import { ensureProfileSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AVATAR_COLORS = ["#15365d", "#7c5cff", "#0e7c66", "#b45309", "#be123c", "#334155"];

/** GET /api/profile — پروفایل کاربر جاری */
export async function GET(req: Request) {
  try {
    const limited = rateLimit(req, "profile-get", 60, 60_000);
    if (limited) return limited;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    await ensureProfileSchema();
    let favoritesCount = 0;
    try {
      const rows = await db.select({ id: favoriteLawyers.id }).from(favoriteLawyers).where(eq(favoriteLawyers.userId, user.id));
      favoritesCount = rows.length;
    } catch {
      /* degraded */
    }
    return NextResponse.json({
      ok: true,
      profile: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        province: user.province,
        city: user.city,
        avatarColor: user.avatarColor,
        lawyerId: user.lawyerId,
        createdAt: user.createdAt,
      },
      favoritesCount,
    });
  } catch {
    return publicError();
  }
}

/**
 * PUT /api/profile — ویرایش اطلاعات شخصی موکل
 * body: { name?, email?, province?, city?, avatarColor? }
 */
export async function PUT(req: Request) {
  try {
    const limited = rateLimit(req, "profile-put", 20, 60_000);
    if (limited) return limited;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    await ensureProfileSchema();

    const body = await readJson(req, 8_192);
    if (!body) return NextResponse.json({ ok: false, error: "بدنه درخواست نامعتبر است." }, { status: 422 });

    const patch: Partial<typeof users.$inferInsert> = {};

    const name = text(body.name, 120);
    if (name) {
      if (name.length < 3) return NextResponse.json({ ok: false, error: "نام و نام خانوادگی را کامل وارد کنید." }, { status: 422 });
      patch.name = name;
    }

    const emailRaw = text(body.email, 254);
    if (emailRaw !== null) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
        return NextResponse.json({ ok: false, error: "نشانی ایمیل معتبر نیست." }, { status: 422 });
      }
      patch.email = emailRaw.toLowerCase();
    }

    const province = text(body.province, 60);
    if (province !== null) {
      if (province && !ALL_PROVINCES.includes(province)) {
        return NextResponse.json({ ok: false, error: "استان معتبر نیست." }, { status: 422 });
      }
      patch.province = province || null;
    }

    const city = text(body.city, 60);
    if (city !== null) {
      if (city) {
        const prov = LOCATIONS.find((l) => l.cities.includes(city));
        if (!prov) return NextResponse.json({ ok: false, error: "شهر معتبر نیست." }, { status: 422 });
        patch.city = city;
        patch.province = patch.province ?? prov.province;
      } else {
        patch.city = null;
      }
    }

    const avatarColor = text(body.avatarColor, 32);
    if (avatarColor !== null && avatarColor) {
      if (!AVATAR_COLORS.includes(avatarColor)) {
        return NextResponse.json({ ok: false, error: "رنگ انتخابی معتبر نیست." }, { status: 422 });
      }
      patch.avatarColor = avatarColor;
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ ok: false, error: "تغییری برای ذخیره ارسال نشده است." }, { status: 422 });
    }

    try {
      await db.update(users).set(patch).where(eq(users.id, user.id));
    } catch {
      return NextResponse.json({ ok: false, error: "ذخیره‌سازی موقتاً در دسترس نیست." }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return publicError();
  }
}
