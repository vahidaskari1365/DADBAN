import { NextResponse } from "next/server";
import { db } from "@/db";
import { articles, lawyers } from "@/db/schema";
import { asc } from "drizzle-orm";
import { tdyn, tdynLong } from "@/lib/i18n/dynamic";
import type { Locale } from "@/lib/i18n/core";

/**
 * گرم‌کردن کش ترجمهٔ محتوای پویا (content_translations) — یک‌بار پس از استقرار
 * اجرا می‌شود تا بازدید اول هر صفحه در زبان‌های غیر فارسی هم سریع باشد.
 *
 * محافظت: پارامتر key باید با I18N_WARM_KEY (یا کلید پیش‌فرض مستند) برابر باشد.
 * مصرف:  GET /api/i18n/warm?key=…&what=articles&locale=en&offset=0&limit=1
 *        GET /api/i18n/warm?key=…&what=lawyers&locale=ar&offset=0&limit=50
 * پاسخ JSON شمارش ترجمه‌های انجام‌شده را برمی‌گرداند؛ فراخوانی‌کننده با loop
 * offset را جلو می‌برد تا «done:false» یعنی تمام شد.
 */

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const DEFAULT_KEY = "dadban-i18n-warm-7f3a2b9c14d5";

const isWarmLocale = (v: string | null): v is Exclude<Locale, "fa"> =>
  v === "en" || v === "ar" || v === "tr" || v === "zh";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  if (key !== (process.env.I18N_WARM_KEY || DEFAULT_KEY)) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }
  const localeParam = url.searchParams.get("locale");
  if (!isWarmLocale(localeParam)) {
    return NextResponse.json({ ok: false, error: "locale must be en|ar|tr|zh" }, { status: 400 });
  }
  const locale = localeParam;
  const what = url.searchParams.get("what") === "lawyers" ? "lawyers" : "articles";
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);
  const limit = Math.min(10, Math.max(1, Number(url.searchParams.get("limit") ?? "1") || 1));

  const t0 = Date.now();
  try {
    if (what === "articles") {
      const rows = await db.select().from(articles).orderBy(asc(articles.id)).limit(limit).offset(offset);
      let fields = 0;
      for (const a of rows) {
        await Promise.all([
          tdyn(locale, a.title, 400),
          tdyn(locale, a.category, 200),
          tdyn(locale, a.excerpt, 800),
          tdyn(locale, a.quickAnswer ?? "", 800),
          a.imageAlt ? tdyn(locale, a.imageAlt, 300) : Promise.resolve(null),
          tdyn(locale, a.author, 300),
          tdyn(locale, a.authorRole, 300),
        ]);
        fields += 7;
        // faq
        try {
          const faqItems = JSON.parse(a.faq || "[]") as { q: string; a: string }[];
          await Promise.all(faqItems.flatMap((f) => [tdyn(locale, f.q, 400), tdyn(locale, f.a, 900)]));
          fields += faqItems.length * 2;
        } catch {
          /* faq خراب → رد */
        }
        // محتوای کامل (قطعه‌قطعه)
        await tdynLong(locale, a.content);
        fields += 1;
      }
      return NextResponse.json({
        ok: true, what, locale, offset, processed: rows.length, fields,
        done: rows.length < limit, ms: Date.now() - t0,
      });
    }

    // lawyers
    const rows = await db.select().from(lawyers).orderBy(asc(lawyers.id)).limit(limit).offset(offset);
    let fields = 0;
    for (const l of rows) {
      await Promise.all([
        tdyn(locale, l.name, 300),
        tdyn(locale, l.title, 300),
        tdyn(locale, l.city, 200),
        tdyn(locale, l.province, 200),
        l.bio ? tdyn(locale, l.bio, 900) : Promise.resolve(null),
      ]);
      fields += 5;
      for (const s of l.specialties ?? []) {
        await tdyn(locale, s, 200);
        fields += 1;
      }
      for (const s of l.services ?? []) {
        await tdyn(locale, s, 200);
        fields += 1;
      }
    }
    return NextResponse.json({
      ok: true, what, locale, offset, processed: rows.length, fields,
      done: rows.length < limit, ms: Date.now() - t0,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "warm failed", ms: Date.now() - t0 },
      { status: 500 },
    );
  }
}
