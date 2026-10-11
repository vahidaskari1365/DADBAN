/* ============================================================================
 * دادپیو — helpers سروری مشترک پنل وکیل + APIهای portal
 * فقط سمت سرور import شود (به db وابسته است).
 * ========================================================================== */

import { db } from "@/db";
import {
  cases,
  lawyers,
  appointments,
  caseMessages,
  caseProposals,
  installments,
  platformLedger,
  payoutRequests,
} from "@/db/schema";
import { caseEvents as caseEventsTable } from "@/db/schema-marketplace";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { toJalali } from "@/lib/money";

export type LawyerRow = typeof lawyers.$inferSelect;
export type CaseRow = typeof cases.$inferSelect;

/* ------------------------------ نقش و هویت وکیل ------------------------------ */

export type LawyerContext = {
  lawyerId: number;
  lawyer: LawyerRow | null;
  demo: boolean;
  lawyerTitle: string;
};

/** تشخیص وکیل جاری از روی سشن؛ در نبود تطابق دقیق، وکیل نمونهٔ ۱ به‌عنوان محیط نمایش استفاده می‌شود. */
export async function resolveLawyerContext(user: { name: string; role: string }): Promise<LawyerContext> {
  const demo = !(user.role === "lawyer" || user.role === "trainee");
  const fallback: LawyerContext = { lawyerId: 1, lawyer: null, demo, lawyerTitle: "وکیل پایه یک دادگستری" };
  try {
    const rows = (await db.select().from(lawyers).limit(120)) as LawyerRow[];
    const list = Array.isArray(rows) ? rows : [];
    const firstName = user.name.trim().split(/\s+/)[0] ?? "";
    const matched =
      list.find((l) => l.name === user.name) ??
      (user.role === "lawyer" && firstName.length > 2 ? list.find((l) => l.name.includes(firstName)) : undefined);
    const lawyer = matched ?? list.find((l) => l.id === 1) ?? list[0] ?? null;
    return {
      lawyerId: lawyer?.id ?? 1,
      lawyer,
      demo,
      lawyerTitle: lawyer?.title ?? fallback.lawyerTitle,
    };
  } catch {
    return fallback;
  }
}

export const isLawyerRole = (role: string): boolean => role === "lawyer" || role === "trainee";

/* ------------------------------ تطبیق تخصص و امتیاز مارکت ------------------------------ */

/** تطبیق نرم تخصص: «ملکی» با «ملک»، «قراردادها» با «قرارداد» و… */
export function specMatch(lawyerSpecs: string | string[], target: string): boolean {
  const hay = (Array.isArray(lawyerSpecs) ? lawyerSpecs.join(" ") : lawyerSpecs).replace(/\u200c/g, " ");
  const needle = target.replace(/\u200c/g, " ").trim();
  if (!needle) return false;
  if (hay.includes(needle)) return true;
  const root = needle.slice(0, Math.max(2, needle.length - 1));
  return root.length >= 2 && hay.includes(root);
}

/** امتیاز تطبیق وکیل جاری با پروندهٔ بازار (۰ تا ۹۹) */
export function computeMatchScore(
  lawyer: LawyerRow | null,
  c: Pick<CaseRow, "specialty" | "aiCategory" | "city" | "urgency">,
): number {
  if (!lawyer) return 55;
  let score = 52;
  const specs = Array.isArray(lawyer.specialties) ? lawyer.specialties.join(" ") : String(lawyer.specialties ?? "");
  const cat = String(c.aiCategory || c.specialty || "");
  if (specMatch(specs, c.specialty) || specMatch(specs, cat)) score += 30;
  score += Math.min(9, Number(lawyer.rating ?? 0) * 1.8);
  score += Math.min(6, Math.floor(Number(lawyer.experienceYears ?? 0) / 3));
  if (String(lawyer.city ?? "") === String(c.city ?? "")) score += 4;
  if (c.urgency === "high") score += 2;
  return Math.min(99, Math.round(score));
}

/* ------------------------------ پرونده‌های بازار ------------------------------ */

export type MarketItem = {
  id: number;
  caseNumber: string;
  subject: string;
  description: string;
  city: string;
  specialty: string;
  urgency: string;
  budget: string | null;
  aiEstimate: string;
  aiConfidence: number;
  matchScore: number;
  proposalsCount: number;
  createdAt: string;
};

export async function fetchMarketItems(
  lawyer: LawyerRow | null,
  opts: { specialty?: string; city?: string; q?: string; limit?: number } = {},
): Promise<MarketItem[]> {
  const { specialty, city, q, limit = 24 } = opts;
  try {
    const rows = (await db
      .select()
      .from(cases)
      .where(and(eq(cases.isPublic, true), isNull(cases.assignedLawyerId), inArray(cases.status, ["new", "reviewing"])))
      .orderBy(desc(cases.createdAt))
      .limit(80)) as CaseRow[];
    const list = Array.isArray(rows) ? rows : [];

    let counts: Record<number, number> = {};
    try {
      const proposalRows = (await db.select({ caseId: caseProposals.caseId }).from(caseProposals)) as {
        caseId: number;
      }[];
      counts = (Array.isArray(proposalRows) ? proposalRows : []).reduce<Record<number, number>>((acc, p) => {
        acc[p.caseId] = (acc[p.caseId] ?? 0) + 1;
        return acc;
      }, {});
    } catch {
      counts = {};
    }

    const items: MarketItem[] = list.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      subject: c.subject,
      description: c.description,
      city: c.city,
      specialty: c.specialty,
      urgency: c.urgency,
      budget: c.budget,
      aiEstimate: c.aiEstimate,
      aiConfidence: c.aiConfidence,
      matchScore: computeMatchScore(lawyer, c),
      proposalsCount: counts[c.id] ?? 0,
      createdAt: (c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt)).toISOString(),
    }));

    const qq = (q ?? "").trim();
    const filtered = items.filter((it) => {
      if (specialty && specialty !== "all" && it.specialty !== specialty) return false;
      if (city && city !== "all" && it.city !== city) return false;
      if (qq && !`${it.subject} ${it.description} ${it.specialty} ${it.city}`.includes(qq)) return false;
      return true;
    });
    filtered.sort((a, b) => b.matchScore - a.matchScore || b.createdAt.localeCompare(a.createdAt));
    return filtered.slice(0, limit);
  } catch {
    return [];
  }
}

/* ------------------------------ کوئری‌های پرتکرار پنل ------------------------------ */

export async function getCaseRow(id: number): Promise<CaseRow | null> {
  try {
    const rows = (await db.select().from(cases).where(eq(cases.id, id)).limit(1)) as CaseRow[];
    return Array.isArray(rows) ? rows[0] ?? null : null;
  } catch {
    return null;
  }
}

export async function getMyCases(lawyerId: number): Promise<CaseRow[]> {
  try {
    const rows = (await db
      .select()
      .from(cases)
      .where(eq(cases.assignedLawyerId, lawyerId))
      .orderBy(desc(cases.createdAt))
      .limit(30)) as CaseRow[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export type EventItem = {
  id: number;
  actor: string;
  actorName: string;
  title: string;
  description: string;
  progress: number | null;
  visibleToClient: boolean;
  createdAt: string;
};

export async function getCaseEvents(caseId: number, limit = 40): Promise<EventItem[]> {
  try {
    const rows = (await db
      .select()
      .from(caseEventsTable)
      .where(eq(caseEventsTable.caseId, caseId))
      .orderBy(desc(caseEventsTable.createdAt))
      .limit(limit)) as (typeof caseEventsTable.$inferSelect)[];
    const list = Array.isArray(rows) ? rows : [];
    return list
      .map((e) => ({
        id: e.id,
        actor: String(e.actor),
        actorName: e.actorName,
        title: e.title,
        description: e.description,
        progress: e.progress ?? null,
        visibleToClient: e.visibleToClient,
        createdAt: (e.createdAt instanceof Date ? e.createdAt : new Date(e.createdAt)).toISOString(),
      }))
      .reverse();
  } catch {
    return [];
  }
}

export type MessageItem = {
  id: number;
  senderRole: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export async function getCaseMessages(caseId: number, limit = 40): Promise<MessageItem[]> {
  try {
    const rows = (await db
      .select()
      .from(caseMessages)
      .where(eq(caseMessages.caseId, caseId))
      .orderBy(desc(caseMessages.createdAt))
      .limit(limit)) as (typeof caseMessages.$inferSelect)[];
    const list = Array.isArray(rows) ? rows : [];
    return list
      .map((m) => ({
        id: m.id,
        senderRole: m.senderRole,
        senderName: m.senderName,
        body: m.body,
        createdAt: (m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt)).toISOString(),
      }))
      .reverse();
  } catch {
    return [];
  }
}

export type AppointmentItem = {
  id: number;
  caseId: number | null;
  title: string;
  kind: string;
  location: string;
  notes: string;
  startsAt: string;
};

export async function getLawyerAppointments(
  lawyerId: number,
  opts: { upcomingOnly?: boolean; limit?: number } = {},
): Promise<AppointmentItem[]> {
  const { upcomingOnly = false, limit = 60 } = opts;
  try {
    const base = db.select().from(appointments).where(eq(appointments.lawyerId, lawyerId));
    const rows = upcomingOnly
      ? ((await base.orderBy(appointments.startsAt).limit(limit)) as (typeof appointments.$inferSelect)[])
      : ((await base.orderBy(desc(appointments.startsAt)).limit(limit)) as (typeof appointments.$inferSelect)[]);
    let list = Array.isArray(rows) ? rows : [];
    if (upcomingOnly) {
      const now = Date.now() - 60 * 60 * 1000; // یک ساعت گذشته هم «پیش‌رو» محسوب شود
      list = list.filter((a) => new Date(a.startsAt).getTime() >= now);
    }
    return list.map((a) => ({
      id: a.id,
      caseId: a.caseId ?? null,
      title: a.title,
      kind: String(a.kind),
      location: a.location,
      notes: a.notes,
      startsAt: (a.startsAt instanceof Date ? a.startsAt : new Date(a.startsAt)).toISOString(),
    }));
  } catch {
    return [];
  }
}

/* ------------------------------ پرونده‌های من (مالکیت شخصی وکیل) ------------------------------ */

/**
 * خلاصهٔ «پرونده‌های من» — پرونده‌هایی که با پذیرش پیشنهاد، به وکیلِ جاری واگذار شده‌اند
 * (cases.assignedLawyerId = lawyerId) + جمع‌های مالی مربوط به خود او.
 *
 * صداقت: هر بخش اگر قابل محاسبه نباشد (خطای کوئری یا نبود داده) null/خالی برمی‌گرداند
 * نه صفرِ ساختگی — UI بخش‌های null را با حالت degraded شفاف نشان می‌دهد.
 * feeSum: جمع حق‌الوکالهٔ توافق‌شده (cases.feeAgreed) پرونده‌های واگذارشده — تومان.
 * settledSum: جمع برداشت‌های واریزشدهٔ همان وکیل (payoutRequests.lawyerId, status=paid) — تومان.
 */
export type MyCaseItem = {
  id: number;
  caseNumber: string;
  trackingToken: string;
  subject: string;
  city: string;
  stage: string;
  progress: number;
  /** تومان — پرونده‌ای بدون حق‌الوکالهٔ توافق‌شده → null */
  feeAgreed: number | null;
  contractStatus: string;
  createdAt: string;
};

export type MyCasesTotals = {
  count: number;
  /** null = در دسترس نیست (خطای کوئری) — UI حالت degraded نشان می‌دهد */
  feeSum: number | null;
  /** null = در دسترس نیست (خطای کوئری) — UI حالت degraded نشان می‌دهد */
  settledSum: number | null;
};

export type MyCasesSummary = {
  cases: MyCaseItem[];
  totals: MyCasesTotals;
  /** true = بخشی از داده به‌خاطر خطای دیتابیس degraded شده */
  degraded: boolean;
};

export async function computeMyCasesSummary(lawyerId: number): Promise<MyCasesSummary> {
  const summary: MyCasesSummary = {
    cases: [],
    totals: { count: 0, feeSum: null, settledSum: null },
    degraded: false,
  };
  try {
    const rows = (await db
      .select({
        id: cases.id,
        caseNumber: cases.caseNumber,
        trackingToken: cases.trackingToken,
        subject: cases.subject,
        city: cases.city,
        stage: cases.stage,
        progress: cases.progress,
        feeAgreed: cases.feeAgreed,
        contractStatus: cases.contractStatus,
        createdAt: cases.createdAt,
      })
      .from(cases)
      .where(eq(cases.assignedLawyerId, lawyerId))
      .orderBy(desc(cases.createdAt))
      .limit(50)) as {
      id: number;
      caseNumber: string;
      trackingToken: string;
      subject: string;
      city: string;
      stage: string;
      progress: number;
      feeAgreed: string | null;
      contractStatus: string;
      createdAt: Date;
    }[];
    const list = Array.isArray(rows) ? rows : [];

    summary.cases = list.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      trackingToken: c.trackingToken,
      subject: c.subject,
      city: c.city,
      stage: c.stage,
      progress: Math.max(0, Math.min(100, Number(c.progress ?? 0))),
      feeAgreed: c.feeAgreed != null && Number.isFinite(Number(c.feeAgreed)) ? Number(c.feeAgreed) : null,
      contractStatus: String(c.contractStatus ?? "none"),
      createdAt: (c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt)).toISOString(),
    }));
    summary.totals.count = summary.cases.length;
    summary.totals.feeSum = summary.cases.reduce((s, c) => s + (c.feeAgreed ?? 0), 0);
  } catch {
    summary.degraded = true;
    summary.totals.feeSum = null;
    return summary; // بدون جدول cases هیچ جمع بعدی معنا ندارد — صادقانه برمی‌گردیم
  }

  try {
    // تسویه‌شدهٔ واقعی: برداشت‌های واریزشدهٔ همین وکیل (payoutRequests.lawyerId → status=paid)
    const payoutRows = (await db
      .select({ amount: payoutRequests.amount })
      .from(payoutRequests)
      .where(and(eq(payoutRequests.lawyerId, lawyerId), eq(payoutRequests.status, "paid")))
      .limit(200)) as { amount: string }[];
    summary.totals.settledSum = (Array.isArray(payoutRows) ? payoutRows : []).reduce(
      (s, p) => s + (Number(p.amount) || 0),
      0,
    );
  } catch {
    summary.totals.settledSum = null;
    summary.degraded = true;
  }

  return summary;
}

/* ------------------------------ مالی وکیل ------------------------------ */

export type LedgerItem = {
  id: number;
  type: string;
  amount: number;
  commission: number;
  description: string;
  createdAt: string;
};

export type PayoutItem = {
  id: number;
  amount: number;
  status: string;
  iban: string;
  createdAt: string;
};

export type LawyerFinance = {
  available: number;
  pendingSettlement: number;
  monthCommission: number;
  activeInstallmentContracts: number;
  ledger: LedgerItem[];
  payouts: PayoutItem[];
};

export async function computeLawyerFinance(lawyerId: number): Promise<LawyerFinance> {
  const empty: LawyerFinance = {
    available: 0,
    pendingSettlement: 0,
    monthCommission: 0,
    activeInstallmentContracts: 0,
    ledger: [],
    payouts: [],
  };
  try {
    const [ledgerRows, payoutRows, installmentRows] = (await Promise.all([
      db.select().from(platformLedger).where(eq(platformLedger.lawyerId, lawyerId)).orderBy(desc(platformLedger.createdAt)).limit(60),
      db.select().from(payoutRequests).where(eq(payoutRequests.lawyerId, lawyerId)).orderBy(desc(payoutRequests.createdAt)).limit(20),
      db.select().from(installments).limit(200),
    ])) as [
      (typeof platformLedger.$inferSelect)[],
      (typeof payoutRequests.$inferSelect)[],
      (typeof installments.$inferSelect)[],
    ];

    const ledger = Array.isArray(ledgerRows) ? ledgerRows : [];
    const payouts = Array.isArray(payoutRows) ? payoutRows : [];
    const installmentsAll = Array.isArray(installmentRows) ? installmentRows : [];

    const totalPayment = ledger.filter((r) => r.type === "payment").reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const totalCommission = ledger.filter((r) => r.type === "commission").reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const paidOut = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const inFlight = payouts
      .filter((p) => p.status === "requested" || p.status === "processing")
      .reduce((s, p) => s + Number(p.amount ?? 0), 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthCommission = ledger
      .filter((r) => r.type === "commission" && new Date(r.createdAt).getTime() >= monthStart.getTime())
      .reduce((s, r) => s + Number(r.amount ?? 0), 0);

    const myCaseIds = new Set((await getMyCases(lawyerId)).map((c) => c.id));
    const myInstallments = installmentsAll.filter((i) => myCaseIds.has(i.caseId));
    const pendingSettlement = myInstallments.filter((i) => i.status === "pending").reduce((s, i) => s + Number(i.amount ?? 0), 0);
    const activeInstallmentContracts = new Set(myInstallments.map((i) => i.caseId)).size;

    return {
      available: Math.max(0, totalPayment - totalCommission - paidOut - inFlight),
      pendingSettlement,
      monthCommission,
      activeInstallmentContracts,
      ledger: ledger.map((r) => ({
        id: r.id,
        type: String(r.type),
        amount: Number(r.amount ?? 0),
        commission: Number(r.commission ?? 0),
        description: r.description,
        createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
      })),
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: Number(p.amount ?? 0),
        status: String(p.status),
        iban: p.iban,
        createdAt: (p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)).toISOString(),
      })),
    };
  } catch {
    return empty;
  }
}

/* ------------------------------ پیشنهادها و قراردادها ------------------------------ */

export type ProposalItem = {
  id: number;
  caseId: number;
  caseNumber: string;
  caseSubject: string;
  city: string;
  amount: string;
  note: string;
  durationMonths: number;
  status: string;
  aiMatchScore: number;
  createdAt: string;
};

export async function getMyProposals(lawyerId: number): Promise<ProposalItem[]> {
  try {
    const rows = (await db
      .select()
      .from(caseProposals)
      .where(eq(caseProposals.lawyerId, lawyerId))
      .orderBy(desc(caseProposals.createdAt))
      .limit(40)) as (typeof caseProposals.$inferSelect)[];
    const list = Array.isArray(rows) ? rows : [];
    const caseIds = [...new Set(list.map((p) => p.caseId))];
    const caseMap = new Map<number, CaseRow>();
    if (caseIds.length > 0) {
      const caseRows = (await db.select().from(cases).where(inArray(cases.id, caseIds)).limit(50)) as CaseRow[];
      for (const c of Array.isArray(caseRows) ? caseRows : []) caseMap.set(c.id, c);
    }
    return list.map((p) => {
      const c = caseMap.get(p.caseId);
      return {
        id: p.id,
        caseId: p.caseId,
        caseNumber: c?.caseNumber ?? "—",
        caseSubject: c?.subject ?? "پرونده",
        city: c?.city ?? "",
        amount: String(p.amount ?? "0"),
        note: p.note,
        durationMonths: p.durationMonths,
        status: String(p.status),
        aiMatchScore: p.aiMatchScore,
        createdAt: (p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)).toISOString(),
      };
    });
  } catch {
    return [];
  }
}

/* ------------------------------ ابزار کمکی ------------------------------ */

/** کد قرارداد: CN-سال شمسی-id پرونده */
export function contractCodeFor(caseId: number): string {
  return `CN-${toJalali(new Date()).jy}-${caseId}`;
}

/** کد پیگیری تولیدی برای درخواست تأمین اعتبار */
export function generateReferenceCode(provider: string): string {
  const prefix = provider === "azki" ? "AZK" : "PBK";
  const rand = Math.floor(1000 + Math.random() * 9000);
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  return `${prefix}-${stamp}${rand}`;
}

/** نرمال‌سازی عدد فارسی/عربی به عدد JS؛ نامعتبر → null */
export function parseAmount(value: unknown): number | null {
  const digits = String(value ?? "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export { and, desc, eq, inArray, isNull };
