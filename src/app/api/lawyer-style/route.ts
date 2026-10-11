// ============================================================
// دادبان — API سبک اختصاصی وکیل
// GET  /api/lawyer-style            → پروفایل سبک کاربر جاری
// POST /api/lawyer-style            → { action: "save" | "extract", ... }
//   save    = ذخیرهٔ پروفایل (upsert)
//   extract = استخراج traits با LLM از نمونه‌های ارسالی (بدون ذخیره)
// ============================================================

import { db } from "@/db";
import { lawyerStyle } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { isLawyerSideRole } from "@/lib/roles";
import { rateLimit, readJson, clientIp } from "@/lib/api-security";
import { askLLM } from "@/lib/llm";
import { normalizeStyleInput, buildExtractTraitsPrompt, getLawyerStyleByUser } from "@/lib/lawyer-style";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, 401);
  const profile = await getLawyerStyleByUser(user.id);
  return json({ ok: true, profile });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, 401);
  // سبک نگارش ابزار وکیل است؛ موکل‌ها نیازی به آن ندارند
  if (!isLawyerSideRole(user.role) && user.role !== "staff" && user.role !== "supervisor") {
    return json({ ok: false, error: "این بخش مخصوص حساب‌های وکیل است." }, 403);
  }

  const body = await readJson(req, 48_000);
  if (!body) return json({ ok: false, error: "بدنهٔ درخواست نامعتبر یا بیش از حد بزرگ است." }, 422);

  const action = typeof body.action === "string" ? body.action : "save";
  const norm = normalizeStyleInput(body as Record<string, unknown>);

  if (action === "extract") {
    const limited = rateLimit(req, "style-extract", 12, 60 * 60_000, clientIp(req));
    if (limited) return limited;
    if (norm.samples.length === 0) {
      return json({ ok: false, error: "برای استخراج سبک، دست‌کم یک نمونهٔ نگارش وارد کنید." }, 422);
    }
    try {
      const { system, user: userPrompt } = buildExtractTraitsPrompt(norm.samples);
      const traits = (
        (await Promise.race([
          askLLM([{ role: "user", content: userPrompt }], 600, system),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error("ai-timeout")), 50_000)),
        ])) ?? ""
      ).trim();
      if (!traits) return json({ ok: false, error: "استخراج سبک ناموفق بود. دوباره تلاش کنید." }, 502);
      return json({ ok: true, traits: traits.slice(0, 1200) });
    } catch (err) {
      console.error("[dadban] lawyer-style extract failed:", err);
      const msg = (err as Error)?.message === "ai-timeout" ? "استخراج سبک بیش از حد طول کشید. دوباره تلاش کنید." : "استخراج سبک با خطا مواجه شد. دوباره تلاش کنید.";
      return json({ ok: false, error: msg }, 502);
    }
  }

  if (action === "save") {
    const limited = rateLimit(req, "style-save", 30, 60 * 60_000, clientIp(req));
    if (limited) return limited;
    try {
      const values = {
        userId: user.id,
        tone: norm.tone,
        fixedOpening: norm.fixedOpening,
        fixedClosing: norm.fixedClosing,
        samples: JSON.stringify(norm.samples),
        updatedAt: new Date(),
      };
      const [existing] = await db.select({ id: lawyerStyle.id }).from(lawyerStyle).where(eq(lawyerStyle.userId, user.id)).limit(1);
      if (existing) {
        await db.update(lawyerStyle).set(values).where(eq(lawyerStyle.id, existing.id));
      } else {
        await db.insert(lawyerStyle).values(values);
      }
      return json({ ok: true, message: "سبک نگارش شما ذخیره شد و از این پس در تولید اسناد رعایت می‌شود." });
    } catch (err) {
      console.error("[dadban] lawyer-style save failed:", err);
      return json({ ok: false, error: "ذخیرهٔ سبک با خطا مواجه شد. بعداً تلاش کنید." }, 502);
    }
  }

  return json({ ok: false, error: "عملیات شناخته‌شده نیست." }, 422);
}
