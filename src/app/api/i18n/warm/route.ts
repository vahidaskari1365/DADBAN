import { NextResponse } from "next/server";
import { db } from "@/db";
import { articles, lawyers } from "@/db/schema";
import { asc } from "drizzle-orm";
import { tdyn, splitChunks } from "@/lib/i18n/dynamic";
import type { Locale } from "@/lib/i18n/core";

/**
 * گرم‌کردن کش ترجمهٔ محتوای پویا (content_translations) — یک‌بار پس از استقرار.
 * محدودیت سختِ ۶۰ ثانیه‌ای Vercel → هر فراخوانی باید کوچک باشد:
 *   what=lawyers  &fields=one   → فقط ۱ وکیل، همهٔ فیلدهای موازی
 *   what=articles &fields=meta  → فیلدهای کوتاه مقاله (موازی، سریع)
 *   what=articles &fields=faq   → پرسش‌های متداول
 *   what=articles &fields=content&part=0..N-1 → ۲ قطعهٔ محتوا در هر فراخوانی
 * پاسخ شمارنده‌ها و «done» را می‌دهد تا فراخوانی‌کننده loop بزند.
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
  const fields = url.searchParams.get("fields") ?? "meta";
  const part = Math.max(0, Number(url.searchParams.get("part") ?? "0") || 0);
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);
  const t0 = Date.now();

  try {
    if (what === "lawyers") {
      const rows = await db.select().from(lawyers).orderBy(asc(lawyers.id)).limit(1).offset(offset);
      if (!rows[0]) return NextResponse.json({ ok: true, done: true, processed: 0 });
      const l = rows[0];
      await Promise.all([
        tdyn(locale, l.name, 300),
        tdyn(locale, l.title, 300),
        tdyn(locale, l.city, 200),
        tdyn(locale, l.province, 200),
        l.bio ? tdyn(locale, l.bio, 900) : Promise.resolve(null),
        ...(l.specialties ?? []).map((s) => tdyn(locale, s, 200)),
        ...(l.services ?? []).map((s) => tdyn(locale, s, 200)),
      ]);
      return NextResponse.json({
        ok: true, what, locale, offset, processed: 1,
        fields: 5 + (l.specialties?.length ?? 0) + (l.services?.length ?? 0),
        done: false, ms: Date.now() - t0,
      });
    }

    // articles
    const rows = await db.select().from(articles).orderBy(asc(articles.id)).limit(1).offset(offset);
    if (!rows[0]) return NextResponse.json({ ok: true, done: true, processed: 0 });
    const a = rows[0];

    if (fields === "meta") {
      await Promise.all([
        tdyn(locale, a.title, 400),
        tdyn(locale, a.category, 200),
        tdyn(locale, a.excerpt, 800),
        tdyn(locale, a.quickAnswer ?? "", 800),
        a.imageAlt ? tdyn(locale, a.imageAlt, 300) : Promise.resolve(null),
        tdyn(locale, a.author, 300),
        tdyn(locale, a.authorRole, 300),
      ]);
      return NextResponse.json({ ok: true, what, locale, fields: "meta", offset, processed: 1, done: false, ms: Date.now() - t0 });
    }

    if (fields === "faq") {
      try {
        const faqItems = JSON.parse(a.faq || "[]") as { q: string; a: string }[];
        await Promise.all(faqItems.flatMap((f) => [tdyn(locale, f.q, 400), tdyn(locale, f.a, 900)]));
        return NextResponse.json({ ok: true, what, locale, fields: "faq", offset, processed: faqItems.length * 2, done: false, ms: Date.now() - t0 });
      } catch {
        return NextResponse.json({ ok: true, what, locale, fields: "faq", offset, processed: 0, done: false, ms: Date.now() - t0 });
      }
    }

    // content — ۲ قطعه در هر فراخوانی
    const chunks = splitChunks(a.content);
    const parts = Math.ceil(chunks.length / 2);
    if (part >= parts) {
      return NextResponse.json({ ok: true, what, locale, fields: "content", offset, processed: 0, chunks: chunks.length, parts, done: true, ms: Date.now() - t0 });
    }
    const slice = chunks.slice(part * 2, part * 2 + 2);
    await Promise.all(slice.map((c) => tdyn(locale, c, 2200)));
    return NextResponse.json({
      ok: true, what, locale, fields: "content", offset, part,
      processed: slice.length, chunks: chunks.length, parts,
      done: false, ms: Date.now() - t0,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "warm failed", ms: Date.now() - t0 },
      { status: 500 },
    );
  }
}
