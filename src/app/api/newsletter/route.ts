import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { desc } from "drizzle-orm";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { isAdmin } from "@/lib/admin-auth";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { formatJalaliDateTime } from "@/lib/jalali";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** اعتبارسنجی سادهٔ ایمیل — همان قاعدهٔ ثبت‌نام (بدون سخت‌گیری بیش از حد). */
const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/newsletter — عضویت در خبرنامهٔ دادورزان.
 * صداقت: عضویت تکراری هم «موفق» است (idempotent) — پیام یکسان، بدون افشای وضعیت قبلی.
 * بدون دیتابیس (noop) → 503 صادقانه، نه موفقیت ساختگی.
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "newsletter-subscribe", 5, 60 * 60_000);
  if (limited) return limited;

  const body = await readJson(req, 2_048);
  const email = text(body?.email, 254)?.toLowerCase() ?? "";
  if (!emailOk.test(email)) {
    return NextResponse.json({ ok: false, error: "لطفاً یک ایمیل معتبر وارد کنید." }, { status: 422 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "ثبت خبرنامه موقتاً در دسترس نیست." }, { status: 503 });
  }

  try {
    await ensureExtendedSchema();
    await db
      .insert(newsletterSubscribers)
      .values({ email })
      .onConflictDoNothing({ target: newsletterSubscribers.email });
    // insert یا از قبل موجود — در هر دو حالت عضو خبرنامه است؛ پیام یکسان و صادقانه.
    return NextResponse.json({ ok: true, message: "ایمیل شما در خبرنامهٔ دادورزان ثبت شد." });
  } catch {
    return NextResponse.json({ ok: false, error: "ثبت خبرنامه موقتاً در دسترس نیست." }, { status: 503 });
  }
}

/**
 * GET /api/newsletter?export=csv — خروجی CSV اعضای خبرنامه (فقط ادمین).
 * پاسخ: فایل UTF-8 (با BOM برای اکسل فارسی) شامل ایمیل + تاریخ عضویت (میلادی ISO + شمسی).
 */
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const sp = new URL(req.url).searchParams;
  if (sp.get("export") !== "csv") {
    return NextResponse.json({ ok: false, error: "unsupported" }, { status: 400 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 503 });
  }

  try {
    await ensureExtendedSchema();
    const rows = await db
      .select({ email: newsletterSubscribers.email, createdAt: newsletterSubscribers.createdAt })
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.createdAt))
      .limit(10_000);

    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = ["email,created_at_iso,created_at_jalali"];
    for (const r of rows) {
      const iso = r.createdAt instanceof Date ? r.createdAt.toISOString() : "";
      lines.push([esc(r.email), esc(iso), esc(iso ? formatJalaliDateTime(iso) : "")].join(","));
    }
    const csv = "\uFEFF" + lines.join("\r\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dadban-newsletter-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 503 });
  }
}
