import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceRequestEvents } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { isOperative, resolveRequestFor } from "@/lib/managed-services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/service-requests/[id]/events — timeline (scoped). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!id) return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });

  const req = await resolveRequestFor(user, id);
  if (!req) return NextResponse.json({ ok: false, error: "درخواست یافت نشد" }, { status: 404 });

  const rows = await db
    .select()
    .from(serviceRequestEvents)
    .where(eq(serviceRequestEvents.requestId, id))
    .orderBy(desc(serviceRequestEvents.createdAt));

  const events = isOperative(user.role) ? rows : rows.filter((e) => e.visibleToUser);
  return NextResponse.json({
    ok: true,
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      description: e.description,
      createdByName: e.createdByName,
      visibleToUser: e.visibleToUser,
      createdAt: e.createdAt,
    })),
  });
}
