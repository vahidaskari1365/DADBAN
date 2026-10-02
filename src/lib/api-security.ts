import { NextResponse } from "next/server";

/** Process-local fallback. Replace with a shared store (e.g. Redis) when horizontally scaling. */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
export function rateLimit(req: Request, scope: string, limit: number, windowMs: number, identifier = ""): NextResponse | null {
  const now = Date.now();
  const key = `${scope}:${clientIp(req)}:${identifier.slice(0, 128)}`;
  const item = buckets.get(key);
  if (!item || item.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + windowMs });
  else { item.count += 1; if (item.count > limit) return NextResponse.json({ ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید." }, { status: 429, headers: { "Retry-After": String(Math.ceil((item.resetAt - now) / 1000)) } }); }
  return null;
}
export async function readJson(req: Request, maxBytes = 32_768): Promise<Record<string, unknown> | null> {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > maxBytes) return null;
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try { const value: unknown = JSON.parse(text); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; } catch { return null; }
}
export const phone = (value: unknown) => String(value ?? "").trim().replace(/[^\d]/g, "");
export const validPhone = (value: string) => /^0?9\d{9}$/.test(value);
export const text = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
export const publicError = () => NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
