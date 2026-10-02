import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  managedServices,
  serviceRequests,
  serviceRequestEvents,
  serviceRequestDocs,
  serviceQuotes,
  users,
} from "@/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text } from "@/lib/api-security";
import {
  resolveRequestFor,
  recordEvent,
  auditAction,
  notifyUser,
  nextBestAction,
  canAccessRequest,
  isOperative,
  STATUS_LABELS,
  URGENCY_LABELS,
  CATEGORY_LABELS,
  CLASSIFICATION_LABELS,
} from "@/lib/managed-services";
import { faNum } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "DRAFT", "SUBMITTED", "REVIEWING", "AWAITING_DOCUMENTS", "QUOTED",
  "AWAITING_PAYMENT", "ASSIGNED", "IN_PROGRESS", "WAITING_EXTERNAL",
  "COMPLETED", "DELIVERED", "CANCELLED", "REJECTED",
];

/** GET /api/service-requests/[id] — full detail (scoped to caller). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!id) return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });

  const req = await resolveRequestFor(user, id);
  if (!req) return NextResponse.json({ ok: false, error: "درخواست یافت نشد" }, { status: 404 });

  const [[svc], events, quotes, docs, staff, supervisor] = await Promise.all([
    db.select().from(managedServices).where(eq(managedServices.id, req.serviceId)).limit(1),
    db.select().from(serviceRequestEvents).where(eq(serviceRequestEvents.requestId, id)).orderBy(desc(serviceRequestEvents.createdAt)),
    db.select().from(serviceQuotes).where(eq(serviceQuotes.requestId, id)).orderBy(desc(serviceQuotes.createdAt)).limit(5),
    db.select({ id: serviceRequestDocs.id, name: serviceRequestDocs.name, docType: serviceRequestDocs.docType, size: serviceRequestDocs.size, uploaderRole: serviceRequestDocs.uploaderRole, createdAt: serviceRequestDocs.createdAt }).from(serviceRequestDocs).where(eq(serviceRequestDocs.requestId, id)).orderBy(desc(serviceRequestDocs.createdAt)),
    req.assignedStaffId ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, req.assignedStaffId)).limit(1) : Promise.resolve([]),
    req.supervisingLawyerId ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, req.supervisingLawyerId)).limit(1) : Promise.resolve([]),
  ]);

  const visibleEvents = isOperative(user.role)
    ? events
    : events.filter((e) => e.visibleToUser);

  return NextResponse.json({
    ok: true,
    request: {
      ...req,
      statusLabel: STATUS_LABELS[req.status] ?? req.status,
      urgencyLabel: URGENCY_LABELS[req.urgency] ?? req.urgency,
      priceLabel: req.price ? `${faNum(req.price.toLocaleString("en-US"))} تومان` : null,
      nextAction: nextBestAction(req),
    },
    service: svc
      ? {
          title: svc.title,
          slug: svc.slug,
          icon: svc.icon,
          category: svc.category,
          categoryLabel: CATEGORY_LABELS[svc.category] ?? svc.category,
          classificationLabel: CLASSIFICATION_LABELS[svc.classification] ?? svc.classification,
        }
      : null,
    events: visibleEvents.map((e) => ({
      id: e.id, type: e.type, title: e.title, description: e.description,
      createdByName: e.createdByName, visibleToUser: e.visibleToUser, createdAt: e.createdAt,
    })),
    quotes: quotes.map((q) => ({
      id: q.id, subtotal: q.subtotal, discount: q.discount, total: q.total,
      currency: q.currency, status: q.status, expiresAt: q.expiresAt, createdAt: q.createdAt,
    })),
    docs,
    assignedStaff: staff[0] ?? null,
    supervisingLawyer: supervisor[0] ?? null,
    canManage: isOperative(user.role) && (user.role === "admin" || user.role === "staff" || user.role === "supervisor"),
  });
}

/** PATCH /api/service-requests/[id] — status/assignment changes. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(request, "service-request-patch", 40, 10 * 60_000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!id) return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });

  const body = (await readJson(request, 32_768)) as {
    action?: string;
    status?: string;
    assignedStaffId?: number | null;
    supervisingLawyerId?: number | null;
    price?: number | null;
    contractStatus?: string;
    finalReport?: string;
    resultFileLabel?: string;
    paymentStatus?: string;
    note?: string;
  } | null;

  const req = await resolveRequestFor(user, id);
  if (!req) return NextResponse.json({ ok: false, error: "درخواست یافت نشد" }, { status: 404 });

  // Owner cancellation only (from an open state).
  if (body?.action === "cancel") {
    if (req.userId !== user.id) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    if (!["DRAFT", "SUBMITTED", "REVIEWING", "AWAITING_DOCUMENTS", "QUOTED", "AWAITING_PAYMENT"].includes(req.status)) {
      return NextResponse.json({ ok: false, error: "این درخواست قابل لغو نیست" }, { status: 409 });
    }
    await db.update(serviceRequests).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(serviceRequests.id, id));
    await recordEvent({ requestId: id, type: "cancelled", title: "درخواست لغو شد", createdBy: user.id, createdByName: user.name, visibleToUser: true });
    await auditAction({ requestId: id, action: "cancel", actorRole: user.role, actorId: user.id });
    return NextResponse.json({ ok: true, status: "CANCELLED", statusLabel: STATUS_LABELS.CANCELLED });
  }

  // Operative update.
  if (!isOperative(user.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  if (user.role === "lawyer" && req.supervisingLawyerId !== user.id && !["REVIEWING", "QUOTED", "AWAITING_DOCUMENTS"].includes(req.status)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const eventTitles: string[] = [];

  if (body?.status && VALID_STATUSES.includes(body.status)) {
    updates.status = body.status;
    eventTitles.push(`وضعیت به «${STATUS_LABELS[body.status]}» تغییر کرد`);
    if (body.status === "ASSIGNED" && !req.startedAt) updates.startedAt = new Date();
    if (body.status === "COMPLETED" || body.status === "DELIVERED") updates.completedAt = new Date();
    if (body.status === "IN_PROGRESS" && !updates.startedAt && !req.startedAt) updates.startedAt = new Date();
  }
  if (typeof body?.assignedStaffId === "number") {
    // Validate the target is a staff member.
    const [st] = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(eq(users.id, body.assignedStaffId)).limit(1);
    if (!st || st.role !== "staff") return NextResponse.json({ ok: false, error: "کارشناس نامعتبر" }, { status: 422 });
    updates.assignedStaffId = body.assignedStaffId;
    eventTitles.push(`کارشناس عملیات تعیین شد: ${st.name}`);
  }
  if (body?.supervisingLawyerId !== undefined) {
    if (body.supervisingLawyerId !== null) {
      const [sp] = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(eq(users.id, body.supervisingLawyerId)).limit(1);
      if (!sp || (sp.role !== "lawyer" && sp.role !== "supervisor" && sp.role !== "admin")) {
        return NextResponse.json({ ok: false, error: "ناظر حقوقی نامعتبر" }, { status: 422 });
      }
      updates.supervisingLawyerId = body.supervisingLawyerId;
      eventTitles.push(`ناظر حقوقی تعیین شد: ${sp.name}`);
    } else {
      updates.supervisingLawyerId = null;
    }
  }
  if (typeof body?.price === "number") updates.price = body.price;
  if (body?.contractStatus) updates.contractStatus = body.contractStatus;
  if (body?.paymentStatus) {
    if (!["unpaid", "pending", "awaiting", "paid", "refunded", "failed"].includes(body.paymentStatus)) {
      return NextResponse.json({ ok: false, error: "وضعیت پرداخت نامعتبر" }, { status: 422 });
    }
    updates.paymentStatus = body.paymentStatus;
    if (body.paymentStatus === "paid" && req.status === "AWAITING_PAYMENT") {
      updates.status = req.assignedStaffId ? "ASSIGNED" : "IN_PROGRESS";
      eventTitles.push("پرداخت تأیید شد و درخواست به کارشناس واگذار شد");
    } else if (body.paymentStatus === "paid") {
      eventTitles.push("پرداخت تأیید شد");
    }
  }
  if (typeof body?.finalReport === "string") updates.finalReport = text(body.finalReport, 8000) ?? "";
  if (typeof body?.resultFileLabel === "string") updates.resultFileLabel = text(body.resultFileLabel, 160);

  if (Object.keys(updates).length <= 1 && !body?.note) {
    return NextResponse.json({ ok: false, error: "تغییری ارسال نشده است" }, { status: 422 });
  }

  await db.update(serviceRequests).set(updates).where(eq(serviceRequests.id, id));

  for (const t of eventTitles) {
    await recordEvent({ requestId: id, type: "status_changed", title: t, createdBy: user.id, createdByName: user.name, visibleToUser: true });
  }
  if (body?.note) {
    await recordEvent({ requestId: id, type: "note", title: "یادداشت داخلی", description: text(body.note, 2000) ?? "", createdBy: user.id, createdByName: user.name, visibleToUser: false });
  }
  await auditAction({ requestId: id, action: "update", actorRole: user.role, actorId: user.id, metadata: { fields: Object.keys(updates).filter((k) => k !== "updatedAt") } });

  // Notify the user on meaningful transitions.
  if (updates.status && updates.status !== req.status) {
    const label = STATUS_LABELS[updates.status as string] ?? updates.status;
    await notifyUser({ userId: req.userId, type: "request_status", title: `بروزرسانی درخواست ${req.requestNumber}`, body: `وضعیت درخواست شما به «${label}» تغییر کرد.`, requestId: id });
  }

  const [updated] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
  return NextResponse.json({
    ok: true,
    status: updated.status,
    statusLabel: STATUS_LABELS[updated.status],
    assignedStaffId: updated.assignedStaffId,
    supervisingLawyerId: updated.supervisingLawyerId,
    price: updated.price,
  });
}
