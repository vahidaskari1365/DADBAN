// ============================================================
// دادبان — استخراج متن اسناد پرونده (با کش case_doc_texts)
// POST /api/case-desk/extract  body: { caseNumber }
// هر سند فقط بار اول OCR/parse می‌شود؛ دفعات بعد از کش خوانده می‌شود.
// ============================================================

import { rateLimit, readJson, clientIp } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/user-auth";
import { loadCaseForDesk, extractCaseDocs } from "@/lib/case-desk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, 401);

  const limited = rateLimit(req, "case-desk-extract", 12, 60 * 60_000, clientIp(req));
  if (limited) return limited;

  const body = await readJson(req, 4_096);
  const caseNumber = typeof body?.caseNumber === "string" ? body.caseNumber.trim().slice(0, 60) : "";
  if (!caseNumber) return json({ ok: false, error: "شمارهٔ پرونده ارسال نشده است." }, 422);

  const access = await loadCaseForDesk(user, caseNumber);
  if (!access.ok) {
    return json(
      { ok: false, error: access.reason === "forbidden" ? "دسترسی به این پرونده ممکن نیست." : "پرونده پیدا نشد." },
      access.reason === "forbidden" ? 403 : 404,
    );
  }

  try {
    const { results } = await extractCaseDocs(access.case.id);
    return json({ ok: true, results });
  } catch (err) {
    console.error("[dadban] case-desk extract API failed:", err);
    return json({ ok: false, error: "استخراج متن اسناد با خطا مواجه شد." }, 502);
  }
}
