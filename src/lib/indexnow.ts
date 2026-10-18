import { SITE_URL } from "@/lib/site";

/**
 * IndexNow — اطلاع‌رسانی فوری صفحات به Bing / Yandex / Seznam / Naver.
 *
 * کلید عمومی: فایل /<KEY>.txt در روت سایت (public/) — محتوا باید دقیقاً خود کلید باشد.
 * سابمیت به endpoint مشترک api.indexnow.org انجام می‌شود؛ 200/202 یعنی پذیرفته شد.
 *
 * best-effort است: خطای شبکه یا 403 (کش نشدن کلید) هرگز نباید جریان اصلی
 * (انتشار مقاله و…) را بشکند؛ فقط وضعیت را گزارش می‌کنیم.
 */

/**
 * کلید رسمی IndexNow — گرفته‌شده از پنل Bing Webmaster Tools (کاربر).
 * برای اینکه آمار سابمیت در پنل BWT خود کاربر دیده شود، باید از همان کلیدی
 * استفاده شود که Bing در UI تولید کرده است.
 */
export const INDEXNOW_KEY = "a45bb99f393b45e9b26fd44e23bb561b";

export function indexNowKeyUrl(): string {
  return `${SITE_URL}/${INDEXNOW_KEY}.txt`;
}

export type IndexNowResult = {
  ok: boolean;
  status?: number;
  error?: string;
  submitted: number;
};

/** سابمیت مستقیم به IndexNow — آدرس‌های کامل یا مسیرهای نسبی می‌پذیرد. */
export async function submitIndexNow(paths: string[]): Promise<IndexNowResult> {
  const urls = paths
    .filter((p) => typeof p === "string" && (p.startsWith("/") || p.startsWith("http")))
    .slice(0, 10_000) // سقف IndexNow
    .map((p) => (p.startsWith("http") ? p : `${SITE_URL}${p}`));

  if (!urls.length) return { ok: false, error: "no valid urls", submitted: 0 };

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key: INDEXNOW_KEY,
        keyLocation: indexNowKeyUrl(),
        urlList: urls,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return { ok: res.ok || res.status === 202, status: res.status, submitted: urls.length };
  } catch (err) {
    return { ok: false, error: String(err), submitted: urls.length };
  }
}

/** خواندن sitemap و سابمیت همهٔ URLها — برای سابمیت انبوه دوره‌ای. */
export async function submitSitemapIndexNow(origin: string): Promise<IndexNowResult> {
  try {
    const res = await fetch(`${origin}/sitemap.xml`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const xml = await res.text();
    const paths = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
    return submitIndexNow(paths);
  } catch (err) {
    return { ok: false, error: `sitemap fetch failed: ${String(err)}`, submitted: 0 };
  }
}
