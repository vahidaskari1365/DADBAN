import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { consultMessages } from "@/db/schema";
import { ensureConsultSchema } from "@/lib/auto-seed";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { and, asc, desc, eq, gt, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * گفتگوی متنی ماندگار موکل ↔ وکیل — بدون WebSocket (HTTP polling، سازگار با Vercel).
 *
 * POST { roomId, lawyerSlug, role, name, body } → ثبت پیام (حتی وقتی وکیل آفلاین است)
 * GET  ?roomId=…&since=N       → پیام‌های اتاق بعد از N (poll هر ~۲ ثانیه)
 * GET  ?lawyerSlug=…&threads=1 → صندوق گفتگوهای وکیل (گروه‌بندی بر اساس اتاق)
 */

const ROOM_RE = /^consult-[a-z0-9-]{3,64}$/i;

/** fallback درون‌حافظه برای dev محلی بدون دیتابیس */
const mem = { seq: 0, rows: [] as Array<{ id: number; roomId: string; lawyerSlug: string; sender: string; name: string; body: string; createdAt: Date }> };

function memInsert(row: { roomId: string; lawyerSlug: string; sender: string; name: string; body: string }) {
  const created = { ...row, id: ++mem.seq, createdAt: new Date() };
  mem.rows.push(created);
  if (mem.rows.length > 800) mem.rows = mem.rows.slice(-800);
  return created;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roomId = url.searchParams.get("roomId");
  const lawyerSlug = url.searchParams.get("lawyerSlug");
  const since = Math.max(0, Number(url.searchParams.get("since") ?? 0) || 0);

  if (!isDbConfigured()) {
    if (roomId) {
      const rows = mem.rows
        .filter((r) => r.roomId === roomId && r.id > since)
        .slice(-200)
        .map((r) => ({ id: r.id, sender: r.sender, name: r.name, body: r.body, createdAt: r.createdAt }));
      return NextResponse.json({ ok: true, messages: rows });
    }
    if (lawyerSlug) {
      const mine = mem.rows.filter((r) => r.lawyerSlug === lawyerSlug);
      const byRoom = new Map<string, typeof mine>();
      for (const r of mine) {
        const list = byRoom.get(r.roomId) ?? [];
        list.push(r);
        byRoom.set(r.roomId, list);
      }
      const threads = [...byRoom.entries()]
        .map(([roomId2, list]) => {
          const last = list[list.length - 1];
          const clientMsg = list.find((r) => r.sender === "client");
          return {
            roomId: roomId2,
            clientName: clientMsg?.name ?? last.name,
            lastBody: last.body,
            lastSender: last.sender,
            lastAt: last.createdAt,
            total: list.length,
          };
        })
        .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
        .slice(0, 30);
      return NextResponse.json({ ok: true, threads });
    }
    return NextResponse.json({ ok: true, messages: [], threads: [] });
  }

  try {
    await ensureConsultSchema();

    if (roomId) {
      const rows = await db
        .select({
          id: consultMessages.id,
          sender: consultMessages.sender,
          name: consultMessages.name,
          body: consultMessages.body,
          createdAt: consultMessages.createdAt,
        })
        .from(consultMessages)
        .where(and(eq(consultMessages.roomId, roomId), gt(consultMessages.id, since)))
        .orderBy(asc(consultMessages.id))
        .limit(200);
      return NextResponse.json({ ok: true, messages: rows });
    }

    if (lawyerSlug) {
      const rows = await db
        .select({
          roomId: consultMessages.roomId,
          sender: consultMessages.sender,
          name: consultMessages.name,
          body: consultMessages.body,
          createdAt: consultMessages.createdAt,
        })
        .from(consultMessages)
        .where(eq(consultMessages.lawyerSlug, lawyerSlug))
        .orderBy(desc(consultMessages.id))
        .limit(300);

      const byRoom = new Map<string, typeof rows>();
      for (const r of rows) {
        const list = byRoom.get(r.roomId) ?? [];
        list.push(r);
        byRoom.set(r.roomId, list);
      }
      const threads = [...byRoom.entries()]
        .map(([roomId2, list]) => {
          const last = list[0]; // newest (desc)
          const clientMsg = [...list].reverse().find((r) => r.sender === "client");
          return {
            roomId: roomId2,
            clientName: clientMsg?.name ?? last.name,
            lastBody: last.body,
            lastSender: last.sender,
            lastAt: last.createdAt,
            total: list.length,
          };
        })
        .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
        .slice(0, 30);
      return NextResponse.json({ ok: true, threads });
    }

    return NextResponse.json({ ok: true, messages: [], threads: [] });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "consult-chat", 30, 60_000);
  if (limited) return limited;

  const data = await readJson(req, 8_192);
  if (!data) {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر است." }, { status: 400 });
  }

  const roomId = text(data.roomId, 64);
  const lawyerSlug = text(data.lawyerSlug, 64);
  const name = text(data.name, 60);
  const body = text(data.body, 1_000);
  const sender = data.sender === "lawyer" ? "lawyer" : "client";

  if (!roomId || !ROOM_RE.test(roomId)) {
    return NextResponse.json({ ok: false, error: "شناسه گفتگو نامعتبر است." }, { status: 400 });
  }
  if (!lawyerSlug || !name || !body) {
    return NextResponse.json({ ok: false, error: "نام و متن پیام الزامی است." }, { status: 400 });
  }

  if (!isDbConfigured()) {
    const created = memInsert({ roomId, lawyerSlug, sender, name, body });
    return NextResponse.json({ ok: true, message: { id: created.id, sender, name, body, createdAt: created.createdAt } });
  }

  try {
    await ensureConsultSchema();
    const [created] = await db
      .insert(consultMessages)
      .values({ roomId, lawyerSlug, sender, name, body })
      .returning({
        id: consultMessages.id,
        sender: consultMessages.sender,
        name: consultMessages.name,
        body: consultMessages.body,
        createdAt: consultMessages.createdAt,
      });
    return NextResponse.json({ ok: true, message: created });
  } catch {
    return NextResponse.json({ ok: false, error: "خطا در ثبت پیام. دوباره تلاش کنید." }, { status: 500 });
  }
}
