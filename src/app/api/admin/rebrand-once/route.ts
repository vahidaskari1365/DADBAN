import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const runtime = "nodejs";

/**
 * مسیر نگهداری یک‌بارمصرف — جایگزینی نام برند قدیمی با جدید در محتوای
 * دیتابیس پروداکشن (جداول تحریریه‌ای؛ UGC کاربران دست‌نخورده می‌ماند) و
 * پاک‌سازی ردیف‌های کهنهٔ کش ترجمه (content_translations) تا tdyn دوباره
 * با پرامپت برند جدید ترجمه کند. پس از اجرا، این مسیر و توکنش حذف می‌شوند.
 */

const P = "دادبان";
const R = "دادورزان";

const TEXT_TARGETS: Array<[string, string[]]> = [
  ["articles", ["title", "excerpt", "content", "quick_answer", "faq", "image_alt", "author", "author_role"]],
  ["qa_questions", ["question", "body", "answer"]],
  ["service_categories", ["name", "description"]],
  ["managed_services", ["title", "short_description", "description"]],
  ["contracts", ["title", "description", "use_case"]],
  ["law_facts", ["keywords", "title", "value"]],
  ["lawyers", ["bio", "about"]],
  ["reviews", ["comment"]],
  ["app_users", ["name"]],
];

const ARRAY_TARGETS: Array<[string, string[]]> = [
  ["contracts", ["risks", "key_clauses", "steps"]],
  ["lawyers", ["specialties", "services"]],
];

const JSON_TARGETS: Array<[string, string[]]> = [
  ["managed_services", ["form_fields", "required_docs"]],
];

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = process.env.REBRAND_TOKEN ?? "";
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const report: Record<string, number> = {};
  try {
    for (const [table, cols] of TEXT_TARGETS) {
      for (const col of cols) {
        const res = await db.execute(
          sql.raw(
            `UPDATE ${table} SET ${col} = replace(${col}, '${P}', '${R}') WHERE ${col} LIKE '%${P}%'`,
          ),
        );
        report[`${table}.${col}`] = res.rowCount ?? 0;
      }
    }
    for (const [table, cols] of ARRAY_TARGETS) {
      for (const col of cols) {
        const res = await db.execute(
          sql.raw(
            `UPDATE ${table} SET ${col} = array_replace(${col}, '${P}', '${R}') WHERE '${P}' = ANY(${col})`,
          ),
        );
        report[`${table}.${col}`] = res.rowCount ?? 0;
      }
    }
    for (const [table, cols] of JSON_TARGETS) {
      for (const col of cols) {
        const res = await db.execute(
          sql.raw(
            `UPDATE ${table} SET ${col} = (replace(${col}::text, '${P}', '${R}'))::jsonb WHERE ${col}::text LIKE '%${P}%'`,
          ),
        );
        report[`${table}.${col}`] = res.rowCount ?? 0;
      }
    }
    // کش ترجمهٔ کهنه: کلیدهایی که دیگر وجود ندارند + مقادیری با برند قدیمی
    const del = await db.execute(
      sql.raw(
        `DELETE FROM content_translations WHERE key LIKE '%${P}%' OR value LIKE '%${P}%' OR value LIKE '%Dadban%' OR value LIKE '%DADBAN%'`,
      ),
    );
    report["content_translations.deleted"] = del.rowCount ?? 0;
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), report },
      { status: 500 },
    );
  }
}
