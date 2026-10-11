import { NextResponse } from "next/server";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { caseMessages } from "@/db/schema-marketplace";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit } from "@/lib/api-security";
import { getCaseRow } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * جریان زندهٔ پیام‌های پرونده (SSE) — همان کنترل دسترسی مسیر messages:
 *   getCurrentUser → 401 | parse id → 422 | وجود پرونده (getCaseRow) → 404
 *
 *  event: message → {id,senderRole,senderName,body,createdAt}  (هر ردیف تازه، هر ۲.۵ ثانیه)
 *  : hb           → heartbeat هر ۱۵ ثانیه
 *  event: bye     → پایان مهلت تابع (~۵۵ ثانیه)؛ EventSource خودش وصل می‌شود.
 *
 * lastId در لحظهٔ اتصال = بزرگ‌ترین id موجود؛ فقط ردیف‌های «تازه» ارسال می‌شوند
 * (تاریخچه از REST /messages می‌آید). هر tick یک کوئری کوتاه روی pool مشترک —
 * بدون تراکنش؛ خطای tick فقط همان tick را رد می‌کند و اتصال می‌ماند.
 */

const TICK_MS = 2_500;
const HB_MS = 15_000;
const BUDGET_MS = 55_000;
const MAX_ROWS = 30;

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

export async function GET(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-messages-stream", 30, 60_000);
    if (limited) return limited;

    // — همان احراز مسیر /api/portal/cases/[id]/messages —
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

    const { id } = await params;
    const caseId = Number(id);
    if (!Number.isFinite(caseId) || caseId <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه پرونده نامعتبر است." }, { status: 422 });
    }
    const c = await getCaseRow(caseId);
    if (!c) return NextResponse.json({ ok: false, error: "پرونده یافت نشد." }, { status: 404 });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }

  const { id } = await params;
  const caseId = Number(id);
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const onAbort = () => {
        closed = true;
      };
      req.signal.addEventListener("abort", onAbort);

      let lastId = 0;
      let lastHb = Date.now();
      const startedAt = Date.now();

      // نقطهٔ شروع: بزرگ‌ترین id پیام موجود — فقط پیام‌های «تازه» ارسال می‌شوند
      try {
        const [maxRow] = await db
          .select({ m: sql<number>`coalesce(max(${caseMessages.id}), 0)::int` })
          .from(caseMessages)
          .where(and(eq(caseMessages.caseId, caseId), gt(caseMessages.id, 0)));
        lastId = Number(maxRow?.m ?? 0);
      } catch {
        /* skip — tick اول دوباره تلاش می‌کند */
      }

      send("retry: 3000\n\n");

      while (!closed && Date.now() - startedAt < BUDGET_MS) {
        try {
          const rows = await db
            .select({
              id: caseMessages.id,
              senderRole: caseMessages.senderRole,
              senderName: caseMessages.senderName,
              body: caseMessages.body,
              createdAt: caseMessages.createdAt,
            })
            .from(caseMessages)
            .where(and(eq(caseMessages.caseId, caseId), gt(caseMessages.id, lastId)))
            .orderBy(asc(caseMessages.id))
            .limit(MAX_ROWS);
          for (const m of rows) {
            lastId = Math.max(lastId, m.id);
            send(
              `event: message\ndata: ${JSON.stringify({
                id: m.id,
                senderRole: m.senderRole,
                senderName: m.senderName,
                body: m.body,
                createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
              })}\n\n`,
            );
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
