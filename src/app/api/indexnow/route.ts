import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { indexNowKeyUrl, submitIndexNow, submitSitemapIndexNow } from "@/lib/indexnow";

/**
 * IndexNow — اطلاع‌رسانی سریع صفحات به Bing / Yandex / Seznam.
 *
 * نحوه کار:
 *  1. فایل کلید عمومی: /a45bb99f393b45e9b26fd44e23bb561b.txt  (کلید رسمی از پنل Bing Webmaster)
 *  2. POST /api/indexnow  { urls: ["/fee-guide", "/lawyers/specialty/keifari", ...] }
 *     با هدر x-cron-secret یا x-admin-secret یا نشست ادمین (گارد داخلی).
 *  3. این endpoint درخواست را به https://api.indexnow.org ارسال می‌کند.
 *
 * برای سابمیت خودکار کل sitemap: { urls: "sitemap" } بفرستید.
 * منطق مشترک در src/lib/indexnow.ts است (article-sync بعد از انتشار مقاله هم ping می‌زند).
 */

async function authorized(req: Request): Promise<boolean> {
  const h = req.headers.get("x-cron-secret") || req.headers.get("x-admin-secret");
  if (h) {
    const secret = process.env.CRON_SECRET;
    const admin = process.env.ADMIN_SECRET;
    return (!!secret && h === secret) || (!!admin && h === admin);
  }
  // نشست معتبر پنل ادمین هم پذیرفته می‌شود — برای انتشار دستی از پنل
  try {
    return await isAdmin();
  } catch {
    return false;
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST { urls: string[] | \"sitemap\" } with x-cron-secret/x-admin-secret header or admin session",
    keyFile: indexNowKeyUrl(),
  });
}

export async function POST(req: Request) {
  if (!(await authorized(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { urls?: string[] | string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  if (body.urls === "sitemap") {
    const result = await submitSitemapIndexNow(new URL(req.url).origin);
    return NextResponse.json({ ok: result.ok, status: result.status, submitted: result.submitted, error: result.error });
  }

  const result = await submitIndexNow(Array.isArray(body.urls) ? body.urls : []);
  return NextResponse.json(
    { ok: result.ok, status: result.status, submitted: result.submitted, error: result.error },
    { status: result.ok ? 200 : result.error === "no valid urls" ? 400 : 200 },
  );
}
