import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases, caseDocuments } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, publicError } from "@/lib/api-security";
import { ensureExtendedSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** سقف حجم فایل — ۵ مگابایت (ذخیره در دیتابیس به‌صورت bytea) */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** allowlist صادقانهٔ فرمت‌ها — خارج از این لیست با پیام روشن رد می‌شود */
const ALLOWED_MIME: Record<string, true> = {
  "application/pdf": true,
  "image/png": true,
  "image/jpeg": true,
  "image/webp": true,
  "image/heic": true,
  "image/heif": true,
  "application/msword": true,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
  "text/plain": true,
};

const ALLOWED_ACCEPT = Object.keys(ALLOWED_MIME).join(",");

type CaseRow = typeof cases.$inferSelect;
type SessionUser = { id: number; role: string; phone: string; lawyerId: number | null };

/* ------------------------------ مجوز دسترسی ------------------------------ */

/** مالک موکل — همان منطق دقیق صفحهٔ جزئیات پرونده: تطابق شماره تماس */
function isCaseOwner(row: CaseRow, user: SessionUser): boolean {
  if (!user.phone) return false;
  return row.contactPhone === user.phone || (!!row.clientUserPhone && row.clientUserPhone === user.phone);
}

/** وکیل واگذارشده — از طریق users.lawyerId ↔ cases.assignedLawyerId */
function isAssignedLawyer(row: CaseRow, user: SessionUser): boolean {
  return (
    (user.role === "lawyer" || user.role === "team") &&
    user.lawyerId != null &&
    row.assignedLawyerId != null &&
    row.assignedLawyerId === user.lawyerId
  );
}

/** نقش‌های داخلی پلتفرم (کارشناس عملیات/ناظر) */
function isInternalRole(role: string): boolean {
  return role === "staff" || role === "supervisor";
}

async function loadCaseForUser(caseId: number, user: SessionUser): Promise<CaseRow | null> {
  try {
    const rows = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    const row = rows[0];
    if (!row) return null;
    if (isCaseOwner(row, user) || isAssignedLawyer(row, user) || isInternalRole(user.role)) return row;
    return null;
  } catch {
    return null;
  }
}

/** نقش آپلودکننده برای ذخیره در جدول — client | lawyer | staff */
function uploaderRoleOf(role: string): string {
  if (role === "lawyer" || role === "team") return "lawyer";
  if (isInternalRole(role)) return "staff";
  return "client";
}

/** پاک‌سازی نام فایل — بدون مسیر/کنترل‌کاراکتر، حداکثر ۲۰۰ کاراکتر */
function sanitizeName(raw: string): string {
  const name = String(raw ?? "")
    .replace(/[/\\]/g, "-")
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 32 && code !== 127; // حذف کاراکترهای کنترلی
    })
    .join("")
    .trim()
    .slice(0, 200);
  return name || "مدرک";
}

const unauthorized = () => NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
const notFound = () => NextResponse.json({ ok: false, error: "پرونده یافت نشد یا به آن دسترسی ندارید." }, { status: 404 });

/* --------------------------------- POST --------------------------------- */

/**
 * POST /api/case-documents — multipart/form-data: { caseId, file }
 * آپلود واقعی فایل (≤۵MB) برای پرونده؛ ذخیرهٔ باینری در case_documents.data (bytea).
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "case-doc-post", 20, 60 * 60_000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    try {
      await ensureExtendedSchema();
    } catch {
      /* best-effort */
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ ok: false, error: "بدنهٔ درخواست باید multipart/form-data باشد." }, { status: 422 });
    }

    const caseId = Number(form.get("caseId"));
    if (!Number.isFinite(caseId) || caseId <= 0) {
      return NextResponse.json({ ok: false, error: "شناسهٔ پرونده نامعتبر است." }, { status: 422 });
    }

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, error: "فایلی انتخاب نشده است." }, { status: 422 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: "حجم فایل بیش از ۵ مگابایت است." }, { status: 413 });
    }
    const mime = (file.type || "application/octet-stream").toLowerCase().split(";")[0].trim();
    if (!ALLOWED_MIME[mime]) {
      return NextResponse.json(
        { ok: false, error: "این فرمت پذیرفته نمی‌شود. فرمت‌های مجاز: PDF، تصویر (PNG/JPEG/WEBP/HEIC)، Word و متن ساده." },
        { status: 415 },
      );
    }

    const caseRow = await loadCaseForUser(caseId, user as unknown as SessionUser);
    if (!caseRow) return notFound();

    const buffer = Buffer.from(await file.arrayBuffer());
    const [inserted] = await db
      .insert(caseDocuments)
      .values({
        caseId,
        uploadedBy: user.id,
        uploaderRole: uploaderRoleOf(user.role),
        name: sanitizeName(file.name),
        mime,
        size: buffer.length,
        data: buffer,
      })
      .returning({ id: caseDocuments.id, name: caseDocuments.name, size: caseDocuments.size, createdAt: caseDocuments.createdAt });

    return NextResponse.json({ ok: true, document: inserted });
  } catch (err) {
    console.error("[dadban] case-documents POST failed:", err);
    return publicError();
  }
}

/* ---------------------------------- GET ---------------------------------- */

/**
 * GET /api/case-documents?caseId=N → فهرست متادیتای مدارک پرونده (بدون باینری)
 * GET /api/case-documents?id=N     → دانلود فایل (اختیاری)
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, "case-doc-get", 120, 60_000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const caseId = Number(url.searchParams.get("caseId") ?? "");
  const id = Number(url.searchParams.get("id") ?? "");

  try {
    try {
      await ensureExtendedSchema();
    } catch {
      /* best-effort */
    }

    // فهرست مدارک پرونده
    if (Number.isFinite(caseId) && caseId > 0) {
      const caseRow = await loadCaseForUser(caseId, user as unknown as SessionUser);
      if (!caseRow) return notFound();
      const rows = await db
        .select({
          id: caseDocuments.id,
          caseId: caseDocuments.caseId,
          uploadedBy: caseDocuments.uploadedBy,
          uploaderRole: caseDocuments.uploaderRole,
          name: caseDocuments.name,
          mime: caseDocuments.mime,
          size: caseDocuments.size,
          createdAt: caseDocuments.createdAt,
        })
        .from(caseDocuments)
        .where(eq(caseDocuments.caseId, caseId))
        .orderBy(desc(caseDocuments.createdAt))
        .limit(100);
      return NextResponse.json({ ok: true, documents: Array.isArray(rows) ? rows : [] });
    }

    // دانلود یک فایل
    if (Number.isFinite(id) && id > 0) {
      const rows = await db.select().from(caseDocuments).where(eq(caseDocuments.id, id)).limit(1);
      const row = rows[0];
      if (!row) return NextResponse.json({ ok: false, error: "مدرک یافت نشد." }, { status: 404 });
      const caseRow = await loadCaseForUser(row.caseId, user as unknown as SessionUser);
      if (!caseRow) return notFound();
      const data = row.data;
      if (!data || typeof data.length !== "number") {
        return NextResponse.json({ ok: false, error: "محتوای فایل در دسترس نیست." }, { status: 404 });
      }
      return new Response(new Uint8Array(data), {
        headers: {
          "Content-Type": row.mime || "application/octet-stream",
          "Content-Disposition": `attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(row.name)}`,
          "Content-Length": String(data.length),
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return NextResponse.json({ ok: false, error: "caseId یا id الزامی است." }, { status: 422 });
  } catch (err) {
    console.error("[dadban] case-documents GET failed:", err);
    return publicError();
  }
}

/* --------------------------------- DELETE -------------------------------- */

/** DELETE /api/case-documents?id=N — فقط آپلودکننده یا مالک پرونده (یا نقش داخلی) */
export async function DELETE(req: Request) {
  const limited = rateLimit(req, "case-doc-delete", 60, 60_000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id") ?? "");
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "شناسهٔ مدرک نامعتبر است." }, { status: 422 });
  }

  try {
    try {
      await ensureExtendedSchema();
    } catch {
      /* best-effort */
    }

    const rows = await db
      .select({ id: caseDocuments.id, caseId: caseDocuments.caseId, uploadedBy: caseDocuments.uploadedBy })
      .from(caseDocuments)
      .where(eq(caseDocuments.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return NextResponse.json({ ok: false, error: "مدرک یافت نشد." }, { status: 404 });

    const isUploader = row.uploadedBy === user.id;
    const caseRow = await loadCaseForUser(row.caseId, user as unknown as SessionUser);
    const isOwnerOrInternal = !!caseRow && (isCaseOwner(caseRow, user as unknown as SessionUser) || isInternalRole(user.role));
    if (!isUploader && !isOwnerOrInternal) {
      return NextResponse.json({ ok: false, error: "اجازهٔ حذف این مدرک را ندارید." }, { status: 403 });
    }

    await db.delete(caseDocuments).where(eq(caseDocuments.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[dadban] case-documents DELETE failed:", err);
    return publicError();
  }
}
