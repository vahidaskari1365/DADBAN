import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { userNotifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/user-auth";
import { ensureExtendedSchema, ensureProfileSchema } from "@/lib/auto-seed";
import { rateLimit } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * جریان زندهٔ اعلان‌ها (SSE) — جایگزین polling ۳۰ ثانیه‌ای، سازگار با Vercel serverless.
 *
 *  event: notification → {id,type,title,body,link,meta,read,createdAt}  (هر ردیف تازه)
 *  event: unread       → {"n":N}  (فقط وقتی تعداد نخوانده تغییر کرد)
 *  : hb                → heartbeat هر ۱۵ ثانیه (کامنت — کلاینت نادیده می‌گیرد)
 *  event: bye          → پایان مهلت تابع (~۵۵ ثانیه)؛ EventSource خودش وصل می‌شود.
 *
 * هر tick فقط دو کوئری کوتاه روی pool مشترک (max 2) — بدون تراکنش، بدون اتصال نگه‌داشته.
 * خطای دیتابیس در یک tick فقط همان tick را رد می‌کند (کاهش صادقانه، هرگز throw بعد از شروع استریم).
 */

const TICK_MS = 3_000;
const HB_MS = 15_000;
const BUDGET_MS = 55_000; // زیر maxDuration تا bye فرصت ارسال داشته باشد
const MAX_ROWS = 20;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const t = setTimeout(done, ms);
    function onAbort() {
      clearTimeout(t);
      signal.removeEventListener("abort", onAbort);
      resolve();
    }
    function done() {
      clearTimeout(t);
      signal.removeEventListener("abort", onAbort);
      resolve();
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function GET(req: Request) {
  const limited = rateLimit(req, "notif-stream", 30, 60_000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // آماده‌سازی جداول — best-effort؛ نبود جدول فقط یعنی tickهای خالی (degraded)
  try {
    await ensureProfileSchema();
    await ensureExtendedSchema();
  } catch {
    /* best-effort */
  }

  const userId = user.id;
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true; // کلاینت رفته — ادامه نمی‌دهیم
        }
      };

      const onAbort = () => {
        closed = true;
      };
      req.signal.addEventListener("abort", onAbort);

      let lastId = 0;
      let lastUnread = -1;
      let lastHb = Date.now();
      const startedAt = Date.now();

      // نقطهٔ شروع: بزرگ‌ترین id فعلی کاربر — فقط اعلان‌های «تازه» ارسال می‌شوند
      try {
        const [maxRow] = await db
          .select({ m: sql<number>`coalesce(max(${userNotifications.id}), 0)::int` })
          .from(userNotifications)
          .where(eq(userNotifications.userId, userId));
        lastId = Number(maxRow?.m ?? 0);
      } catch {
        /* skip — degraded؛ tickهای بعدی دوباره تلاش می‌کنند */
      }

      send("retry: 3000\n\n");

      while (!closed && Date.now() - startedAt < BUDGET_MS) {
        try {
          const rows = await db
            .select({
              id: userNotifications.id,
              type: userNotifications.type,
              title: userNotifications.title,
              body: userNotifications.body,
              link: userNotifications.link,
              meta: userNotifications.meta,
              read: userNotifications.read,
              createdAt: userNotifications.createdAt,
            })
            .from(userNotifications)
            .where(and(eq(userNotifications.userId, userId), gt(userNotifications.id, lastId)))
            .orderBy(asc(userNotifications.id))
            .limit(MAX_ROWS);
          for (const n of rows) {
            lastId = Math.max(lastId, n.id);
            send(
              `event: notification\ndata: ${JSON.stringify({
                id: n.id,
                type: n.type,
                title: n.title,
                body: n.body,
                link: n.link,
                meta: n.meta,
                read: n.read,
                createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
              })}\n\n`,
            );
          }

          // شمارش نخوانده — کوئری ارزان روی ایندکس (user_id, read)
          const [agg] = await db
            .select({ n: sql<number>`count(*)::int` })
            .from(userNotifications)
            .where(and(eq(userNotifications.userId, userId), eq(userNotifications.read, false)));
          const unread = Number(agg?.n ?? 0);
          if (unread !== lastUnread) {
            lastUnread = unread;
            send(`event: unread\ndata: {"n":${unread}}\n\n`);
          }
        } catch {
          /* خطای دیتابیس در این tick — رد می‌شود؛ اتصال می‌ماند (کاهش صادقانه) */
        }

        if (!closed && Date.now() - lastHb >= HB_MS) {
          lastHb = Date.now();
          send(": hb\n\n");
        }

        if (!closed) await sleep(TICK_MS, req.signal);
      }

      req.signal.removeEventListener("abort", onAbort);
      if (!closed) send("event: bye\ndata: {}\n\n");
      try {
        controller.close();
      } catch {
        /* قبلاً بسته شده */
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
