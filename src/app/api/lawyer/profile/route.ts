import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyers, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";
import { LOCATIONS } from "@/lib/data";
import { ensureProfileSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/lawyer/profile — پروفایل وکیل متصل به حساب جاری */
export async function GET(req: Request) {
  try {
    const limited = rateLimit(req, "lawyer-profile-get", 60, 60_000);
    if (limited) return limited;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    await ensureProfileSchema();
    if (user.role !== "lawyer" || !user.lawyerId) {
      return NextResponse.json({ ok: false, error: "این حساب به پروفایل وکیلی متصل نیست." }, { status: 403 });
    }
    const [l] = await db.select().from(lawyers).where(eq(lawyers.id, user.lawyerId)).limit(1);
    if (!l) return NextResponse.json({ ok: false, error: "پروفایل وکیل یافت نشد." }, { status: 404 });
    return NextResponse.json({
      ok: true,
      profile: {
        id: l.id,
        slug: l.slug,
        name: l.name,
        title: l.title,
        bio: l.bio,
        about: l.about,
        specialties: l.specialties,
        services: l.services,
        province: l.province,
        city: l.city,
        responseTime: l.responseTime,
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
 * PUT /api/lawyer/profile — ذخیره پروفایل حرفه‌ای (فقط وکیل؛ فقط فیلدهای مجاز خودش)
 * body: { name?, title?, bio?, about?, specialties?, services?, province?, city?, responseTime?, priceChat?, priceVoice?, priceVideo? }
 */
export async function PUT(req: Request) {
  try {
    const limited = rateLimit(req, "lawyer-profile-put", 20, 60_000);
    if (limited) return limited;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    await ensureProfileSchema();
    if (user.role !== "lawyer" || !user.lawyerId) {
      return NextResponse.json({ ok: false, error: "ویرایش پروفایل فقط برای وکلای متصل‌شده مجاز است." }, { status: 403 });
    }

    const body = await readJson(req, 16_384);
    if (!body) return NextResponse.json({ ok: false, error: "بدنه درخواست نامعتبر است." }, { status: 422 });

    const patch: Partial<typeof lawyers.$inferInsert> = {};

    const name = text(body.name, 80);
    if (name) {
      if (name.length < 3) return NextResponse.json({ ok: false, error: "نام را کامل وارد کنید." }, { status: 422 });
      patch.name = name;
    }

    const title = text(body.title, 120);
    if (title !== null && title) patch.title = title;

    /** متن اختیاری — undefined یعنی دست‌نخورده، "" یعنی پاک‌کردن عمدی فیلد، null یعنی نامعتبر */
    const optText = (value: unknown, max: number): string | null | undefined => {
      if (value === undefined) return undefined;
      if (typeof value !== "string") return null;
      const v = value.trim();
      return v.length > max ? null : v;
    };

    const bio = optText(body.bio, 300);
    if (bio === null) return NextResponse.json({ ok: false, error: "معرفی کوتاه حداکثر ۳۰۰ نویسه است." }, { status: 422 });
    if (bio !== undefined) patch.bio = bio;

    const about = optText(body.about, 4000);
    if (about === null) return NextResponse.json({ ok: false, error: "متن «درباره وکیل» حداکثر ۴۰۰۰ نویسه است." }, { status: 422 });
    if (about !== undefined) patch.about = about;

    const responseTime = text(body.responseTime, 60);
    if (responseTime !== null && responseTime) patch.responseTime = responseTime;

    const parseList = (value: unknown, maxItems: number, maxLen: number): string[] | null => {
      if (value === undefined) return null;
      if (!Array.isArray(value)) return null;
      const items = value
        .map((v) => String(v ?? "").trim())
        .filter((v) => v.length > 0 && v.length <= maxLen)
        .slice(0, maxItems);
      return items;
    };

    const specialties = parseList(body.specialties, 12, 60);
    if (specialties !== null) patch.specialties = specialties;

    const services = parseList(body.services, 16, 80);
    if (services !== null) patch.services = services;

    // موقعیت: استان از فهرست ۳۱ استان؛ شهر باید از شهرهای همان استان باشد
    const province = text(body.province, 60);
    const city = text(body.city, 60);
    if (province !== null || city !== null) {
      const [l] = await db.select({ province: lawyers.province }).from(lawyers).where(eq(lawyers.id, user.lawyerId)).limit(1);
      const nextProvince = province ?? l?.province ?? "";
      if (nextProvince && !LOCATIONS.some((x) => x.province === nextProvince)) {
        return NextResponse.json({ ok: false, error: "استان معتبر نیست." }, { status: 422 });
      }
      if (city !== null) {
        if (city) {
          const prov = LOCATIONS.find((x) => x.province === nextProvince);
          if (!prov || !prov.cities.includes(city)) {
            return NextResponse.json({ ok: false, error: "شهر انتخابی با استان هماهنگ نیست." }, { status: 422 });
          }
          patch.city = city;
        }
      }
      if (province !== null && province) patch.province = province;
    }

    const prices: [keyof typeof lawyers.$inferInsert, unknown][] = [
      ["priceChat", body.priceChat],
      ["priceVoice", body.priceVoice],
      ["priceVideo", body.priceVideo],
    ];
    for (const [key, value] of prices) {
      if (value === undefined || value === null || value === "") continue;
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 100_000_000) {
        return NextResponse.json({ ok: false, error: "تعرفه واردشده معتبر نیست." }, { status: 422 });
      }
      (patch as Record<string, unknown>)[key as string] = Math.round(n);
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ ok: false, error: "تغییری برای ذخیره ارسال نشده است." }, { status: 422 });
    }

    try {
      await db.update(lawyers).set(patch).where(eq(lawyers.id, user.lawyerId));
      // همگام‌سازی نام نمایشی حساب با نام حرفه‌ای وکیل
      if (patch.name) await db.update(users).set({ name: patch.name }).where(eq(users.id, user.id));
    } catch {
      return NextResponse.json({ ok: false, error: "ذخیره‌سازی موقتاً در دسترس نیست." }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return publicError();
  }
}
