// ============================================================
// دادبان — «میز اختصاصی پرونده»: تحلیل پرونده به‌عنوان یک کل
// وکیل وارد یک پرونده می‌شود؛ سیستم متن همهٔ اسناد را کنار هم
// می‌خواند، خط زمان و ادعاها را می‌سازد، تناقض‌های احتمالی را با
// ذکر سند نشان می‌دهد، قوت/ضعف را جدا می‌کند و چک‌لیست مدارک ناقص
// و گام بعدی پیشنهاد می‌دهد — و از دل همین، «لایحهٔ دفاعیه» تولید
// می‌شود. همه‌چیز با چارچوب صداقت: تناقض‌ها «احتمالی» و نیازمند
// راستی‌آزمایی وکیل‌اند؛ مبنای هر یافته همیشه نام سند ذکر می‌شود.
// ============================================================

import "server-only";
import { db } from "@/db";
import { cases, caseDocuments, caseDocTexts, caseAnalyses } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { extractContractFile } from "@/lib/extract-text";

/* ── سقف‌های بودجهٔ توکن: تعداد سند × کاراکتر سند ── */
export const MAX_DOCS_IN_CONTEXT = 10;
export const MAX_DOC_CHARS = 1500;

export interface CaseDeskDoc {
  documentId: number;
  name: string;
  mime: string;
  size: number;
  /** تعداد کاراکتر متنِ کش‌شده — null یعنی هنوز استخراج نشده */
  chars: number | null;
}

export interface CaseAnalysisSections {
  overview: string;
  strengths: string;
  weaknesses: string;
  contradictions: string;
  missingDocs: string;
  nextSteps: string;
}

export const SECTION_TITLES: { key: keyof CaseAnalysisSections; title: string }[] = [
  { key: "overview", title: "خلاصهٔ پرونده و خط زمان" },
  { key: "strengths", title: "نقاط قوت" },
  { key: "weaknesses", title: "نقاط ضعف و ریسک‌ها" },
  { key: "contradictions", title: "تناقض‌های احتمالی بین اسناد" },
  { key: "missingDocs", title: "مدارک ناقص و نیازمند تکمیل" },
  { key: "nextSteps", title: "گام‌های بعدی پیشنهادی" },
];

/* ────────────── دسترسی ────────────── */

export type CaseDeskAccess = { ok: true; case: typeof cases.$inferSelect } | { ok: false; reason: "not-found" | "forbidden" };

/**
 * قاعدهٔ دسترسی میز پرونده — هم‌قاعدهٔ «پرونده‌های من» در پنل وکیل:
 *  - وکیل اصلی (lawyer) → همهٔ پرونده‌های پلتفرم (همان برد داشبورد)
 *  - عضو تیم با مجوز cases → فقط پرونده‌های سپرده‌شده به خودش
 *  - staff/supervisor → همهٔ پرونده‌ها
 */
export async function loadCaseForDesk(
  user: { id: number; role: string; lawyerId: number | null },
  caseNumber: string,
): Promise<CaseDeskAccess> {
  let row: typeof cases.$inferSelect | null = null;
  try {
    const rows = await db.select().from(cases).where(eq(cases.caseNumber, caseNumber)).limit(1);
    row = rows[0] ?? null;
  } catch (err) {
    console.error("[dadban] case-desk: load case failed:", err);
    return { ok: false, reason: "not-found" };
  }
  if (!row) return { ok: false, reason: "not-found" };

  if (user.role === "lawyer" || user.role === "staff" || user.role === "supervisor") {
    return { ok: true, case: row };
  }
  if (user.role === "team") {
    const perms = (user as unknown as { teamPermissions?: string }).teamPermissions ?? "";
    if (!perms.split(",").map((s) => s.trim()).includes("cases")) return { ok: false, reason: "forbidden" };
    try {
      // عضو تیم فقط پرونده‌های سپرده‌شده به خودش را می‌بیند (هم‌قاعدهٔ داشبورد)
      const { teamCaseAssignments } = await import("@/db/schema");
      const mine = await db
        .select({ id: teamCaseAssignments.id })
        .from(teamCaseAssignments)
        .where(and(eq(teamCaseAssignments.memberUserId, user.id), eq(teamCaseAssignments.caseId, row.id)))
        .limit(1);
      if (mine.length > 0) return { ok: true, case: row };
    } catch {
      return { ok: false, reason: "forbidden" };
    }
    return { ok: false, reason: "forbidden" };
  }
  return { ok: false, reason: "forbidden" };
}

/* ────────────── اسناد و کش متن ────────────── */

export async function listCaseDeskDocs(caseId: number): Promise<CaseDeskDoc[]> {
  try {
    const docs = await db
      .select({ id: caseDocuments.id, name: caseDocuments.name, mime: caseDocuments.mime, size: caseDocuments.size })
      .from(caseDocuments)
      .where(eq(caseDocuments.caseId, caseId))
      .orderBy(desc(caseDocuments.createdAt))
      .limit(50);
    const texts = await db
      .select({ documentId: caseDocTexts.documentId, chars: caseDocTexts.chars })
      .from(caseDocTexts)
      .where(eq(caseDocTexts.caseId, caseId));
    const map = new Map(texts.map((t) => [t.documentId, t.chars]));
    return docs.map((d) => ({ documentId: d.id, name: d.name, mime: d.mime, size: d.size, chars: map.has(d.id) ? (map.get(d.id) as number) : null }));
  } catch (err) {
    console.error("[dadban] case-desk: list docs failed:", err);
    return [];
  }
}

/**
 * استخراج متن اسناد پرونده (با کش در case_doc_texts).
 * هر سند که متن کش‌شده داشته باشد دوباره OCR/parse نمی‌شود.
 * خروجی: گزارش سند به سند موفقیت/خطا (خطاها فهرست می‌شوند اما کل عملیات را نمی‌شکنند).
 */
export async function extractCaseDocs(caseId: number): Promise<{ results: { name: string; ok: boolean; chars?: number; error?: string }[] }> {
  const docs = await db
    .select({ id: caseDocuments.id, name: caseDocuments.name, mime: caseDocuments.mime, size: caseDocuments.size, data: caseDocuments.data })
    .from(caseDocuments)
    .where(eq(caseDocuments.caseId, caseId))
    .orderBy(desc(caseDocuments.createdAt))
    .limit(50);

  const cached = await db.select({ documentId: caseDocTexts.documentId }).from(caseDocTexts).where(eq(caseDocTexts.caseId, caseId));
  const cachedIds = new Set(cached.map((c) => c.documentId));

  const results: { name: string; ok: boolean; chars?: number; error?: string }[] = [];
  for (const doc of docs) {
    if (cachedIds.has(doc.id)) {
      results.push({ name: doc.name, ok: true });
      continue;
    }
    try {
      const bytes = new Uint8Array(doc.data as Buffer);
      const file = new File([bytes], doc.name || `doc-${doc.id}`, { type: doc.mime || "application/octet-stream" });
      const extracted = await extractContractFile(file);
      const text = extracted.text.slice(0, MAX_DOC_CHARS * 2); // در کش تا ۳۰۰۰ کاراکتر نگه می‌داریم
      await db
        .insert(caseDocTexts)
        .values({ caseId, documentId: doc.id, text, chars: text.length, updatedAt: new Date() })
        .onConflictDoUpdate({ target: caseDocTexts.documentId, set: { text, chars: text.length, updatedAt: new Date() } });
      results.push({ name: doc.name, ok: true, chars: text.length });
    } catch (err) {
      const msg = (err as Error)?.message ?? "خطای نامشخص در استخراج";
      results.push({ name: doc.name, ok: false, error: msg.slice(0, 160) });
    }
  }
  return { results };
}

/* ────────────── ساخت بافتار پرونده ────────────── */

/** سقف کاراکتر هر پیام context — هماهنگ با normalizeMessages در llm.ts (۸۰۰۰) */
const CONTEXT_CHUNK_CHARS = 6500;

/** بافتار متنی پرونده به‌صورت چانک‌های ≤۶.۵k — سقف‌دار و شماره‌دار */
export async function buildCaseContextChunks(
  caseId: number,
): Promise<{ caseRow: typeof cases.$inferSelect; chunks: string[]; docCount: number }> {
  const [caseRow] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  const docs = await db
    .select({ documentId: caseDocTexts.documentId, text: caseDocTexts.text })
    .from(caseDocTexts)
    .where(eq(caseDocTexts.caseId, caseId))
    .limit(MAX_DOCS_IN_CONTEXT);
  const names = await db.select({ id: caseDocuments.id, name: caseDocuments.name }).from(caseDocuments).where(eq(caseDocuments.caseId, caseId)).limit(60);
  const nameMap = new Map(names.map((n) => [n.id, n.name]));

  const header = [
    "مشخصات پرونده در سامانه:",
    `- موضوع: ${caseRow?.subject ?? "—"}`,
    `- شهر/استان: ${caseRow?.city ?? "—"} / ${caseRow?.province ?? "—"}`,
    `- مرحله: ${caseRow?.stage ?? "—"}`,
    `- شرح موکل: ${(caseRow?.description ?? "").slice(0, 1200)}`,
  ].join("\n");
  const parts: string[] = [header];
  if (docs.length === 0) parts.push("هیچ سندی با متن استخراج‌شده برای این پرونده موجود نیست.");
  docs.forEach((d, i) => {
    const name = nameMap.get(d.documentId) ?? `سند ${i + 1}`;
    parts.push(`─── سند ${i + 1}: «${name}» ───\n${d.text.slice(0, MAX_DOC_CHARS)}`);
  });

  // چانک‌بندی مرتب — هیچ پیامی از سقف ۸۰۰۰ کاراکتر llm.ts عبور نمی‌کند
  const joined = parts.join("\n\n");
  const chunks: string[] = [];
  for (let i = 0; i < joined.length; i += CONTEXT_CHUNK_CHARS) {
    chunks.push(joined.slice(i, i + CONTEXT_CHUNK_CHARS));
  }
  return { caseRow, chunks: chunks.slice(0, 4), docCount: docs.length };
}

/* ────────────── پرامپت‌ها ────────────── */

export function buildAnalysisSystemPrompt(): string {
  return [
    "تو کارشناس ارشد حقوقی ایران هستی و یک پروندهٔ حقوقی را «به‌عنوان یک کل» تحلیل می‌کنی.",
    "متن پرونده (مشخصات سامانه + متن استخراج‌شدهٔ اسناد) برای تو فرستاده می‌شود. خروجی را دقیقاً با این ۶ عنوان و با همان ترتیب بنویس؛ هر عنوان در یک خط و به‌صورت «### عنوان» :",
    ...SECTION_TITLES.map((s) => `### ${s.title}`),
    "",
    "قواعد الزامی:",
    "۱) زیر هر عنوان فقط بندهای کوتاه شماره‌دار بنویس (۱. ۲. ۳.) بدون مارک‌داون اضافه.",
    "۲) هر یافته باید مبنایش را ذکر کند: نام سند (همان نامی که در متن داده شده) یا «شرح موکل».",
    "۳) تناقض‌ها همیشه «احتمالی» هستند: فقط جاهایی که دو منبع در تاریخ/مبلغ/نقل قول/تعهد اختلاف دارند را بنویس و دقیقاً نقل کن که هر سند چه می‌گوید. اگر تناقضی پیدا نکردی صادقانه بنویس «در اسناد فعلی تناقض آشکاری دیده نشد».",
    "۴) مدارک ناقص: اسنادی که در این نوع دعوا معمولاً لازم است ولی در پرونده دیده نمی‌شود را فهرست کن.",
    "۵) هیچ تضمینی برای نتیجهٔ دادگاه نده؛ این تحلیل ابزار وکیل است نه رأی.",
    "۶) اگر متن اسناد کم یا ناخوانا بود، همین را در خلاصه بگو و تحلیل را مشروط کن.",
    "۷) فقط به موادی که از وجودشان مطمئنی استناد کن؛ هرگز مادهٔ ناموجود نساز.",
  ].join("\n");
}

export function buildAnalysisUserPrompt(): string {
  return "متن پرونده در پیام‌های قبل آمده است. حالا تحلیل کامل پرونده را با ساختار ۶ عنوانی بنویس، به فارسیِ حقوقی و مختصر و دقیق.";
}

/* ────────────── تحلیل افزایشی (فقط اسناد جدید + به‌روزرسانی تحلیل قبلی) ────────────── */

/**
 * بافتار «تحلیل افزایشی»: تحلیل قبلی + فقط اسنادی که بعد از آن تحلیل استخراج شده‌اند.
 * اگر سند جدیدی نباشد null برمی‌گردد (مسیر باید به تحلیل کامل برگردد).
 */
export async function buildCaseDeltaContextChunks(
  caseId: number,
  prevAnalysis: { createdAt: Date },
): Promise<{ chunks: string[]; newDocCount: number } | null> {
  const newDocs = await db
    .select({ documentId: caseDocTexts.documentId, text: caseDocTexts.text, updatedAt: caseDocTexts.updatedAt })
    .from(caseDocTexts)
    .where(and(eq(caseDocTexts.caseId, caseId), sql`${caseDocTexts.updatedAt} > ${prevAnalysis.createdAt.toISOString()}`))
    .orderBy(desc(caseDocTexts.updatedAt))
    .limit(MAX_DOCS_IN_CONTEXT);
  if (newDocs.length === 0) return null;

  const names = await db.select({ id: caseDocuments.id, name: caseDocuments.name }).from(caseDocuments).where(eq(caseDocuments.caseId, caseId)).limit(60);
  const nameMap = new Map(names.map((n) => [n.id, n.name]));

  const [caseRow] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  const header = [
    "مشخصات پرونده در سامانه:",
    `- موضوع: ${caseRow?.subject ?? "—"}`,
    `- مرحله: ${caseRow?.stage ?? "—"}`,
    `- شرح موکل: ${(caseRow?.description ?? "").slice(0, 800)}`,
  ].join("\n");
  const parts: string[] = [header];
  newDocs.forEach((d, i) => {
    const name = nameMap.get(d.documentId) ?? `سند جدید ${i + 1}`;
    parts.push(`─── سند جدید ${i + 1}: «${name}» ───\n${d.text.slice(0, MAX_DOC_CHARS)}`);
  });

  const joined = parts.join("\n\n");
  const chunks: string[] = [];
  for (let i = 0; i < joined.length; i += CONTEXT_CHUNK_CHARS) {
    chunks.push(joined.slice(i, i + CONTEXT_CHUNK_CHARS));
  }
  return { chunks: chunks.slice(0, 3), newDocCount: newDocs.length };
}

/** تحلیل قبلی به‌عنوان چانک ورودی تحلیل افزایشی (هر بخش سقف‌دار) */
export function buildPrevAnalysisChunk(prev: CaseAnalysisSections): string {
  const cap = (s: string) => (s || "—").slice(0, 700);
  return [
    "─── تحلیل قبلی پرونده (مبنای به‌روزرسانی) ───",
    ...SECTION_TITLES.map((s) => `### ${s.title}\n${cap(prev[s.key])}`),
  ].join("\n");
}

export function buildDeltaAnalysisSystemPrompt(): string {
  return [
    "تو کارشناس ارشد حقوقی ایران هستی و «تحلیل قبلی یک پرونده» را با اسناد جدید به‌روز می‌کنی.",
    "ورودی: تحلیل قبلی (۶بخشی) + مشخصات پرونده + فقط متن اسناد جدیدی که بعد از تحلیل قبلی اضافه شده‌اند.",
    "خروجی را دقیقاً با همان ۶ عنوان و با همان ترتیب بنویس؛ هر عنوان در یک خط و به‌صورت «### عنوان» :",
    ...SECTION_TITLES.map((s) => `### ${s.title}`),
    "",
    "قواعد الزامی:",
    "۱) بخش‌های قبلی که با اسناد جدید تغییری نمی‌کنند را عیناً حفظ کن (با ویرایش جزئی اگر لازم است).",
    "۲) تأثیر هر سند جدید را در بخش‌های مرتبط (خلاصه/قوت/ضعف/تناقض/مدارک ناقص/گام بعدی) بگنجان و نام سند جدید را صریح ذکر کن.",
    "۳) اگر سند جدید با سند قبلی تناقض دارد، آن را در بخش تناقض‌ها با نقل دقیق از هر دو سند بیفزا.",
    "۴) هر یافته باید مبنا داشته باشد: نام سند (قدیم یا جدید) یا «شرح موکل».",
    "۵) تناقض‌ها همیشه «احتمالی»‌اند؛ هیچ تضمینی برای نتیجهٔ دادگاه نده.",
    "۶) فقط به موادی که از وجودشان مطمئنی استناد کن؛ هرگز مادهٔ ناموجود نساز.",
  ].join("\n");
}

export function buildDeltaAnalysisUserPrompt(): string {
  return "تحلیل قبلی و اسناد جدید در پیام‌های قبل آمده است. تحلیل به‌روزشدهٔ کامل را با همان ساختار ۶ عنوانی بنویس — به فارسی حقوقی، مختصر و دقیق.";
}

/** لایحهٔ دفاعیه از دل پرونده — با سبک وکیل (بافتار جداگانه به‌صورت چانک ارسال می‌شود) */
export function buildBriefPrompts(side: "خواهان" | "خوانده", extra: string, styleBlock: string | null): { system: string; user: string } {
  const system = [
    `تو وکیل دادگستریِ باتجربهٔ ایران هستی و برای ${side === "خواهان" ? "خواهان" : "خوانده"} این پرونده یک «لایحهٔ دفاعیه» تنظیم می‌کنی.`,
    "ساختار الزامی لایحه:",
    "۱) سربرگ: «ریاست محترم دادگاه …» و جای خالی برای شماره/کلاسهٔ پرونده با [تکمیل شود].",
    "۲) «موضوع لایحه» در یک سطر.",
    "۳) شرح وقایع به‌ترتیب زمانی — فقط بر مبنای اسناد پرونده که در پیام‌های قبل آمده؛ هرجا اطلاعات لازم است [تکمیل شود].",
    "۴) استدلال‌های حقوقی شماره‌دار با استناد به مواد (فقط ماده‌های مطمئن؛ هرگز مادهٔ ناموجود نساز).",
    "۵) پاسخ به ادعاها/دفاع‌های طرف مقابل بر اساس همان اسناد.",
    "۶) درخواست نهایی از دادگاه و بند «منضمات».",
    "۷) بدون تضمین نتیجه؛ بدون جمله‌های قطعی دربارهٔ رأی.",
    "قواعد: فقط متن لایحه را بنویس؛ بدون توضیح بیرونی، بدون مارک‌داون.",
    styleBlock ? styleBlock : "",
  ]
    .filter(Boolean)
    .join("\n");
  const user = `${extra ? `نکات تکمیلی وکیل:\n${extra.slice(0, 1500)}\n` : ""}لایحهٔ دفاعیهٔ کامل را بر اساس مشخصات و اسناد پرونده (پیام‌های قبلی) تنظیم کن.`;
  return { system, user };
}

/* ────────────── پارس خروجی تحلیل ────────────── */

/** خروجی ۶ بخشی مدل را می‌شکند — اگر عنوانی نیامد خالی می‌ماند */
export function parseAnalysisSections(full: string): CaseAnalysisSections {
  const lines = full.replace(/\r\n/g, "\n").split("\n");
  const sections: Record<string, string[]> = {};
  let current = "";
  for (const line of lines) {
    const trimmed = line.trim();
    const heading = SECTION_TITLES.find((s) => {
      const norm = trimmed.replace(/^#+\s*/, "").replace(/[:：]/g, "").trim();
      return norm === s.title || norm.startsWith(s.title) || s.title.startsWith(norm);
    });
    if (heading) {
      current = heading.key;
      sections[current] = sections[current] ?? [];
      continue;
    }
    if (current) (sections[current] = sections[current] ?? []).push(line);
  }
  const pick = (k: string) => (sections[k] ?? []).join("\n").trim();
  return {
    overview: pick("overview"),
    strengths: pick("strengths"),
    weaknesses: pick("weaknesses"),
    contradictions: pick("contradictions"),
    missingDocs: pick("missingDocs"),
    nextSteps: pick("nextSteps"),
  };
}

/** آخرین تحلیل ذخیره‌شدهٔ پرونده */
export async function latestCaseAnalysis(caseId: number): Promise<CaseAnalysisSections & { id: number; createdAt: Date; docCount: number } | null> {
  try {
    const [row] = await db.select().from(caseAnalyses).where(eq(caseAnalyses.caseId, caseId)).orderBy(desc(caseAnalyses.createdAt)).limit(1);
    if (!row) return null;
    return {
      id: row.id,
      createdAt: row.createdAt,
      docCount: row.docCount,
      overview: row.overview,
      strengths: row.strengths,
      weaknesses: row.weaknesses,
      contradictions: row.contradictions,
      missingDocs: row.missingDocs,
      nextSteps: row.nextSteps,
    };
  } catch {
    return null;
  }
}
