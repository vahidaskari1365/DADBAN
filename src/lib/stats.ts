// Real, database-derived platform statistics.
// No invented numbers: every metric shown publicly comes from an actual query.
// When the database is unavailable or empty, callers get nulls and should hide
// the metric instead of displaying a fabricated fallback.

import { db } from "@/db";
import { lawyers, cases, qaQuestions, articles } from "@/db/schema";
import { count, eq } from "drizzle-orm";

export interface PlatformStats {
  /** عدد واقعی وکلای تأییدشده در دیتابیس */
  verifiedLawyers: number | null;
  /** عدد واقعی پرونده‌های ثبت‌شده در پلتفرم */
  registeredCases: number | null;
  /** عدد واقعی پرسش‌های حقوقی پاسخ‌داده‌شده */
  answeredQuestions: number | null;
  /** عدد واقعی مقالات منتشرشده */
  publishedArticles: number | null;
}

async function safeCount(query: Promise<{ c: number }[]>): Promise<number | null> {
  try {
    const rows = await query;
    return Number(rows[0]?.c ?? 0);
  } catch {
    return null; // degraded mode — hide rather than fabricate
  }
}

/** Server-only. Reads real counts; returns nulls when the DB is unavailable. */
export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    const [lawyerCount, caseCount, qaCount, articleCount] = await Promise.all([
      safeCount(db.select({ c: count() }).from(lawyers).where(eq(lawyers.verified, true)) as Promise<{ c: number }[]>),
      safeCount(db.select({ c: count() }).from(cases) as Promise<{ c: number }[]>),
      safeCount(db.select({ c: count() }).from(qaQuestions) as Promise<{ c: number }[]>),
      safeCount(db.select({ c: count() }).from(articles) as Promise<{ c: number }[]>),
    ]);
    return {
      verifiedLawyers: lawyerCount,
      registeredCases: caseCount,
      answeredQuestions: qaCount,
      publishedArticles: articleCount,
    };
  } catch {
    return {
      verifiedLawyers: null,
      registeredCases: null,
      answeredQuestions: null,
      publishedArticles: null,
    };
  }
}
