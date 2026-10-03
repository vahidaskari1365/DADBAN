import { NextResponse } from "next/server";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db, isDbConfigured } from "@/db";
import { consultationSignals } from "@/db/schema";
import { ensureSignalSchema } from "@/lib/auto-seed";
import { rateLimit, readJson, text } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * سیگنالینگ مشاوره زنده بدون WebSocket — سازگار با Vercel serverless.
 *
 * GET  ?room=X&since=N   → پیام‌های اتاق با شناسه بزرگ‌تر از N (poll هر ~۱.۲ ثانیه)
 * POST {room, clientId, sender, kind, payload} → درج پیام جدید
 *
 * kind: join | offer | answer | ice | chat | typing | leave
 * پاک‌سازی خودکار: سیگنال‌ها ۱۰ دقیقه، چت‌ها ۲۴ ساعت.
 *
 * fallback درون‌حافظه‌ای برای dev محلی بدون دیتابیس (تک‌پروسسه‌ای) تا تست ممکن باشد.
 */

/* ─── fallback درون‌حافظه (فقط dev بدون دیتابیس) ───────────────────────── */
type MemRow = { id: number; room: string; clientId: string; sender: string; kind: string; payload: string; createdAt: Date };
const mem = { seq: 0, rows: [] as MemRow[] };

function memInsert(r: Omit<MemRow, "id" | "createdAt">): MemRow {
  const row: MemRow = { ...r, id: ++mem.seq, createdAt: new Date() };
  mem.rows.push(row);
  // نگهداری حداکثر ۵۰۰ ردیف
  if (mem.rows.length > 500) mem.rows = mem.rows.slice(-500);
  return row;
}

function memList(room: string, since: number): MemRow[] {
  const cutoff = new Date(Date.now() - 10 * 60_000);
  mem.rows = mem.rows.filter((r) => r.createdAt > cutoff);
  return mem.rows.filter((r) => r.room === room && r.id > since);
}

const ROOM_RE = /^[^\s<>&"'\\\/]{3,64}$/;
const KINDS = new Set(["join", "offer", "answer", "ice", "chat", "typing", "leave"]);

async function insertSignal(row: { room: string; clientId: string; sender: string; kind: string; payload: string }): Promise<number> {
  if (!isDbConfigured()) {
    // dev محلی بدون دیتابیس → حافظه
    return memInsert(row).id;
  }
  try {
    const [created] = await db
      .insert(consultationSignals)
      .values({ room: row.room, clientId: row.clientId, sender: row.sender, kind: row.kind, payload: row.payload })
      .returning({ id: consultationSignals.id });
    if (!created) throw new Error("no returning row");
    return created.id;
  } catch {
    // خطای لحظه‌ای دیتابیس → حافظه
    return memInsert(row).id;
  }
}

async function listSignals(room: string, since: number) {
  if (!isDbConfigured()) {
    // dev محلی → حافظه
    return memList(room, since).map((r) => ({
      id: r.id,
      clientId: r.clientId,
      sender: r.sender,
      kind: r.kind,
      payload: r.payload,
      createdAt: r.createdAt,
    }));
  }
  try {
    return await db
      .select({
        id: consultationSignals.id,
        clientId: consultationSignals.clientId,
        sender: consultationSignals.sender,
        kind: consultationSignals.kind,
        payload: consultationSignals.payload,
        createdAt: consultationSignals.createdAt,
      })
      .from(consultationSignals)
      .where(and(eq(consultationSignals.room, room), gt(consultationSignals.id, since)))
      .orderBy(asc(consultationSignals.id))
      .limit(200);
  } catch {
    // خطای لحظه‌ای دیتابیس → حافظه
    return memList(room, since).map((r) => ({
      id: r.id,
      clientId: r.clientId,
      sender: r.sender,
      kind: r.kind,
      payload: r.payload,
      createdAt: r.createdAt,
    }));
  }
}

async function cleanup() {
  try {
    await db.delete(consultationSignals).where(
      sql`(${consultationSignals.kind} = 'chat' AND ${consultationSignals.createdAt} < now() - interval '24 hours') OR (${consultationSignals.kind} <> 'chat' AND ${consultationSignals.createdAt} < now() - interval '10 minutes')`,
    );
  } catch {
    /* best-effort */
  }
}

export async function GET(req: Request) {
  const limited = rateLimit(req, "signal-get", 240, 60_000);
  if (limited) return limited;

  const url = new URL(req.url);
  const room = (url.searchParams.get("room") ?? "").trim();
  const since = Number(url.searchParams.get("since") ?? "0");
  if (!ROOM_RE.test(room) || !Number.isFinite(since) || since < 0) {
    return NextResponse.json({ ok: false, error: "کد مشاوره نامعتبر است." }, { status: 422 });
  }

  try {
    const rows = await listSignals(room, Math.floor(since));
    return NextResponse.json({
      ok: true,
      signals: rows.map((r) => ({
        id: r.id,
        clientId: r.clientId,
        sender: r.sender,
        kind: r.kind,
        payload: r.payload ? (safeParse(r.payload) ?? r.payload) : "",
        at: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "signal-post", 240, 60_000);
  if (limited) return limited;

  const body = await readJson(req, 32_768);
  const room = text(body?.room, 64)?.trim() ?? "";
  const clientId = text(body?.clientId, 64)?.trim() ?? "";
  const sender = text(body?.sender, 80)?.trim() ?? "";
  const kind = text(body?.kind, 16)?.trim() ?? "";
  const payload = typeof body?.payload === "string" ? body.payload.slice(0, 24_000) : body?.payload != null ? JSON.stringify(body.payload).slice(0, 24_000) : "";

  if (!ROOM_RE.test(room) || !clientId || !sender || !KINDS.has(kind)) {
    return NextResponse.json({ ok: false, error: "اطلاعات سیگنال نامعتبر است." }, { status: 422 });
  }

  try {
    void cleanup(); // best-effort — منتظر نمی‌مانیم
    await ensureSignalSchema();
    const id = await insertSignal({ room, clientId, sender, kind, payload });
    return NextResponse.json({ ok: true, id });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
