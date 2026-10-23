import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { consultMessages, lawyers } from "@/db/schema";
import { ensureConsultSchema } from "@/lib/auto-seed";
import { rateLimit, readJson, text, originGuard } from "@/lib/api-security";
import { getLawyerActor } from "@/lib/lawyer-actor";
import { and, asc, desc, eq, gt } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * گفتگوی متنی ماندگار موکل ↔ وکیل — بدون WebSocket (HTTP polling، سازگار با Vercel).
 *
 * POST { roomId, lawyerSlug, role, name, body } → ثبت پیام
 *   - فرستندهٔ «lawyer» فقط وقتی پذیرفته می‌شود که کاربرِ واردشده واقعاً همان وکیل باشد
 *     (slug از پیوند حساب گرفته می‌شود، نه از بدنه) — فیکس جعل هویت فرستنده.
 * GET  ?roomId=…&since=N       → پیام‌های اتاق بعد از N (poll هر ~۲ ثانیه؛ عمومی برای موکل)
 * GET  ?lawyerSlug=…&threads=1 → صندوق گفتگوهای وکیل — فقط وکیلِ واردشده (فیکس نشت اطلاعات)
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

/** slug وکیلِ واردشده از پیوند حساب (lawyerId) — null یعنی وکیل نیست */
async function actorSlug(): Promise<string | null> {
  const actor = await getLawyerActor();
  if (!actor) return null;
  try {
    const [lw] = await db.select({ slug: lawyers.slug }).from(lawyers).where(eq(lawyers.id, actor.lawyerId)).limit(1);
    return lw?.slug ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roomId = url.searchParams.get("roomId");
  const lawyerSlug = url.searchParams.get("lawyerSlug");
  const since = Math.max(0, Number(url.searchParams.get("since") ?? 0) || 0);

  // صندوق گفتگوها (threads) — فقط وکیل واردشده؛ slug از سشن، نه از query
  if (!roomId && lawyerSlug) {
    const limited = rateLimit(req, "consult-inbox", 90, 60_000);
    if (limited) return limited;
    const mySlug = await actorSlug();
    if (!mySlug) {
      return NextResponse.json({ ok: false, error: "برای مشاهدهٔ صندوق گفتگوها، با حساب وکیل خود وارد شوید." }, { status: 401 });
    }

    if (!isDbConfigured()) {
      const mine = mem.rows.filter((r) => r.lawyerSlug === mySlug);
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

    try {
      await ensureConsultSchema();
      const rows = await db
        .select({
          roomId: consultMessages.roomId,
          sender: consultMessages.sender,
          name: consultMessages.name,
          body: consultMessages.body,
          createdAt: consultMessages.createdAt,
        })
        .from(consultMessages)
        .where(eq(consultMessages.lawyerSlug, mySlug))
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
    } catch {
      return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
    }
  }

  // polling اتاق گفتگو — عمومی برای موکل (roomId تصادفی + نرخ‌سنجی)
  const limited = rateLimit(req, "consult-chat-get", 120, 60_000);
  if (limited) return limited;

  if (!isDbConfigured()) {
    const rows = roomId
      ? mem.rows
          .filter((r) => r.roomId === roomId && r.id > since)
          .slice(-200)
          .map((r) => ({ id: r.id, sender: r.sender, name: r.name, body: r.body, createdAt: r.createdAt }))
      : [];
    return NextResponse.json({ ok: true, messages: rows });
  }

  try {
    await ensureConsultSchema();
    const rows = roomId
      ? await db
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
          .limit(200)
      : [];
    return NextResponse.json({ ok: true, messages: rows });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "consult-chat", 30, 60_000);
  if (limited) return limited;
  const crossSite = originGuard(req);
  if (crossSite) return crossSite;

  const data = await readJson(req, 8_192);
  if (!data) {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر است." }, { status: 400 });
  }

  const roomId = text(data.roomId, 64);
  const lawyerSlug = text(data.lawyerSlug, 64);
  const name = text(data.name, 60);
  const body = text(data.body, 1_000);

  if (!roomId || !ROOM_RE.test(roomId)) {
    return NextResponse.json({ ok: false, error: "شناسه گفتگو نامعتبر است." }, { status: 400 });
  }
  if (!lawyerSlug || !body) {
    return NextResponse.json({ ok: false, error: "متن پیام الزامی است." }, { status: 400 });
  }

  // فیکس جعل هویت: sender فقط از سشن تعیین می‌شود، نه از بدنهٔ کلاینت
  const mySlug = await actorSlug();
  const isLawyerSender = !!mySlug && mySlug === lawyerSlug;
  const sender = isLawyerSender ? "lawyer" : "client";
  // نام فرستنده: وکیل = نام واقعی پروفایل؛ موکل = نام اعلامی خودش (چت عمومی)
  let senderName = name;
  if (isLawyerSender) {
    try {
      const [lw] = await db.select({ name: lawyers.name }).from(lawyers).where(eq(lawyers.slug, mySlug as string)).limit(1);
      senderName = lw?.name ?? name;
    } catch {
      senderName = name;
    }
  }
  if (!senderName) {
    return NextResponse.json({ ok: false, error: "نام و متن پیام الزامی است." }, { status: 400 });
  }

  if (!isDbConfigured()) {
    const created = memInsert({ roomId, lawyerSlug, sender, name: senderName, body });
    return NextResponse.json({ ok: true, message: { id: created.id, sender, name: senderName, body, createdAt: created.createdAt } });
  }

  try {
    await ensureConsultSchema();
    const [created] = await db
      .insert(consultMessages)
      .values({ roomId, lawyerSlug, sender, name: senderName, body })
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
