import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyerVerifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit } from "@/lib/api-security";
import { ensureProfileSchema, ensureExtendedSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** سقف حجم هر فایل — ۵ مگابایت (ذخیره در دیتابیس به‌صورت bytea، همان الگوی اسناد پرونده) */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** allowlist صادقانهٔ فرمت مدارک — خارج از این لیست با پیام روشن رد می‌شود */
const ALLOWED_MIME: Record<string, true> = {
  "application/pdf": true,
  "image/png": true,
  "image/jpeg": true,
  "image/webp": true,
  "image/heic": true,
  "image/heif": true,
};

/** وکیلِ لاگین‌شده با پروفایل متصل — else null */
async function requireLawyer() {
  const user = await getCurrentUser();
  if (!user || user.role !== "lawyer" || !user.lawyerId) return null;
  return user;
}

/**
 * POST /api/lawyer/verification — ارسال مدارک احراز هویت (multipart/form-data):
 *   license (الزامی) — پروانهٔ وکالت، idcard (الزامی) — کارت ملی، degree (اختیاری)، note
 * اگر درخواست در حال بررسی‌ای وجود داشته باشد خطای شفاف برمی‌گردد؛
 * پس از «رد» شدن می‌تواند مدارک اصلاح‌شده را دوباره بفرستد.
 */
export async function POST(req: Request) {
  const user = await requireLawyer();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const limited = rateLimit(req, "lawyer-verification", 5, 60 * 60_000, String(user.id));
  if (limited) return limited;

  try {
    await ensureProfileSchema();
    await ensureExtendedSchema();
  } catch {
    /* migration best-effort */
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "bad form" }, { status: 400 });
  }

  const license = form.get("license");
  const idcard = form.get("idcard");
  const degree = form.get("degree");
  const picked: { slot: "license" | "id" | "degree"; file: File }[] = [];
  if (license instanceof File && license.size > 0) picked.push({ slot: "license", file: license });
  if (idcard instanceof File && idcard.size > 0) picked.push({ slot: "id", file: idcard });
  if (degree instanceof File && degree.size > 0) picked.push({ slot: "degree", file: degree });

  if (!picked.some((f) => f.slot === "license") || !picked.some((f) => f.slot === "id")) {
    return NextResponse.json({ ok: false, error: "بارگذاری پروانهٔ وکالت و کارت ملی الزامی است." }, { status: 422 });
  }
  for (const { file } of picked) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: "حجم هر فایل باید حداکثر ۵ مگابایت باشد." }, { status: 422 });
    }
    if (!ALLOWED_MIME[file.type]) {
      return NextResponse.json({ ok: false, error: "فرمت فایل مجاز نیست — فقط PDF یا تصویر (JPG/PNG/WebP)." }, { status: 415 });
    }
  }
  const note = String(form.get("note") ?? "").trim().slice(0, 500);

  try {
    // درخواست در حال بررسی → اجازهٔ ارسال مجدد نیست (پس از «رد» می‌تواند دوباره بفرستد)
    const existing = await db
      .select({ id: lawyerVerifications.id })
      .from(lawyerVerifications)
      .where(and(eq(lawyerVerifications.lawyerId, user.lawyerId as number), eq(lawyerVerifications.status, "pending")))
      .limit(1);
    if (existing.length) {
      return NextResponse.json({ ok: false, error: "درخواست فعلی شما در انتظار بررسی است؛ لطفاً منتظر نتیجه بمانید." }, { status: 409 });
    }

    const bySlot = (slot: "license" | "id" | "degree") => picked.find((f) => f.slot === slot)?.file ?? null;
    const licenseFile = bySlot("license");
    const idFile = bySlot("id");
    const degreeFile = bySlot("degree");

    const [created] = await db
      .insert(lawyerVerifications)
      .values({
        lawyerId: user.lawyerId as number,
        userId: user.id,
        status: "pending",
        licenseName: licenseFile ? licenseFile.name.slice(0, 180) : "",
        licenseMime: licenseFile ? licenseFile.type : "",
        licenseSize: licenseFile ? licenseFile.size : 0,
        licenseData: licenseFile ? Buffer.from(await licenseFile.arrayBuffer()) : null,
        idName: idFile ? idFile.name.slice(0, 180) : "",
        idMime: idFile ? idFile.type : "",
        idSize: idFile ? idFile.size : 0,
        idData: idFile ? Buffer.from(await idFile.arrayBuffer()) : null,
        degreeName: degreeFile ? degreeFile.name.slice(0, 180) : "",
        degreeMime: degreeFile ? degreeFile.type : "",
        degreeSize: degreeFile ? degreeFile.size : 0,
        degreeData: degreeFile ? Buffer.from(await degreeFile.arrayBuffer()) : null,
        note,
      })
      .returning({ id: lawyerVerifications.id });

    return NextResponse.json({ ok: true, id: created?.id ?? null });
  } catch {
    return NextResponse.json({ ok: false, error: "خطا در ارسال مدارک — دوباره تلاش کنید." }, { status: 500 });
  }
}
