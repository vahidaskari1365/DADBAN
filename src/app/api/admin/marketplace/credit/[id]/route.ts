import { NextResponse } from "next/server";
import { db } from "@/db";
import { creditRequests } from "@/db/schema-marketplace";
import { eq } from "drizzle-orm";
import { permDenied } from "@/lib/admin-guard";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["draft", "submitted", "scoring", "approved", "rejected", "funded"] as const;
type CreditStatus = (typeof ALLOWED)[number];

/**
 * PATCH /api/admin/marketplace/credit/[id]  { status, statusDetail? }
 * تغییر وضعیت درخواست اعتبار توسط ادمین — چرخهٔ تأمین‌کننده:
 * draft → submitted → scoring → approved | rejected → funded
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "admin-credit-patch", 60, 60_000);
  if (limited) return limited;
  const _denied = await permDenied("finance");
  if (_denied) return _denied;

  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isFinite(requestId) || requestId <= 0) {
    return NextResponse.json({ ok: false, error: "شناسهٔ درخواست نامعتبر است." }, { status: 422 });
  }

  const body = await readJson(req, 2_000);
  const status = text(body?.status, 20) as CreditStatus | null;
  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json(
      { ok: false, error: `وضعیت مجاز: ${ALLOWED.join("، ")}` },
      { status: 422 },
    );
  }
  const statusDetail = text(body?.statusDetail, 200);

  try {
    await db
      .update(creditRequests)
      .set({
        status,
        ...(statusDetail !== null ? { statusDetail } : {}),
        updatedAt: new Date(),
      })
      .where(eq(creditRequests.id, requestId));
    return NextResponse.json({ ok: true, status });
  } catch {
    return publicError();
  }
}
