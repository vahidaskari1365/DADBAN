import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site";

/**
 * IndexNow — اطلاع‌رسانی سریع صفحات به Bing / Yandex / Seznam.
 *
 * نحوه کار:
 *  1. فایل کلید عمومی: /7d61d30a8c52abee357b96e9661b1e46.txt  (کلید = نام فایل)
 *  2. POST /api/indexnow  { urls: ["/fee-guide", "/lawyers/specialty/keifari", ...] }
 *     با هدر x-cron-secret یا x-admin-secret (گارد داخلی).
 *  3. این endpoint درخواست را به https://api.indexnow.org ارسال می‌کند.
 *
 * برای سابمیت خودکار کل sitemap: { urls: "sitemap" } بفرستید.
 */

const KEY = "7d61d30a8c52abee357b96e9661b1e46";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const admin = process.env.ADMIN_SECRET;
  const h = req.headers.get("x-cron-secret") || req.headers.get("x-admin-secret");
  if (!h) return false;
  return (!!secret && h === secret) || (!!admin && h === admin);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST { urls: string[] | \"sitemap\" } with x-cron-secret/x-admin-secret header",
    keyFile: `${SITE_URL}/${KEY}.txt`,
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { urls?: string[] | string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  let paths: string[] = [];
  if (body.urls === "sitemap") {
    // کل sitemap را می‌خوانیم و آدرس‌ها را استخراج می‌کنیم
    try {
      const origin = new URL(req.url).origin;
      const res = await fetch(`${origin}/sitemap.xml`, { cache: "no-store" });
      const xml = await res.text();
      paths = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
    } catch {
      return NextResponse.json({ ok: false, error: "sitemap fetch failed" }, { status: 502 });
    }
  } else if (Array.isArray(body.urls)) {
    paths = body.urls.filter((u) => typeof u === "string" && u.startsWith("/"));
  }

  if (!paths.length) {
    return NextResponse.json({ ok: false, error: "no valid urls" }, { status: 400 });
  }

  const urls = paths
    .slice(0, 10_000) // سقف IndexNow
    .map((p) => (p.startsWith("http") ? p : `${SITE_URL}${p}`));

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key: KEY,
        keyLocation: `${SITE_URL}/${KEY}.txt`,
        urlList: urls,
      }),
      cache: "no-store",
    });
    return NextResponse.json({ ok: res.ok || res.status === 202, status: res.status, submitted: urls.length });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
