import { NextResponse } from "next/server";

/** Process-local fallback. Replace with a shared store (e.g. Redis) when horizontally scaling. */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * IP کلاینت — آخرین عضو X-Forwarded-For مبناست (نزدیک‌ترین پروکسی به سرور)،
 * نه اولین عضو؛ چون مهاجم می‌تواند عضوهای ابتدای زنجیره را جعل کند و با
 * هدر چرخان از نرخ‌سنجی عبور کند. پروکسی معتمد (caddy/nginx) عضو انتهایی را
 * اضافه می‌کند. اگر XFF نبود، x-real-ip و در نهایت "unknown".
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return req.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(req: Request, scope: string, limit: number, windowMs: number, identifier = ""): NextResponse | null {
  const now = Date.now();
  const key = `${scope}:${clientIp(req)}:${identifier.slice(0, 128)}`;
  const item = buckets.get(key);
  if (!item || item.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + windowMs });
  else { item.count += 1; if (item.count > limit) return NextResponse.json({ ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید." }, { status: 429, headers: { "Retry-After": String(Math.ceil((item.resetAt - now) / 1000)) } }); }
  return null;
}

/**
 * خواندن JSON با سقف بایتِ واقعی روی استریم (نه فقط content-length اعلامی).
 * قبلاً کل بدنه بافر می‌شد و بعد چک می‌شد → بدنهٔ chunked بی‌نهایت حافظه می‌گرفت (DoS).
 */
export async function readJson(req: Request, maxBytes = 32_768): Promise<Record<string, unknown> | null> {
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > maxBytes) return null;
  let raw: string;
  if (req.body && typeof req.body.getReader === "function") {
    const reader = req.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    let text = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          try { await reader.cancel(); } catch { /* ignore */ }
          return null;
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } catch {
      return null;
    }
    if (text.length > maxBytes) return null;
    raw = text;
  } else {
    try { raw = await req.text(); } catch { return null; }
    if (raw.length > maxBytes) return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

/**
 * گارد CSRF سبک و سراسری (Origin / Sec-Fetch-Site):
 *  - درخواست‌های cross-site مرورگر (فرم/فچ سایت دیگر) رد می‌شوند؛
 *  - درخواست‌های same-origin/same-site و بدون Origin (curl/سرور-به-سرور) رد می‌شوند نه؛
 *    همان‌ها عبور می‌کنند — نرخ‌سنجی و احراز هویت لایه‌های بعدی‌اند.
 * کوکی‌های سشن SameSite=Lax هستند؛ این لایه دوم دفاعی برای mutationهای حساس است.
 */
export function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser client
  try {
    const o = new URL(origin);
    const host = req.headers.get("host");
    return !!host && o.host === host;
  } catch {
    return false;
  }
}

/** null = مجاز؛ NextResponse = رد (403) */
export function originGuard(req: Request): NextResponse | null {
  if (sameOrigin(req)) return null;
  return NextResponse.json({ ok: false, error: "درخواست بین‌دامنه‌ای مجاز نیست." }, { status: 403 });
}

export const phone = (value: unknown) => String(value ?? "").trim().replace(/[^\d]/g, "");
export const validPhone = (value: string) => /^0?9\d{9}$/.test(value);
export const text = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
export const publicError = () => NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
