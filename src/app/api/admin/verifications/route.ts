import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyers, lawyerVerifications, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { permDenied } from "@/lib/admin-guard";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { notifyVerificationResult } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ستون‌های متادیتا — بایت‌های مدارک فقط از مسیر doc/ سرو می‌شود */
const META_COLS = {
  id: lawyerVerifications.id,
  lawyerId: lawyerVerifications.lawyerId,
  userId: lawyerVerifications.userId,
  status: lawyerVerifications.status,
  licenseName: lawyerVerifications.licenseName,
  licenseSize: lawyerVerifications.licenseSize,
  licenseMime: lawyerVerifications.licenseMime,
  idName: lawyerVerifications.idName,
  idSize: lawyerVerifications.idSize,
  idMime: lawyerVerifications.idMime,
  degreeName: lawyerVerifications.degreeName,
  degreeSize: lawyerVerifications.degreeSize,
  degreeMime: lawyerVerifications.degreeMime,
  note: lawyerVerifications.note,
  adminNote: lawyerVerifications.adminNote,
  reviewedAt: lawyerVerifications.reviewedAt,
  createdAt: lawyerVerifications.createdAt,
  lawyerName: lawyers.name,
  lawyerSlug: lawyers.slug,
  lawyerCity: lawyers.city,
  lawyerType: lawyers.lawyerType,
  licenseNo: lawyers.licenseNo,
  specialties: lawyers.specialties,
  employeeLawyer: lawyers.employeeLawyer,
  verified: lawyers.verified,
  userPhone: users.phone,
};

export async function GET() {
  const _denied = await permDenied("lawyers"); if (_denied) return _denied;
  try {
    await ensureExtendedSchema();
    const rows = await db
      .select(META_COLS)
      .from(lawyerVerifications)
      .leftJoin(lawyers, eq(lawyers.id, lawyerVerifications.lawyerId))
      .leftJoin(users, eq(users.id, lawyerVerifications.userId))
      .orderBy(desc(lawyerVerifications.createdAt))
      .limit(200);
    return NextResponse.json({ ok: true, rows });
  } catch {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
  }
}

/**
 * PATCH — بررسی درخواست توسط مدیر سایت:
 *   { id, action: "approve" | "reject", adminNote? }
 * approve → lawyers.verified=true (ورود به فهرست عمومی وکلا) + اعلان به وکیل
 * reject  → ذخیرهٔ دلیل (الزامی) + اعلان به وکیل برای ارسال مجدد
 */
export async function PATCH(req: Request) {
  const _denied = await permDenied("lawyers"); if (_denied) return _denied;
  const limited = rateLimit(req, "admin-verify", 60, 15 * 60_000);
  if (limited) return limited;
  const body = await readJson(req, 4096);
  const id = Number(body?.id);
  const action = body?.action === "approve" ? "approve" : body?.action === "reject" ? "reject" : null;
  const adminNote = text(body?.adminNote, 500) || null;
  if (!id || !action) return NextResponse.json({ ok: false, error: "id و action الزامی است" }, { status: 400 });
  if (action === "reject" && (!adminNote || adminNote.length < 3)) {
    return NextResponse.json({ ok: false, error: "برای رد درخواست، نوشتن دلیل الزامی است." }, { status: 422 });
  }
  try {
    await ensureExtendedSchema();
    const rows = await db
      .select({ id: lawyerVerifications.id, lawyerId: lawyerVerifications.lawyerId, userId: lawyerVerifications.userId, status: lawyerVerifications.status })
      .from(lawyerVerifications)
      .where(eq(lawyerVerifications.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

    const status = action === "approve" ? "approved" : "rejected";
    await db
      .update(lawyerVerifications)
      .set({ status, adminNote, reviewedAt: sql`now()` })
      .where(eq(lawyerVerifications.id, id));

    if (action === "approve") {
      // ورود وکیل به فهرست عمومی + نشان تأیید
      await db.update(lawyers).set({ verified: true }).where(eq(lawyers.id, row.lawyerId));
    } else {
      // رد → پروفایل از فهرست عمومی خارج می‌ماند/ خارج می‌شود
      await db.update(lawyers).set({ verified: false }).where(eq(lawyers.id, row.lawyerId));
    }

    // پیغام به وکیل (اعلان پنل + تلگرام در صورت اتصال) — best-effort
    const notifyUserId = row.userId ?? (await db.select({ id: users.id }).from(users).where(eq(users.lawyerId, row.lawyerId)).limit(1))[0]?.id ?? null;
    await notifyVerificationResult(notifyUserId, action === "approve", adminNote);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "update failed" }, { status: 500 });
  }
}
