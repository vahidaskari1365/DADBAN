import { NextResponse } from "next/server";
import { db } from "@/db";
import { pageViews, events } from "@/db/schema";
import { sql } from "drizzle-orm";
import { EVENTS } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const allowedEvents = new Set<string>(EVENTS);

/**
 * POST /api/track
 *  - { path }              → page-view counter (upsert)
 *  - { event, path }       → funnel event into `events` (no PII)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const path = String(body?.path ?? "").slice(0, 300);
    const eventName = String(body?.event ?? "");

    if (eventName) {
      if (!allowedEvents.has(eventName)) {
        return NextResponse.json({ ok: false }, { status: 422 });
      }
      await db.insert(events).values({ event: eventName, path });
      return NextResponse.json({ ok: true });
    }

    if (!path || path.startsWith("/api") || path.startsWith("/admin")) {
      return NextResponse.json({ ok: false });
    }
    await db
      .insert(pageViews)
      .values({ path, views: 1 })
      .onConflictDoUpdate({
        target: pageViews.path,
        set: { views: sql`${pageViews.views} + 1`, lastSeen: sql`now()` },
      });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
