"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { faNum } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

/**
 * فرم ثبت نقد و امتیاز پس از مشاورهٔ تکمیل‌شده — POST /api/reviews
 * قرارداد سرور: body {consultationId, lawyerId, rating, comment?, service?}
 * پاسخ‌ها: 200 {ok:true, reviewId} | 400/401/403/429/500 {ok:false, error}
 * پیام‌های خطا دقیقاً با همان متن صادقانهٔ سرور نمایش داده می‌شوند.
 */
export function ReviewForm({
  consultationId,
  lawyerId,
  lawyerName,
  defaultService = "",
  onDone,
}: {
  consultationId: number;
  lawyerId: number;
  lawyerName?: string;
  /** پیش‌فرض فیلد «خدمت دریافتی» — معمولاً نوع مشاوره */
  defaultService?: string;
  onDone?: () => void;
}) {
  const t = useT();
  const tf = templateT(t);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [service, setService] = useState(defaultService);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);

  const shown = hoverRating || rating;
  const canSubmit = rating >= 1 && !submitting && !done;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setNeedLogin(false);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ consultationId, lawyerId, rating, comment, service }),
      });
      let data: { ok?: boolean; error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        /* پاسخ غیر JSON — خطای عمومی صادقانه */
      }
      if (res.ok && data?.ok) {
        setDone(true);
        toast.success(t("نقد شما ثبت شد — سپاس از بازخورد شما"));
        onDone?.();
      } else if (res.status === 401) {
        const msg = t("برای ثبت نقد وارد حساب شوید");
        setNeedLogin(true);
        setError(msg);
        toast.error(msg);
      } else {
        // 400 (نقد تکراری / ناقص / مشاورهٔ تکمیل‌نشده) و 403/429/500 — همان متن سرور
        const msg = data?.error || t("ثبت نقد ناموفق بود");
        setError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = t("ارتباط با سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید.");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {lawyerName && (
        <p className="text-xs leading-6 text-muted">{tf("نقد و امتیاز برای {name}", { name: lawyerName })}</p>
      )}

      {/* ستاره‌های تعاملی ۱..۵ */}
      <div>
        <span className="mb-1.5 block text-sm font-semibold text-foreground">
          {t("امتیاز شما")} <span aria-hidden className="text-danger">*</span>
        </span>
        <div
          className="flex items-center gap-0.5"
          role="radiogroup"
          aria-label={t("امتیاز شما")}
          data-testid="review-rating"
        >
          {[1, 2, 3, 4, 5].map((i) => {
            const active = shown >= i;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={rating === i}
                aria-label={tf("امتیاز {n} از ۵", { n: faNum(i) })}
                data-testid={`review-star-${i}`}
                disabled={done || submitting}
                onClick={() => setRating(i)}
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl transition-transform duration-150 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon
                  name="star"
                  className={`h-7 w-7 transition-colors duration-150 ${active ? "text-accent-text" : "text-border-strong"}`}
                />
              </button>
            );
          })}
          <span className="tnum mr-2 text-sm font-bold text-foreground" aria-live="polite">
            {rating > 0 ? `${faNum(rating)} ${t("از ۵")}` : t("انتخاب کنید")}
          </span>
        </div>
      </div>

      {/* نظر — حداکثر ۱۰۰۰ نویسه */}
      <label className="block">
        <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-semibold text-foreground">
          <span>
            {t("نظر شما")} <span className="font-normal text-muted">({t("اختیاری")})</span>
          </span>
          <span className="tnum text-[11px] font-normal text-muted">
            {faNum(comment.length)} / {faNum(1000)}
          </span>
        </span>
        <textarea
          data-testid="review-comment"
          rows={3}
          maxLength={1000}
          value={comment}
          disabled={done || submitting}
          onChange={(e) => setComment(e.target.value.slice(0, 1000))}
          placeholder={t("تجربهٔ خود از این مشاوره را بنویسید…")}
          className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm leading-6 text-foreground placeholder:text-muted-soft focus:border-accent/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      {/* خدمت دریافتی — پیش‌فرض: نوع مشاوره */}
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-foreground">
          {t("خدمت دریافتی")} <span className="font-normal text-muted">({t("اختیاری")})</span>
        </span>
        <input
          type="text"
          maxLength={100}
          value={service}
          disabled={done || submitting}
          onChange={(e) => setService(e.target.value.slice(0, 100))}
          placeholder={t("مثلاً: مشاوره تلفنی")}
          className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-soft focus:border-accent/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      {/* خطاها — دقیقاً با متن صادقانهٔ سرور */}
      {error && (
        <div
          role="alert"
          data-testid="review-error"
          className="flex items-start gap-2 rounded-xl border border-danger/30 bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2.5 text-sm leading-6 text-danger"
        >
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {error}
            {needLogin && (
              <>
                {" "}
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 font-bold underline underline-offset-4 transition-opacity hover:opacity-80"
                >
                  {t("ورود به حساب")} ←
                </Link>
              </>
            )}
          </span>
        </div>
      )}

      {/* حالت موفق — فرم غیرفعال می‌شود */}
      {done && (
        <div
          role="status"
          data-testid="review-success"
          className="flex items-center gap-2 rounded-xl border border-success/30 bg-[color-mix(in_oklab,var(--success)_12%,transparent)] px-3 py-3 text-sm font-bold text-success"
        >
          <Icon name="check" className="h-5 w-5 shrink-0" />
          <span>{t("نقد شما ثبت شد — سپاس از بازخورد شما")}</span>
        </div>
      )}

      <Button
        type="submit"
        variant="accent"
        size="lg"
        icon="star"
        data-testid="review-submit"
        disabled={!canSubmit}
        className="h-12 w-full"
      >
        <span className="inline-flex items-center gap-2">
          {submitting && (
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {submitting ? t("در حال ثبت…") : done ? t("نقد ثبت شد") : t("ثبت نقد")}
        </span>
      </Button>
    </form>
  );
}
