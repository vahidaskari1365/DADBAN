import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { lawyerPresence } from "@/db/schema";
import { ensureConsultSchema } from "@/lib/auto-seed";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * حضور واقعی وکلا (آنلاین/آفلاین) — بدون WebSocket، سازگار با Vercel serverless.
 *
 * GET  → لیست وکلای آنلاین (state=online و lastPingAt تا ۷۵ ثانیه قبل)
 * POST → ثبت heartbeat / ورود / خروج وکیل: { slug, name, state }
 *
 * وکیل با باز کردن پنل خود در /consultation/live هر ۳۰ ثانیه heartbeat می‌فرستد؛
 * بستن پنل یا نبود heartbeat یعنی آفلاین.
 */

/** fallback درون‌حافظه برای dev محلی بدون دیتابیس */
const memPresence = new Map<string, { name: string; state: string; lastPing: number }>();

export async function GET() {
  if (!isDbConfigured()) {
    const now = Date.now();
    const online = [...memPresence.entries()]
      .filter(([, v]) => v.state === "online" && now - v.lastPing < 75_000)
      .map(([slug]) => slug);
    return NextResponse.json({ ok: true, online, ts: now });
  }
  try {
    await ensureConsultSchema();
    const rows = await db
      .select({ slug: lawyerPresence.slug })
      .from(lawyerPresence)
      .where(
        sql`${lawyerPresence.state} = 'online' AND ${lawyerPresence.lastPingAt} > now() - interval '75 seconds'`,
      );
    return NextResponse.json({ ok: true, online: rows.map((r) => r.slug), ts: Date.now() });
  } catch {
    return NextResponse.json({ ok: true, online: [], ts: Date.now() });
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "presence-post", 60, 60_000);
  if (limited) return limited;

  const data = await readJson(req, 2_048);
  if (!data) {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر است." }, { status: 400 });
  }
  const slug = text(data.slug, 64);
  const name = text(data.name, 120) ?? "";
  const state = data.state === "offline" ? "offline" : "online";
  if (!slug) {
    return NextResponse.json({ ok: false, error: "شناسه وکیل الزامی است." }, { status: 400 });
  }

  if (!isDbConfigured()) {
    memPresence.set(slug, { name, state, lastPing: Date.now() });
    return NextResponse.json({ ok: true });
  }
  try {
    await ensureConsultSchema();
    await db
      .insert(lawyerPresence)
      .values({ slug, name, state, lastPingAt: new Date() })
      .onConflictDoUpdate({
        target: lawyerPresence.slug,
        set: { name, state, lastPingAt: new Date() },
      });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
