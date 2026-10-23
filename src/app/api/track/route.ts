import { NextResponse } from "next/server";
import { db } from "@/db";
import { pageViews, events, pageViewDaily, visitorDaily } from "@/db/schema";
import { sql } from "drizzle-orm";
import { EVENTS } from "@/lib/analytics";
import { tehranDay } from "@/lib/visit-analytics";
import { rateLimit, readJson } from "@/lib/api-security";

export const dynamic = "force-dynamic";

const allowedEvents = new Set<string>(EVENTS);

/** ربات‌ها و ابزارهای مانیتورینگ در آمار واقعی بازدید حساب نمی‌شوند */
const BOT_RE = /bot|crawl|spider|slurp|lighthouse|headless|preview|uptime|pingdom|sitecheck/i;

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return part.slice(idx + 1).trim();
      }
    }
  }
  return null;
}

/**
 * POST /api/track
 *  - { path }              → صفحه‌نما: تجمیع کل (page_views) + تجمیع روزانه به وقت تهران
 *                            (page_view_daily) + بازدیدکنندهٔ یکتای روز (visitor_daily با کوکی dvid)
 *  - { event, path }       → رویداد قیف در `events` (بدون PII)
 * ربات‌ها شمرده نمی‌شوند؛ هیچ‌کدام از این نوشتن‌ها هرگز نباید UX را بشکنند.
 */
export async function POST(req: Request) {
  try {
    // سخت‌سازی: انباشت جعلی آمار — نرخ‌سنجی + سقف بایت استریمی (قبلاً بدون هر دو بود)
    const limited = rateLimit(req, "track", 120, 60_000);
    if (limited) return limited;
    const body = (await readJson(req, 2_048)) ?? {};
    const path = String(body?.path ?? "").slice(0, 300);
    const eventName = String(body?.event ?? "");
    const ua = (req.headers.get("user-agent") ?? "").slice(0, 200);
    const isBot = !ua || BOT_RE.test(ua);

    if (eventName) {
      if (!allowedEvents.has(eventName)) {
        return NextResponse.json({ ok: false }, { status: 422 });
      }
      await db.insert(events).values({ event: eventName, path });
      return NextResponse.json({ ok: true });
    }

    if (!path || path.startsWith("/api") || path.startsWith("/admin")) {
      return NextResponse.json({ ok: false });
    }

    const day = tehranDay();
    const res = NextResponse.json({ ok: true });

    if (isBot) return res;

    /* ۱) شمارندهٔ تجمعی هر صفحه (سازگاری با آمار قبلی) */
    await db
      .insert(pageViews)
      .values({ path, views: 1 })
      .onConflictDoUpdate({
        target: pageViews.path,
        set: { views: sql`${pageViews.views} + 1`, lastSeen: sql`now()` },
      });

    /* ۲) تجمیع روزانهٔ هر صفحه — مبنای «گزارش بازدید روزانه» پنل مدیریت */
    await db
      .insert(pageViewDaily)
      .values({ path, day, views: 1 })
      .onConflictDoUpdate({
        target: [pageViewDaily.path, pageViewDaily.day],
        set: { views: sql`${pageViewDaily.views} + 1` },
      });

    /* ۳) بازدیدکنندهٔ یکتای روز — کوکی ناشناس dvid (بدون PII، تصادفی) */
    const raw = readCookie(req, "dvid");
    const vid = raw && /^[a-f0-9-]{8,64}$/i.test(raw) ? raw : crypto.randomUUID();
    const fresh = raw !== vid;
    await db
      .insert(visitorDaily)
      .values({ day, visitor: vid, hits: 1, lastPath: path, userAgent: ua })
      .onConflictDoUpdate({
        target: [visitorDaily.day, visitorDaily.visitor],
        set: { hits: sql`${visitorDaily.hits} + 1`, lastPath: path, lastSeen: sql`now()` },
      });
    if (fresh) {
      res.cookies.set("dvid", vid, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
    }

    return res;
  } catch {
    return NextResponse.json({ ok: false });
  }
}
