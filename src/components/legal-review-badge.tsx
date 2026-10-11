import { db } from "@/db";
import { legalReviews, type LegalReviewRow } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Icon } from "@/components/icons";
import { formatJalaliLong } from "@/lib/jalali";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";

/**
 * بارگذاری best-effort ردیف بازبینی — خطاها اینجا جذب می‌شوند (بدون دیتابیس هم صفحه سالم می‌ماند).
 * رندر JSX بیرون از try/catch نگه داشته می‌شود.
 */
async function loadReview(slug: string): Promise<LegalReviewRow | null> {
  try {
    const rows = await db.select().from(legalReviews).where(eq(legalReviews.pageSlug, slug)).limit(1);
    return rows[0] ?? null;
  } catch {
    // دیتابیس در دسترس نیست یا جدول ساخته نشده — نشان مخفی می‌شود
    return null;
  }
}

/**
 * نشان اعتماد «بازبینی حقوقی» — سروری و async.
 * اگر برای این صفحه بازبینی‌ای ثبت نشده باشد «هیچ‌چیز» رندر می‌شود (غيبت صادقانه).
 */
export default async function LegalReviewBadge({ slug }: { slug: string }) {
  const row = await loadReview(slug);
  if (!row) return null;
  const t = await getT();
  const tf = templateT(t);

  return (
    <div
      role="note"
      aria-label={t("بازبینی حقوقی")}
      className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--success)_28%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)] p-4"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-success">
        <Icon name="shield" className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold leading-6 text-success">
          {tf("بازبینی حقوقی: {n} — {t}", { n: row.reviewerName, t: row.reviewerTitle })}
        </p>
        {row.summary && <p className="mt-1 text-xs leading-6 text-muted">{row.summary}</p>}
        <p className="mt-1.5 text-[11px] font-medium text-muted">{tf("تاریخ بازبینی: {d}", { d: formatJalaliLong(row.reviewedAt) })}</p>
      </div>
    </div>
  );
}
