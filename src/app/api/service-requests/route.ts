import { NextResponse } from "next/server";
import { db } from "@/db";
import { managedServices, serviceRequests } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text } from "@/lib/api-security";
import {
  computePrice,
  generateRequestNumber,
  recordEvent,
  auditAction,
  nextBestAction,
  isOperative,
  visibilityWhere,
  STATUS_LABELS,
  URGENCY_LABELS,
} from "@/lib/managed-services";
import { faNum } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_URGENCY = ["LOW", "NORMAL", "HIGH", "URGENT"];

/** GET /api/service-requests — list the requests visible to the caller. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const where = visibilityWhere(user);
    const rows = await db
      .select({
        req: serviceRequests,
        serviceTitle: managedServices.title,
        serviceSlug: managedServices.slug,
        serviceIcon: managedServices.icon,
      })
      .from(serviceRequests)
      .leftJoin(managedServices, eq(serviceRequests.serviceId, managedServices.id))
      .where(where)
      .orderBy(desc(serviceRequests.createdAt))
      .limit(100);

    const items = rows.map((r) => ({
      id: r.req.id,
      requestNumber: r.req.requestNumber,
      title: r.req.title,
      serviceTitle: r.serviceTitle,
      serviceSlug: r.serviceSlug,
      serviceIcon: r.serviceIcon,
      status: r.req.status,
      statusLabel: STATUS_LABELS[r.req.status] ?? r.req.status,
      urgency: r.req.urgency,
      urgencyLabel: URGENCY_LABELS[r.req.urgency] ?? r.req.urgency,
      price: r.req.price ?? null,
      priceLabel: r.req.price ? `${faNum(r.req.price.toLocaleString("en-US"))} تومان` : null,
      paymentStatus: r.req.paymentStatus,
      contractStatus: r.req.contractStatus,
      createdAt: r.req.createdAt,
      nextAction: nextBestAction(r.req),
    }));
    return NextResponse.json({ ok: true, requests: items });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}

/** POST /api/service-requests — create a new managed-service request. */
export async function POST(req: Request) {
  const limited = rateLimit(req, "service-request-create", 20, 10 * 60_000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = (await readJson(req, 32_768)) as {
    serviceSlug?: string;
    answers?: Record<string, string>;
    urgency?: string;
    description?: string;
    city?: string;
    organization?: string;
    referenceNumber?: string;
    caseNumber?: string;
    requestedDeadline?: string;
    contactPreference?: string;
  } | null;
  if (!body?.serviceSlug) {
    return NextResponse.json({ ok: false, error: "انتخاب خدمت الزامی است" }, { status: 422 });
  }
  const [svc] = await db
    .select()
    .from(managedServices)
    .where(and(eq(managedServices.slug, body.serviceSlug), eq(managedServices.active, true)))
    .limit(1);
  if (!svc) return NextResponse.json({ ok: false, error: "خدمت یافت نشد یا غیرفعال است" }, { status: 422 });

  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const title = text(answers.title, 160) || text(body.description?.slice(0, 160), 160) || svc.title;
  const description = text(body.description ?? answers.description ?? "", 4000) ?? "";
  const urgency = ALLOWED_URGENCY.includes(String(body.urgency)) ? (body.urgency as string) : "NORMAL";

  const { price, requiresReview } = computePrice(svc, urgency);

  // Determine the starting status (server-driven, never client-controlled).
  let status: string;
  if (svc.requiresDocuments) status = "AWAITING_DOCUMENTS";
  else if (price != null) status = "AWAITING_PAYMENT";
  else status = "SUBMITTED";

  let requestId = 0;
  let requestNumber = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = await generateRequestNumber();
    try {
      const [ins] = await db
        .insert(serviceRequests)
        .values({
          requestNumber: candidate,
          userId: user.id,
          serviceId: svc.id,
          title,
          description,
          answers,
          urgency: urgency as any,
          city: text(body.city, 80),
          organization: text(body.organization, 120),
          referenceNumber: text(body.referenceNumber, 80),
          caseNumber: text(body.caseNumber, 80),
          requestedDeadline: text(body.requestedDeadline, 80),
          contactPreference: (text(body.contactPreference, 16) ?? "PORTAL") as any,
          status: status as any,
          price,
          paymentStatus: "unpaid",
          contractStatus: svc.requiresLawyer || svc.requiresSupervision ? "DRAFT" : "NOT_REQUIRED",
        })
        .returning({ id: serviceRequests.id });
      requestId = ins.id;
      requestNumber = candidate;
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("service_requests_request_number") && !msg.includes("duplicate")) {
        return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
      }
    }
  }
  if (!requestId) return NextResponse.json({ ok: false, error: "خطا در تولید شماره درخواست؛ دوباره تلاش کنید." }, { status: 500 });

  await recordEvent({ requestId, type: "created", title: "درخواست ثبت شد", description: `خدمت: ${svc.title}`, createdBy: user.id, createdByName: user.name, visibleToUser: true });
  await auditAction({ requestId, action: "create", actorRole: user.role, actorId: user.id, metadata: { service: svc.slug, status } });

  return NextResponse.json({
    ok: true,
    requestId,
    requestNumber,
    status,
    statusLabel: STATUS_LABELS[status],
    price,
    priceLabel: price ? `${faNum(price.toLocaleString("en-US"))} تومان` : null,
    requiresReview,
    nextAction: nextBestAction({ ...{ status }, price } as any),
  });
}
