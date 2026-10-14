import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { LOCATIONS } from "@/lib/data";
import { askLLM } from "@/lib/llm";
import { rateLimit } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * پیشنهاد هوشمند «وکیل کارمندان»:
 * کارمند مشکلش را می‌نویسد و بر اساس آن، از میان وکلایی که در ثبت‌نام
 * حوزه «وکیل کارمندان» (تخصص کار) را انتخاب کرده‌اند، بهترین‌ها رتبه‌بندی می‌شوند.
 * اگر LLM در دسترس نبود، به‌صورت fallback بر اساس امتیاز و تجربه رتبه‌بندی می‌کنیم.
 */

interface MatchItem {
  slug: string;
  reason: string;
}

export async function POST(req: Request) {
  try {
    // سقف مصرف LLM — تنها مسیر AI بدون rate-limit بود (بردار هزینه‌سوز)
    const limited = rateLimit(req, "emp-match", 15, 60 * 60_000);
    if (limited) return limited;

    const body = await req.json().catch(() => ({} as any));
    const problem =
      typeof body?.problem === "string" ? body.problem.trim().slice(0, 800) : "";
    const province =
      typeof body?.province === "string" ? body.province.trim().slice(0, 50) : "";

    if (problem.length < 5) {
      return NextResponse.json(
        { ok: false, error: "متن مشکل خیلی کوتاه است." },
        { status: 400 },
      );
    }

    // استخر فقط وکلایی که «کار» (وکیل کارمندان) را در ثبت‌نام انتخاب کرده‌اند
    const prov = province ? LOCATIONS.find((l) => l.province === province) : null;

    let pool: {
      slug: string;
      name: string;
      city: string;
      specialties: string[] | null;
      experienceYears: number | null;
      rating: number | null;
      caseCount: number | null;
    }[] = [];
    try {
      pool = await db
        .select({
          slug: lawyers.slug,
          name: lawyers.name,
          city: lawyers.city,
          specialties: lawyers.specialties,
          experienceYears: lawyers.experienceYears,
          rating: lawyers.rating,
          caseCount: lawyers.caseCount,
        })
        .from(lawyers)
        .where(sql`${lawyers.specialties} @> ARRAY[${"کار"}]::text[]`)
        .orderBy(desc(lawyers.rating));
      // فیلتر استان در سطح اپلیکیشن — پایدارتر از inArray روی استخر کوچک
      if (prov) pool = pool.filter((p) => prov.cities.includes(p.city));
    } catch (err) {
      console.error("[employee-lawyer-match] pool query failed:", err);
    }

    if (pool.length === 0) {
      return NextResponse.json({ ok: true, matches: [] as MatchItem[], fallback: true });
    }

    // تلاش برای پیشنهاد هوشمند با موتور LLM چند-تأمین‌کننده‌ی دادورزان
    try {
      const raw = (await askLLM(
        [
          {
            role: "user",
            content: `مشکل کارمند: ${problem}\n\nوکلای موجود (فقط از این لیست انتخاب کن):\n${JSON.stringify(
              pool.map((p) => ({
                slug: p.slug,
                name: p.name,
                city: p.city,
                specialties: p.specialties,
                experienceYears: p.experienceYears,
                rating: p.rating,
                caseCount: p.caseCount,
              })),
            )}`,
          },
        ],
        500,
        "تو کارشناس حقوق کار و تأمین اجتماعی پلتفرم دادورزان هستی. کارمند، مشکل خودش را می‌گوید و تو از بین فهرست وکلای «وکیل کارمندان»، حداکثر ۳ وکیل مناسب را به ترتیب بهترین انتخاب می‌کنی. دلیل هر انتخاب یک جمله کوتاه فارسی (حداکثر ۱۲ کلمه) و مخصوص همان مشکل باشد. فقط و فقط JSON معتبر برگردان، بدون هیچ متن اضافه، در این قالب: [{\"slug\":\"...\",\"reason\":\"...\"}] و slug فقط از فهرست داده‌شده باشد.",
      )) ?? "";
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { slug?: unknown; reason?: unknown }[];
        const valid = parsed
          .filter(
            (x) =>
              x &&
              typeof x.slug === "string" &&
              pool.some((p) => p.slug === x.slug),
          )
          .slice(0, 3)
          .map((x) => ({
            slug: x.slug as string,
            reason:
              typeof x.reason === "string" && x.reason.trim()
                ? x.reason.trim().slice(0, 160)
                : "بر اساس مشکل شما انتخاب شد",
          }));
        if (valid.length > 0) {
          return NextResponse.json({ ok: true, matches: valid });
        }
      }
    } catch (err) {
      console.error("[employee-lawyer-match] llm failed:", err);
    }

    // Fallback — بالاترین امتیاز و تجربه از همان استخر
    const fallback: MatchItem[] = pool.slice(0, 3).map((p) => ({
      slug: p.slug,
      reason: `امتیاز ${p.rating ?? "—"} و ${p.experienceYears ?? "—"} سال تجربه در حقوق کار`,
    }));
    return NextResponse.json({ ok: true, matches: fallback, fallback: true });
  } catch (err) {
    console.error("[employee-lawyer-match] fatal:", err);
    return NextResponse.json(
      { ok: false, error: "خطای غیرمنتظره در پیشنهاد وکیل." },
      { status: 500 },
    );
  }
}
