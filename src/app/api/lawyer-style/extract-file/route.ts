// ============================================================
// دادورزان — استخراج متن از فایل نمونهٔ نگارش وکیل (docx/pdf/txt/عکس)
// همان زیرساخت استخراج قرارداد (extractContractFile) با سقف سبک‌تر
// تا نمونه‌های وکیل بدون خستگی OCR شوند.
// ============================================================

import { rateLimit, clientIp } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/user-auth";
import { isLawyerSideRole } from "@/lib/roles";
import { extractContractFile } from "@/lib/extract-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
  if (!isLawyerSideRole(user.role) && user.role !== "staff" && user.role !== "supervisor") {
    return Response.json({ ok: false, error: "این بخش مخصوص حساب‌های وکیل است." }, { status: 403 });
  }

  const limited = rateLimit(req, "style-file", 20, 60 * 60_000, clientIp(req));
  if (limited) return limited;

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return Response.json({ ok: false, error: "بدنهٔ درخواست نامعتبر است." }, { status: 422 });
  }
  if (!file) return Response.json({ ok: false, error: "فایلی ارسال نشده است." }, { status: 422 });

  try {
    const extracted = await extractContractFile(file);
    return Response.json({ ok: true, text: extracted.text.slice(0, 1500), chars: extracted.chars, name: file.name });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message || "استخراج متن از فایل ناموفق بود." }, { status: 422 });
  }
}
