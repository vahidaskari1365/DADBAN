import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyers, contracts, qaQuestions, cases, consultations, tickets, articles, qaSubmissions, payments, lawyerAvailability, managedServices, serviceCategories, glossaryTerms, laws, judgments, legalForms, membershipPlans, siteContent, forumTopics, forumReplies } from "@/db/schema";
import { desc, eq, asc } from "drizzle-orm";
import { getAdminSession, hasPerm } from "@/lib/admin-auth";

export const runtime = "nodejs";

const TABLES: Record<string, { table: any; orderBy: any; searchCol?: any }> = {
  lawyers: { table: lawyers, orderBy: desc(lawyers.createdAt), searchCol: lawyers.name },
  contracts: { table: contracts, orderBy: null, searchCol: contracts.title },
  "qa": { table: qaQuestions, orderBy: desc(qaQuestions.createdAt), searchCol: qaQuestions.question },
  cases: { table: cases, orderBy: desc(cases.createdAt), searchCol: cases.caseNumber },
  consultations: { table: consultations, orderBy: desc(consultations.createdAt), searchCol: consultations.clientName },
  tickets: { table: tickets, orderBy: desc(tickets.createdAt), searchCol: tickets.ticketNumber },
  articles: { table: articles, orderBy: desc(articles.publishedAt), searchCol: articles.title },
  "qa-submissions": { table: qaSubmissions, orderBy: desc(qaSubmissions.createdAt), searchCol: qaSubmissions.question },
  payments: { table: payments, orderBy: desc(payments.createdAt), searchCol: payments.reference },
  availability: { table: lawyerAvailability, orderBy: null, searchCol: undefined },
  "service-categories": { table: serviceCategories, orderBy: desc(serviceCategories.sortOrder), searchCol: serviceCategories.name },
  "managed-services": { table: managedServices, orderBy: desc(managedServices.sortOrder), searchCol: managedServices.title },
  /* --- بخش‌های محتوایی وردپرس‌مانند --- */
  glossary: { table: glossaryTerms, orderBy: asc(glossaryTerms.sortOrder), searchCol: glossaryTerms.term },
  laws: { table: laws, orderBy: asc(laws.sortOrder), searchCol: laws.name },
  judgments: { table: judgments, orderBy: asc(judgments.sortOrder), searchCol: judgments.title },
  "legal-forms": { table: legalForms, orderBy: asc(legalForms.sortOrder), searchCol: legalForms.name },
  plans: { table: membershipPlans, orderBy: asc(membershipPlans.sortOrder), searchCol: membershipPlans.name },
  /* --- CMS محتوای صفحات + تالار گفتگو --- */
  "site-content": { table: siteContent, orderBy: asc(siteContent.sortOrder), searchCol: siteContent.title },
  "forum-topics": { table: forumTopics, orderBy: desc(forumTopics.createdAt), searchCol: forumTopics.title },
  "forum-replies": { table: forumReplies, orderBy: desc(forumReplies.createdAt), searchCol: forumReplies.body },
};

/** نقشهٔ resource → کلید دسترسی کاتالوگ ادمین */
const PERMS: Record<string, string> = {
  lawyers: "lawyers",
  availability: "lawyers",
  contracts: "contracts",
  qa: "qa",
  "qa-submissions": "qa",
  cases: "cases",
  consultations: "consultations",
  tickets: "tickets",
  articles: "articles",
  payments: "finance",
  "service-categories": "services",
  "managed-services": "services",
  glossary: "knowledge",
  laws: "knowledge",
  judgments: "knowledge",
  "legal-forms": "knowledge",
  plans: "knowledge",
  "site-content": "content",
  "forum-topics": "forum",
  "forum-replies": "forum",
};

/**
 * نرمال‌سازی فیلدها قبل از نوشتن در دیتابیس:
 * ستون‌های آرایه‌ای (text[]) فرم ادمین را رشتهٔ csv می‌فرستد («طلاق، مهریه»)؛
 * درج رشتهٔ خام در ستون آرایهٔ PostgreSQL خطای malformed array literal می‌دهد و ذخیره شکست می‌خورد.
 * این تابع هر فیلد آرایه‌ای را (رشته با «،» یا «,» یا خط جدید، یا آرایهٔ موجود) به آرایهٔ تمیز تبدیل می‌کند.
 */
function normalizeFields(table: any, fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    const col = table[key];
    if (col && col.dataType === "array") {
      if (Array.isArray(value)) {
        out[key] = value.map((x) => String(x).trim()).filter(Boolean);
      } else if (typeof value === "string") {
        out[key] = value.split(/[،,\n]/).map((s) => s.trim()).filter(Boolean);
      } else if (value === null || value === undefined || value === "") {
        out[key] = [];
      } else {
        out[key] = value;
      }
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** گارد مشترک — خروجی: NextResponse خطا یا null */
async function guard(resource: string): Promise<NextResponse | null> {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const perm = PERMS[resource];
  if (perm && !hasPerm(session, perm)) {
    return NextResponse.json({ ok: false, error: "شما دسترسی به این بخش را ندارید." }, { status: 403 });
  }
  return null;
}

export async function GET(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const denied = await guard(resource);
  if (denied) return denied;
  const cfg = TABLES[resource];
  if (!cfg) return NextResponse.json({ ok: false, error: "unknown resource" }, { status: 404 });
  try {
    const rows = await db.select().from(cfg.table).orderBy(cfg.orderBy).limit(200);
    return NextResponse.json({ ok: true, rows });
  } catch {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const denied = await guard(resource);
  if (denied) return denied;
  const cfg = TABLES[resource];
  if (!cfg) return NextResponse.json({ ok: false, error: "unknown resource" }, { status: 404 });
  let body: { fields?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }
  const allowed = new Set(Object.keys(cfg.table));
  allowed.delete("id");
  const fields = Object.fromEntries(Object.entries(body.fields ?? {}).filter(([k]) => allowed.has(k)));
  if (!Object.keys(fields).length) return NextResponse.json({ ok: false, error: "no fields" }, { status: 400 });
  const normalized = normalizeFields(cfg.table, fields);
  try {
    const inserted = (await db.insert(cfg.table).values(normalized as any).returning()) as any[];
    return NextResponse.json({ ok: true, row: inserted[0] });
  } catch {
    return NextResponse.json({ ok: false, error: "create failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const denied = await guard(resource);
  if (denied) return denied;
  const cfg = TABLES[resource];
  if (!cfg) return NextResponse.json({ ok: false, error: "unknown resource" }, { status: 404 });
  let body: { id: number; changes: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }
  const allowed = new Set(Object.keys(cfg.table));
  allowed.delete("id");
  const changes = Object.fromEntries(Object.entries(body.changes ?? {}).filter(([k]) => allowed.has(k)));
  if (!Object.keys(changes).length) return NextResponse.json({ ok: false, error: "no changes" }, { status: 400 });
  const normalized = normalizeFields(cfg.table, changes);
  try {
    await db.update(cfg.table).set(normalized).where(eq(cfg.table.id, Number(body.id)));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "update failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const denied = await guard(resource);
  if (denied) return denied;
  const cfg = TABLES[resource];
  if (!cfg) return NextResponse.json({ ok: false, error: "unknown resource" }, { status: 404 });
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  try {
    await db.delete(cfg.table).where(eq(cfg.table.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "delete failed" }, { status: 500 });
  }
}
