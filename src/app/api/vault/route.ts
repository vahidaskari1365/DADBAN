import { NextResponse } from "next/server";
import { db } from "@/db";
import { vaultDocuments } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit } from "@/lib/api-security";
import { ensureExtendedSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** سقف حجم فایل — ۵ مگابایت (ذخیره در دیتابیس به‌صورت bytea) */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** allowlist صادقانهٔ فرمت‌ها — همان الگوی case-documents + ZIP و متن ساده */
const ALLOWED_MIME: Record<string, true> = {
  "application/pdf": true,
  "image/png": true,
  "image/jpeg": true,
  "image/webp": true,
  "image/heic": true,
  "image/heif": true,
  "application/msword": true,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
  "application/zip": true,
  "text/plain": true,
};

/** دسته‌های مجاز گاوصندوق — مقدار نامعتبر → «سایر» */
const CATEGORIES = ["قرارداد", "دادخواست", "هویتی", "سند", "سایر"] as const;

/** خطای صادقانهٔ دیتابیس — کلاینت با همین رشته بنر «در دسترس نیست» نشان می‌دهد */
const dbUnavailable = () => NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
const unauthorized = () => NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

/** اعتبارسنجی رشتهٔ hex کوتاه (salt / keyCheck) — ۸ تا ۱۲۸ کاراکتر hex */
function isShortHex(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8,128}$/i.test(value);
}

/** پاک‌سازی نام فایل — بدون مسیر/کنترل‌کاراکتر، حداکثر ۲۰۰ کاراکتر (الگوی case-documents) */
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
  return name || "سند";
}

/* --------------------------------- POST --------------------------------- */

/**
 * POST /api/vault — multipart/form-data: { file, category?, encrypted?, kdfSalt?, keyCheck? }
 * آپلود سند شخصی (≤۵MB) برای کاربر جاری؛ اگر encrypted=1 باشد، محتوا پیش از ارسال
 * در «مرورگر» با AES-GCM رمز شده و kdfSalt/keyCheck همراهش می‌آید — کلید هرگز ارسال نمی‌شود.
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "vault-upload", 40, 60 * 60_000);
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
        { ok: false, error: "این فرمت پذیرفته نمی‌شود. فرمت‌های مجاز: PDF، تصویر (PNG/JPEG/WEBP/HEIC)، Word، ZIP و متن ساده." },
        { status: 415 },
      );
    }

    const encrypted = String(form.get("encrypted") ?? "0") === "1";
    let kdfSalt: string | null = null;
    let keyCheck: string | null = null;
    if (encrypted) {
      kdfSalt = String(form.get("kdfSalt") ?? "");
      keyCheck = String(form.get("keyCheck") ?? "");
      if (!isShortHex(kdfSalt) || !isShortHex(keyCheck)) {
        return NextResponse.json(
          { ok: false, error: "برای سند رمزنگاری‌شده، salt و اثر کلید معتبر الزامی است." },
          { status: 422 },
        );
      }
      kdfSalt = kdfSalt.toLowerCase();
      keyCheck = keyCheck.toLowerCase();
    }

    const categoryRaw = String(form.get("category") ?? "").trim();
    const category = (CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : "سایر";

    const buffer = Buffer.from(await file.arrayBuffer());
    const [inserted] = await db
      .insert(vaultDocuments)
      .values({
        userPhone: user.phone,
        name: sanitizeName(file.name),
        category,
        mime,
        size: buffer.length,
        encrypted,
        kdfSalt,
        keyCheck,
        data: buffer,
      })
      .returning({
        id: vaultDocuments.id,
        name: vaultDocuments.name,
        category: vaultDocuments.category,
        size: vaultDocuments.size,
        encrypted: vaultDocuments.encrypted,
        createdAt: vaultDocuments.createdAt,
      });

    return NextResponse.json({ ok: true, document: inserted });
  } catch (err) {
    console.error("[dadban] vault POST failed:", err);
    return dbUnavailable();
  }
}

/* ---------------------------------- GET ---------------------------------- */

/**
 * GET /api/vault        → فهرست متادیتای اسناد کاربر (بدون ستون data)
 * GET /api/vault?id=N   → دانلود بایت‌های سند — فقط مالک (userPhone)
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, "vault-get", 120, 60_000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id") ?? "");

  try {
    try {
      await ensureExtendedSchema();
    } catch {
      /* best-effort */
    }

    // دانلود یک سند — فقط مالک
    if (Number.isFinite(id) && id > 0) {
      const rows = await db.select().from(vaultDocuments).where(eq(vaultDocuments.id, id)).limit(1);
      const row = rows[0];
      if (!row || row.userPhone !== user.phone) {
        return NextResponse.json({ ok: false, error: "سند یافت نشد یا به آن دسترسی ندارید." }, { status: 404 });
      }
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
          // علامت‌گذاری صادقانه: محتوا AES-GCM سمت مرورگر رمز شده و بدون عبارت عبور خوانا نیست
          ...(row.encrypted ? { "X-Vault-Encrypted": "1" } : {}),
        },
      });
    }

    // فهرست متادیتا — بدون ستون باینری data
    const rows = await db
      .select({
        id: vaultDocuments.id,
        name: vaultDocuments.name,
        category: vaultDocuments.category,
        mime: vaultDocuments.mime,
        size: vaultDocuments.size,
        encrypted: vaultDocuments.encrypted,
        kdfSalt: vaultDocuments.kdfSalt,
        keyCheck: vaultDocuments.keyCheck,
        createdAt: vaultDocuments.createdAt,
      })
      .from(vaultDocuments)
      .where(eq(vaultDocuments.userPhone, user.phone))
      .orderBy(desc(vaultDocuments.createdAt))
      .limit(200);

    return NextResponse.json({ ok: true, documents: Array.isArray(rows) ? rows : [] });
  } catch (err) {
    console.error("[dadban] vault GET failed:", err);
    return dbUnavailable();
  }
}

/* --------------------------------- DELETE -------------------------------- */

/** DELETE /api/vault?id=N — فقط مالک سند */
export async function DELETE(req: Request) {
  const limited = rateLimit(req, "vault-delete", 60, 60_000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id") ?? "");
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "شناسهٔ سند نامعتبر است." }, { status: 422 });
  }

  try {
    try {
      await ensureExtendedSchema();
    } catch {
      /* best-effort */
    }

    const deleted = await db
      .delete(vaultDocuments)
      .where(and(eq(vaultDocuments.id, id), eq(vaultDocuments.userPhone, user.phone)))
      .returning({ id: vaultDocuments.id });

    if (!deleted.length) {
      return NextResponse.json({ ok: false, error: "سند یافت نشد یا به آن دسترسی ندارید." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[dadban] vault DELETE failed:", err);
    return dbUnavailable();
  }
}
