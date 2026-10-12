import Link from "next/link";
import { db } from "@/db";
import { reviews, lawyers } from "@/db/schema";
import { desc, gte, sql } from "drizzle-orm";
import { Container, SectionHeading, StarRating } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatJalali } from "@/lib/jalali";
import { faNum } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";

/**
 * ReviewsSpotlight — «برترین نظرات کاربران» به سبک آمازون (Top reviews).
 * فقط نظرات واقعی دیتابیس با امتیاز ۴ به بالا؛ بدون هیچ نظرسازی.
 * اگر نظری نباشد، کل بخش مخفی می‌شود (سیاست: جعل ممنوع).
 */
export async function ReviewsSpotlight() {
  let rows: {
    id: number;
    rating: number;
    comment: string;
    service: string | null;
    clientName: string;
    createdAt: Date;
    lawyerName: string;
    lawyerSlug: string;
  }[] = [];

  try {
    rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        service: reviews.service,
        clientName: reviews.clientName,
        createdAt: reviews.createdAt,
        lawyerName: lawyers.name,
        lawyerSlug: lawyers.slug,
      })
      .from(reviews)
      .innerJoin(lawyers, sql`${lawyers.id} = ${reviews.lawyerId}`)
      .where(gte(reviews.rating, 4))
      .orderBy(desc(reviews.createdAt))
      .limit(6);
  } catch {
    return null; // degraded mode — بخش مخفی می‌شود
  }

  if (rows.length === 0) return null;

  // میانگین واقعی همین مجموعه
  const avg = rows.reduce((s, r) => s + r.rating, 0) / rows.length;
  const t = await getT();
  const tf = templateT(t);

  return (
    <section aria-labelledby="reviews-title" className="mt-24">
      <Container>
        <SectionHeading
          eyebrow={t("تجربه واقعی کاربران")}
          title={t("نظر کسانی که از دادورزان استفاده کردند")}
          desc={tf("میانگین امتیاز {n} از ۵ — فقط نظرات تأییدشده کاربران پلتفرم", { n: faNum(avg.toFixed(1)) })}
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <figure
              key={r.id}
              className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 card-shadow"
            >
              <div className="flex items-center justify-between gap-2">
                <StarRating rating={r.rating} />
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-success"
                  style={{ backgroundColor: "color-mix(in oklab, var(--success) 12%, transparent)" }}
                >
                  <Icon name="check" className="h-3 w-3" />
                  {t("کاربر تأییدشده")}
                </span>
              </div>
              <blockquote className="mt-3 flex-1 text-sm leading-7 text-foreground">
                «{r.comment}»
              </blockquote>
              <figcaption className="mt-4 border-t border-border pt-3 text-xs text-muted">
                <span className="font-bold text-foreground">{r.clientName}</span>
                {r.service ? ` · ${r.service}` : ""}
                <span className="mx-1.5">·</span>
                {formatJalali(r.createdAt)}
                <div className="mt-1">
                  <Link
                    href={`/lawyers/${r.lawyerSlug}`}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    {tf("وکیل: {n}", { n: r.lawyerName })}
                    <Icon name="chevron" className="h-3 w-3 rotate-180" />
                  </Link>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
