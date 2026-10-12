// ============================================================
// دادورزان — «سبک اختصاصی وکیل»: پروفایل سبک نگارش هر وکیل
// سیستم باید مثل خودِ وکیل بنویسد، نه مثل یک مدل عمومی.
// این ماژول منبع واحد سبک است و در «دادخواست‌ساز»، «میز پرونده»
// و هر تولید سند آینده به‌صورت خودکار به پرامپت تزریق می‌شود.
// الگوی ماژول‌های دیگر پروژه: بدون کلید/بدون جدول هم degrade می‌شود.
// ============================================================

import "server-only";
import { db } from "@/db";
import { lawyerStyle } from "@/db/schema";
import { eq } from "drizzle-orm";

export type StyleSample = { name: string; text: string };

export interface StyleProfile {
  tone: "formal" | "simple" | "mixed";
  fixedOpening: string;
  fixedClosing: string;
  samples: StyleSample[];
  traits: string;
}

export const MAX_SAMPLES = 3;
export const MAX_SAMPLE_CHARS = 1500;
export const MAX_FIXED_CHARS = 700;

const TONE_FA: Record<string, string> = {
  formal: "رسمیِ حقوقی (ادبیات محافل قضایی، جمله‌های کامل، پرهیز از محاوره)",
  simple: "سادهٔ حقوقی (روشن و دقیق، جملات کوتاه‌تر، قابل فهم برای غیرحقوقدان)",
  mixed: "ترکیبی (متن حقوقی رسمی با توضیح‌های ساده‌تر در صورت نیاز)",
};

/** دریافت پروفایل سبک کاربر — بدون جدول/بدون رکورد = null (هرگز خطا به صفحه نمی‌دهد) */
export async function getLawyerStyleByUser(userId: number | null | undefined): Promise<StyleProfile | null> {
  if (!userId) return null;
  try {
    const [row] = await db.select().from(lawyerStyle).where(eq(lawyerStyle.userId, userId)).limit(1);
    if (!row) return null;
    let samples: StyleSample[] = [];
    try {
      const parsed = JSON.parse(row.samples || "[]") as unknown;
      if (Array.isArray(parsed)) {
        samples = parsed
          .filter((s): s is StyleSample => !!s && typeof (s as StyleSample).text === "string")
          .map((s) => ({ name: String((s as StyleSample).name ?? "نمونه"), text: String((s as StyleSample).text ?? "").slice(0, MAX_SAMPLE_CHARS) }))
          .slice(0, MAX_SAMPLES);
      }
    } catch {
      samples = [];
    }
    return {
      tone: (["formal", "simple", "mixed"].includes(row.tone) ? row.tone : "formal") as StyleProfile["tone"],
      fixedOpening: row.fixedOpening || "",
      fixedClosing: row.fixedClosing || "",
      samples,
      traits: row.traits || "",
    };
  } catch (err) {
    console.error("[dadban] lawyer-style: load failed:", err);
    return null;
  }
}

/** بلاک متنی سبک برای تزریق به پرامپت سیستمی — اگر سبکی نباشد null */
export function buildStyleBlock(profile: StyleProfile | null | undefined): string | null {
  if (!profile) return null;
  const parts: string[] = [];
  const hasAnything = profile.traits.trim() || profile.fixedOpening.trim() || profile.fixedClosing.trim() || profile.samples.length > 0;
  if (!hasAnything) return null;

  parts.push("— سبک نگارش وکیلِ تنظیم‌کنندهٔ سند (این دستورالعمل‌ها الزامی است) —");
  parts.push(`لحن کلی: ${TONE_FA[profile.tone] ?? TONE_FA.formal}`);
  if (profile.traits.trim()) parts.push(`ویژگی‌های سبک او (استخراج‌شده از نمونه‌های نگارش خودش):\n${profile.traits.trim().slice(0, 1200)}`);
  if (profile.fixedOpening.trim()) parts.push(`پاراگراف/عبارت آغازین ثابت او — در صورت تناسب با موضوع، بدون تغییر یا با تطبیق جزئی در بخش شرح بیاور:\n«${profile.fixedOpening.trim().slice(0, MAX_FIXED_CHARS)}»`);
  if (profile.fixedClosing.trim()) parts.push(`پاراگراف/عبارت پایانی ثابت او — در صورت تناسب نزدیک پایان متن بیاور:\n«${profile.fixedClosing.trim().slice(0, MAX_FIXED_CHARS)}»`);
  if (profile.samples.length) {
    parts.push(`نمونهٔ نگارش خود او (فقط برای هم‌سانی لحن و نحوهٔ جمله‌بندی؛ محتوای آن را کپی نکن):`);
    for (const s of profile.samples.slice(0, 2)) {
      parts.push(`— ${s.name || "نمونه"}:\n${s.text.slice(0, 900)}`);
    }
  }
  parts.push("ساختار رسمی سند و قواعد حکم‌شده در همین پرامپت حفظ شود؛ سبک فقط بر ادبیات، جمله‌بندی و تأکیدهای متن اثر می‌گذارد.");
  return parts.join("\n");
}

/** میان‌بر: سبک کاربر را می‌گیرد و بلاک پرامپت می‌سازد */
export async function styleBlockForUser(userId: number | null | undefined): Promise<string | null> {
  const profile = await getLawyerStyleByUser(userId);
  return buildStyleBlock(profile);
}

/** اعتبارسنجی و نرمال‌سازی ورودی سبک از کلاینت */
export function normalizeStyleInput(body: {
  tone?: unknown;
  fixedOpening?: unknown;
  fixedClosing?: unknown;
  samples?: unknown;
}): { tone: StyleProfile["tone"]; fixedOpening: string; fixedClosing: string; samples: StyleSample[] } {
  const tone = ["formal", "simple", "mixed"].includes(String(body.tone)) ? (body.tone as StyleProfile["tone"]) : "formal";
  const fixedOpening = typeof body.fixedOpening === "string" ? body.fixedOpening.trim().slice(0, MAX_FIXED_CHARS) : "";
  const fixedClosing = typeof body.fixedClosing === "string" ? body.fixedClosing.trim().slice(0, MAX_FIXED_CHARS) : "";
  let samples: StyleSample[] = [];
  if (Array.isArray(body.samples)) {
    samples = body.samples
      .filter((s): s is StyleSample => !!s && typeof (s as StyleSample).text === "string" && (s as StyleSample).text.trim().length > 20)
      .slice(0, MAX_SAMPLES)
      .map((s) => ({
        name: String(s.name ?? "نمونه").slice(0, 120),
        text: s.text.trim().slice(0, MAX_SAMPLE_CHARS),
      }));
  }
  return { tone, fixedOpening, fixedClosing, samples };
}

/** پرامپت استخراج ویژگی‌های سبک از نمونه‌های نگارش وکیل */
export function buildExtractTraitsPrompt(samples: StyleSample[]): { system: string; user: string } {
  const system =
    "تو تحلیل‌گر سبک نگارش متون حقوقی فارسی هستی. کار از تو فقط «تحلیل سبک» می‌خواهد، نه قضاوت حقوقی.\n" +
    "فقط و فقط یک پاراگراف توصیفی (حداکثر ۱۰۰ کلمه) به فارسی بنویس که سبک نگارش نویسنده را خلاصه کند:\n" +
    "ساختار جمله‌ها، سطح رسمیت، نحوهٔ استناد به مواد، استفاده از عبارت‌های خاص، ترتیب استدلال، لحن نسبت به مخاطب.\n" +
    "بدون مقدمه، بدون عناوین، بدون فهرست — فقط همان یک پاراگراف.";
  const user = samples.map((s, i) => `نمونهٔ ${i + 1} (${s.name || "بدون نام"}):\n${s.text}`).join("\n\n");
  return { system, user };
}
