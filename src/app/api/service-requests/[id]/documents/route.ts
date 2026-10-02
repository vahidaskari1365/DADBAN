import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceRequestDocs, serviceRequests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { recordEvent, auditAction, resolveRequestFor, isOperative } from "@/lib/managed-services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/service-requests/[id]/documents — list docs (scoped). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!id) return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });
  const req = await resolveRequestFor(user, id);
  if (!req) return NextResponse.json({ ok: false, error: "درخواست یافت نشد" }, { status: 404 });

  const docs = await db
    .select()
    .from(serviceRequestDocs)
    .where(eq(serviceRequestDocs.requestId, id))
    .orderBy(desc(serviceRequestDocs.createdAt));
  return NextResponse.json({ ok: true, documents: docs });
}

/**
 * POST /api/service-requests/[id]/documents — record an uploaded document.
 * NOTE: real binary storage (S3/blob) is wired when available; until then the
 * file metadata is recorded and storageKey remains a placeholder.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "service-doc-upload", 30, 10 * 60_000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!id) return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });
  const reqRow = await resolveRequestFor(user, id);
  if (!reqRow) return NextResponse.json({ ok: false, error: "درخواست یافت نشد" }, { status: 404 });

  // An operative may also attach documents on the client's behalf.
  if (reqRow.userId !== user.id && !isOperative(user.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = (await readJson(req, 32_768)) as { name?: string; docType?: string; size?: number; storageKey?: string } | null;
  const name = text(body?.name, 160);
  if (!name) return NextResponse.json({ ok: false, error: "نام سند الزامی است" }, { status: 422 });

  const uploaderRole = isOperative(user.role) ? user.role : "client";
  const [doc] = await db
    .insert(serviceRequestDocs)
    .values({
      requestId: id,
      uploadedBy: user.id,
      uploaderRole,
      name,
      docType: text(body?.docType, 40) ?? "سند",
      size: Math.max(0, Number(body?.size ?? 0) || 0),
      storageKey: text(body?.storageKey, 255) ?? "",
    })
    .returning({ id: serviceRequestDocs.id, name: serviceRequestDocs.name });

  let advanced = false;
  if (reqRow.status === "AWAITING_DOCUMENTS") {
    await db.update(serviceRequests).set({ status: "REVIEWING", updatedAt: new Date() }).where(eq(serviceRequests.id, id));
    advanced = true;
  }
  await recordEvent({ requestId: id, type: "documents_received", title: `سند بارگذاری شد: ${name}`, createdBy: user.id, createdByName: user.name, visibleToUser: true });
  await auditAction({ requestId: id, action: "upload_doc", actorRole: user.role, actorId: user.id, metadata: { name } });

  return NextResponse.json({ ok: true, document: doc, advancedToReview: advanced });
}
