import { NextResponse } from "next/server";
import { db } from "@/db";
import { userNotifications } from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { rateLimit, readJson } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/user-auth";
import { ensureProfileSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * اعلان‌های درون‌برنامه‌ای کاربر واردشده (موکل و وکیل):
 *  GET  → ۲۰ اعلان آخر + تعداد نخوانده (badge پنل)
 *  POST → علامت‌گذاری خوانده‌شده: {ids:[…]} یا {all:true}
 * متن اعلان در سمت کلاینت با t()/tf() و meta به زبان کاربر رندر می‌شود.
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, "notif-get", 120, 60_000);
  if (limited) return limited;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    await ensureProfileSchema();
    const [items, [agg]] = await Promise.all([
      db
        .select()
        .from(userNotifications)
        .where(eq(userNotifications.userId, user.id))
        .orderBy(desc(userNotifications.createdAt))
        .limit(20),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(userNotifications)
        .where(and(eq(userNotifications.userId, user.id), eq(userNotifications.read, false))),
    ]);
    return NextResponse.json({
      ok: true,
      unread: Number(agg?.n ?? 0),
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        meta: n.meta,
        read: n.read,
        createdAt: n.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "notif-post", 60, 60_000);
  if (limited) return limited;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let body: { ids?: number[]; all?: boolean };
  try {
    body = ((await readJson(req, 4_096)) ?? {}) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر" }, { status: 400 });
  }
  try {
    await ensureProfileSchema();
    if (body.all) {
      await db.update(userNotifications).set({ read: true }).where(eq(userNotifications.userId, user.id));
    } else {
      const ids = (Array.isArray(body.ids) ? body.ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
      if (!ids.length) return NextResponse.json({ ok: false, error: "شناسهٔ اعلان لازم است." }, { status: 422 });
      await db
        .update(userNotifications)
        .set({ read: true })
        .where(and(eq(userNotifications.userId, user.id), inArray(userNotifications.id, ids)));
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
