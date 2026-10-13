/**
 * فروشگاه محتوای سایت — منبع واحد خواندن بخش‌های محتوایی وردپرس‌مانند.
 *
 * قرارداد سینک:
 *  - اول دیتابیس خوانده می‌شود (همان چیزی که ادمین ویرایش می‌کند).
 *  - اگر جدول خالی بود یا دیتابیس در دسترس نبود → fallback به محتوای تحریریهٔ
 *    ثابت (@/lib/content) تا صفحه هرگز خالی/خراب نشود.
 *  - فیلدهای فهرستی در DB با «،» ذخیره شده‌اند و اینجا به آرایه برمی‌گردند.
 */

import { db } from "@/db";
import { glossaryTerms, laws, judgments, legalForms, membershipPlans } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { GLOSSARY, LAWS, JUDGMENTS, LEGAL_FORMS, type GlossaryTerm, type Law, type Judgment, type LegalForm } from "@/lib/content";
import { PLANS_CATALOG, type PlanCatalogItem } from "@/lib/plans-catalog";

/** «الف، ب» → ["الف","ب"] — هم «،» فارسی هم «,» لاتین */
const csv = (value: string | null | undefined): string[] =>
  String(value ?? "")
    .split(/[،,]/)
    .map((x) => x.trim())
    .filter(Boolean);

/* ------------------------------ واژه‌نامه ------------------------------ */
export async function getGlossary(): Promise<GlossaryTerm[]> {
  try {
    const rows = await db.select().from(glossaryTerms).orderBy(asc(glossaryTerms.sortOrder), asc(glossaryTerms.id));
    if (!rows.length) return GLOSSARY;
    return rows.map((r) => ({
      slug: r.slug,
      term: r.term,
      simple: r.simple,
      pro: r.pro,
      example: r.example,
      related: csv(r.related),
    }));
  } catch {
    return GLOSSARY;
  }
}

export async function getGlossaryEntry(slug: string): Promise<GlossaryTerm | null> {
  try {
    const [row] = await db.select().from(glossaryTerms).where(eq(glossaryTerms.slug, slug)).limit(1);
    if (!row) return GLOSSARY.find((x) => x.slug === slug) ?? null;
    return { slug: row.slug, term: row.term, simple: row.simple, pro: row.pro, example: row.example, related: csv(row.related) };
  } catch {
    return GLOSSARY.find((x) => x.slug === slug) ?? null;
  }
}

/* ------------------------------- قوانین ------------------------------- */
export async function getLaws(): Promise<Law[]> {
  try {
    const rows = await db.select().from(laws).orderBy(asc(laws.sortOrder), asc(laws.id));
    if (!rows.length) return LAWS;
    return rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      year: r.year,
      authority: r.authority,
      status: r.status,
      subjects: csv(r.subjects),
      summary: r.summary,
    }));
  } catch {
    return LAWS;
  }
}

export async function getLawEntry(slug: string): Promise<Law | null> {
  try {
    const [row] = await db.select().from(laws).where(eq(laws.slug, slug)).limit(1);
    if (!row) return LAWS.find((x) => x.slug === slug) ?? null;
    return { slug: row.slug, name: row.name, year: row.year, authority: row.authority, status: row.status, subjects: csv(row.subjects), summary: row.summary };
  } catch {
    return LAWS.find((x) => x.slug === slug) ?? null;
  }
}

/* --------------------------- آرای قضایی --------------------------- */
export async function getJudgments(): Promise<Judgment[]> {
  try {
    const rows = await db.select().from(judgments).orderBy(asc(judgments.sortOrder), asc(judgments.id));
    if (!rows.length) return JUDGMENTS;
    return rows.map((r) => ({ slug: r.slug, title: r.title, court: r.court, date: r.date, subject: r.subject, summary: r.summary }));
  } catch {
    return JUDGMENTS;
  }
}

export async function getJudgmentEntry(slug: string): Promise<Judgment | null> {
  try {
    const [row] = await db.select().from(judgments).where(eq(judgments.slug, slug)).limit(1);
    if (!row) return JUDGMENTS.find((x) => x.slug === slug) ?? null;
    return { slug: row.slug, title: row.title, court: row.court, date: row.date, subject: row.subject, summary: row.summary };
  } catch {
    return JUDGMENTS.find((x) => x.slug === slug) ?? null;
  }
}

/* --------------------------- فرم‌های حقوقی --------------------------- */
export async function getLegalForms(): Promise<LegalForm[]> {
  try {
    const rows = await db.select().from(legalForms).orderBy(asc(legalForms.sortOrder), asc(legalForms.id));
    if (!rows.length) return LEGAL_FORMS;
    return rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      desc: r.description,
      docs: csv(r.docs),
      steps: csv(r.steps),
      icon: r.icon as LegalForm["icon"],
    }));
  } catch {
    return LEGAL_FORMS;
  }
}

export async function getLegalFormEntry(slug: string): Promise<LegalForm | null> {
  try {
    const [row] = await db.select().from(legalForms).where(eq(legalForms.slug, slug)).limit(1);
    if (!row) return LEGAL_FORMS.find((x) => x.slug === slug) ?? null;
    return { slug: row.slug, name: row.name, desc: row.description, docs: csv(row.docs), steps: csv(row.steps), icon: row.icon as LegalForm["icon"] };
  } catch {
    return LEGAL_FORMS.find((x) => x.slug === slug) ?? null;
  }
}

/* --------------------------- پلن‌های عضویت --------------------------- */
export async function getMembershipPlans(): Promise<PlanCatalogItem[]> {
  try {
    const rows = await db.select().from(membershipPlans).orderBy(asc(membershipPlans.sortOrder), asc(membershipPlans.id));
    // جدول کاملاً خالی = نصب تازه (سید اولیه هنوز انجام نشده) → کاتالوگ تحریریه
    if (!rows.length) return PLANS_CATALOG;
    // رکورد هست ولی همهٔ پلن‌ها غیرفعال/حذف‌شده توسط ادمین → خالی برمی‌گردد
    // (صفحهٔ /plans پیام «پلن فعالی ثبت نشده» نشان می‌دهد؛ نه پلن‌های قدیمی)
    return rows.filter((r) => r.active).map((r) => ({
      key: r.key,
      name: r.name,
      icon: r.icon as PlanCatalogItem["icon"],
      price: r.price,
      desc: r.desc,
      features: csv(r.features),
      cta: r.cta,
      href: r.href,
      highlight: r.highlight,
    }));
  } catch {
    return PLANS_CATALOG;
  }
}
