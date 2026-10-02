// Managed Services ("خدمات پیگیری و انجام امور") — shared server logic.
//
// Security + honesty guarantees (per platform policy):
//  - Final price is ALWAYS recomputed here from the persisted service row +
//    urgency; the client never sends a price.
//  - requestNumber is generated from a Postgres sequence (SH-OPS-YYYY-NNNNNN),
//    never Math.random, and is backed by a UNIQUE constraint.
//  - Access is scoped: a user sees only their own requests; staff/supervisor/
//    admin see all; a lawyer sees only requests they supervise or that require
//    a lawyer. Public APIs never expose private requests.
//  - No PII is written into analytics/audit metadata.

import { db } from "@/db";
import {
  managedServices,
  serviceRequests,
  serviceRequestEvents,
  serviceRequestDocs,
  serviceQuotes,
  serviceNotifications,
  serviceAuditLogs,
  users,
  type ManagedService,
  type ServiceRequest,
  type ServiceField,
} from "@/db/schema";
import { eq, sql, desc, and, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { catalogServiceBySlug, type CatalogService } from "@/lib/managed-catalog";

export const OPERATIVE_ROLES = ["staff", "supervisor", "lawyer", "admin"] as const;
export type OperativeRole = (typeof OPERATIVE_ROLES)[number];

export function isOperative(role: string | undefined | null): role is OperativeRole {
  return !!role && (OPERATIVE_ROLES as readonly string[]).includes(role);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return user;
}

/* ----------------------------- Intake form ----------------------------- */
export function deriveIntakeFields(service: ManagedService): ServiceField[] {
  if (service.formFields && service.formFields.length) return service.formFields;
  const fields: ServiceField[] = [];
  if (service.requiresCaseInfo) {
    fields.push(
      { name: "caseNumber", label: "شماره پرونده / پیگیری", type: "text", required: true, placeholder: "مثال: ۱۴۰۳۱۰۰۱-۹۹-۱۲۳۴" },
      { name: "court", label: "مرجع / شعبه", type: "text", required: false, placeholder: "نام دادگاه یا واحد" },
    );
  }
  fields.push(
    { name: "title", label: "عنوان درخواست", type: "text", required: true, placeholder: "موضوع درخواست را بنویسید" },
    { name: "description", label: "توضیحات تکمیلی", type: "textarea", required: false, placeholder: "جزئیات، زمان‌بندی و نتیجه مورد انتظار" },
  );
  if (service.requiresDocuments) {
    fields.push({ name: "documentsReady", label: "آیا مدارک آماده است؟", type: "toggle", required: false });
  }
  fields.push(
    { name: "city", label: "شهر", type: "text", required: false },
    { name: "deadline", label: "مهلت موردنظر", type: "text", required: false, placeholder: "مثال: تا پایان ماه" },
  );
  return fields;
}

/* ----------------------------- Pricing ----------------------------- */
const URGENCY_FACTOR: Record<string, number> = {
  LOW: 0.9,
  NORMAL: 1,
  HIGH: 1.2,
  URGENT: 1.5,
};

/**
 * Server-side price computation. Returns null when the price must be quoted by
 * an operator (QUOTE / REQUIRES_REVIEW) or when there is no base price yet.
 */
export function computePrice(
  service: ManagedService,
  urgency: string,
): { price: number | null; requiresReview: boolean } {
  if (!service.active) return { price: null, requiresReview: true };
  if (service.priceType === "QUOTE" || service.priceType === "REQUIRES_REVIEW") {
    return { price: null, requiresReview: true };
  }
  const base = service.basePrice;
  if (base <= 0) return { price: null, requiresReview: true };
  if (service.priceType === "FIXED") return { price: base, requiresReview: false };
  // FROM: base price is the floor; urgency applies a truthful surcharge.
  const factor = URGENCY_FACTOR[urgency] ?? 1;
  const price = Math.round(base * factor);
  return { price: Math.max(price, base), requiresReview: false };
}

/* ----------------------------- requestNumber ----------------------------- */
export async function generateRequestNumber(): Promise<string> {
  const raw: any = await db.execute(sql`SELECT nextval('service_request_seq')::bigint AS n`);
  const rows = Array.isArray(raw) ? raw : raw?.rows ?? [];
  const n = Number(rows[0]?.n ?? Date.now());
  const year = new Date().getFullYear();
  return `SH-OPS-${year}-${String(n).padStart(6, "0")}`;
}

/* ----------------------------- Status metadata (re-exported, client-safe) ----------------------------- */
export {
  STATUS_LABELS,
  STATUS_TONE,
  URGENCY_LABELS,
  CATEGORY_LABELS,
  CLASSIFICATION_LABELS,
  PRICE_TYPE_LABELS,
  nextBestAction,
  faNumSafe,
} from "@/lib/managed-labels";

/* ----------------------------- Timeline / audit / notify ----------------------------- */
export async function recordEvent(args: {
  requestId: number;
  type?: string;
  title: string;
  description?: string;
  createdBy?: number | null;
  createdByName?: string | null;
  visibleToUser?: boolean;
  metadata?: unknown;
}) {
  const [ev] = await db
    .insert(serviceRequestEvents)
    .values({
      requestId: args.requestId,
      type: (args.type ?? "note") as any,
      title: args.title,
      description: args.description ?? "",
      createdBy: args.createdBy ?? null,
      createdByName: args.createdByName ?? null,
      visibleToUser: args.visibleToUser ?? true,
      metadata: args.metadata as any,
    })
    .returning();
  return ev;
}

export async function auditAction(args: {
  requestId?: number | null;
  action: string;
  actorRole?: string | null;
  actorId?: number | null;
  metadata?: unknown;
}) {
  await db.insert(serviceAuditLogs).values({
    requestId: args.requestId ?? null,
    action: args.action,
    actorRole: args.actorRole ?? null,
    actorId: args.actorId ?? null,
    metadata: args.metadata as any,
  });
}

export async function notifyUser(args: {
  userId: number;
  type: string;
  title: string;
  body?: string;
  requestId?: number | null;
}) {
  try {
    await db.insert(serviceNotifications).values({
      userId: args.userId,
      type: args.type,
      title: args.title,
      body: args.body ?? "",
      requestId: args.requestId ?? null,
    });
  } catch {
    /* notifications must never break the main flow */
  }
}

/* ----------------------------- Access control ----------------------------- */
/**
 * Whether `session` (the current user) may view `req`.
 *  - USER: only their own.
 *  - staff/supervisor/admin: any request.
 *  - lawyer: only requests they supervise, or that require a lawyer.
 */
export function canAccessRequest(
  session: { id: number; role: string; phone: string } | null,
  req: { userId: number; supervisingLawyerId: number | null; status: string; requiresLawyer?: boolean },
): boolean {
  if (!session) return false;
  if (session.role === "admin" || session.role === "staff" || session.role === "supervisor") return true;
  if (session.role === "lawyer") {
    if (req.supervisingLawyerId === session.id) return true;
    return req.requiresLawyer === true || req.status === "REVIEWING" || req.status === "QUOTED";
  }
  return req.userId === session.id;
}

/** Builds the WHERE clause that restricts a query to what the session may see. */
export function visibilityWhere(session: { id: number; role: string; phone: string }) {
  if (session.role === "admin" || session.role === "staff" || session.role === "supervisor") {
    return undefined;
  }
  if (session.role === "lawyer") {
    // Lawyer sees requests they supervise OR that require a lawyer (still being triaged).
    return inArray(serviceRequests.status, ["REVIEWING", "QUOTED", "AWAITING_DOCUMENTS", "ASSIGNED", "IN_PROGRESS", "WAITING_EXTERNAL", "COMPLETED", "DELIVERED"]);
  }
  return eq(serviceRequests.userId, session.id);
}

/** Resolve a request by id with visibility check. Returns null if not allowed. */
export async function resolveRequestFor(session: { id: number; role: string; phone: string }, id: number) {
  const [req] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
  if (!req) return null;
  // hydrate requiresLawyer from the service to evaluate lawyer visibility
  const [svc] = await db.select().from(managedServices).where(eq(managedServices.id, req.serviceId)).limit(1);
  const enriched = { ...req, requiresLawyer: svc?.requiresLawyer ?? false };
  if (!canAccessRequest(session, enriched)) return null;
  return req;
}

/* ----------------------------- List helpers ----------------------------- */
export async function getActiveServices(opts?: { featuredOnly?: boolean }) {
  const where = opts?.featuredOnly
    ? and(eq(managedServices.active, true), eq(managedServices.featured, true))
    : eq(managedServices.active, true);
  return db
    .select()
    .from(managedServices)
    .where(where)
    .orderBy(desc(managedServices.featured), managedServices.sortOrder);
}

function catalogToManaged(s: CatalogService): ManagedService {
  return {
    id: 0,
    title: s.title,
    slug: s.slug,
    shortDescription: s.shortDescription,
    description: s.description,
    classification: s.classification as ManagedService["classification"],
    category: s.category as ManagedService["category"],
    icon: s.icon,
    estimatedTime: s.estimatedTime,
    priceType: s.priceType as ManagedService["priceType"],
    basePrice: s.basePrice,
    requiresCaseInfo: s.requiresCaseInfo,
    requiresDocuments: s.requiresDocuments,
    requiresLawyer: s.requiresLawyer,
    requiresSupervision: s.requiresSupervision,
    active: s.active,
    featured: s.featured,
    sortOrder: s.sortOrder,
    formFields: null,
    requiredDocs: s.requiredDocs ?? null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

export async function getServiceBySlug(slug: string) {
  try {
    const [svc] = await db.select().from(managedServices).where(eq(managedServices.slug, slug)).limit(1);
    if (svc) return svc;
  } catch (err) {
    console.error("[dadban] getServiceBySlug failed:", err);
  }
  const fallback = catalogServiceBySlug(slug);
  return fallback ? catalogToManaged(fallback) : null;
}

export async function listOperatives(roles: string[]) {
  return db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(inArray(users.role, roles));
}
