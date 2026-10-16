import { NextResponse } from "next/server";
import { db } from "@/db";
import { payoutRequests } from "@/db/schema-marketplace";
import { eq } from "drizzle-orm";
import { permDenied } from "@/lib/admin-guard";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["requested", "processing", "paid", "rejected"] as const;
type PayoutStatus = (typeof ALLOWED)[number];

/**
 * PATCH /api/admin/marketplace/payouts/[id]  { status }
 * تغییر وضعیت درخواست برداشت وکیل توسط ادمین:
 * requested → processing → paid | rejected
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "admin-payout", 60, 60_000);
  if (limited) return limited;
  const _denied = await permDenied("finance");
  if (_denied) return _denied;

  const { id } = await params;
  const payoutId = Number(id);
  if (!Number.isFinite(payoutId) || payoutId <= 0) {
    return NextResponse.json({ ok: false, error: "شناسهٔ درخواست نامعتبر است." }, { status: 422 });
  }

  const body = await readJson(req, 2_000);
  const status = text(body?.status, 20) as PayoutStatus | null;
  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json(
      { ok: false, error: `وضعیت مجاز: ${ALLOWED.join("، ")}` },
      { status: 422 },
    );
  }

  try {
    await db
      .update(payoutRequests)
      .set({
        status,
        processedAt: status === "paid" || status === "rejected" ? new Date() : null,
      })
      .where(eq(payoutRequests.id, payoutId));
    return NextResponse.json({ ok: true, status });
  } catch {
    return publicError();
  }
}
