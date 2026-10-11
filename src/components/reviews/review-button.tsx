"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Badge, Button } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";
import { ReviewForm } from "./review-form";

/**
 * دکمهٔ «ثبت نقد و امتیاز» — دیالوگ درون‌خطی شامل ReviewForm.
 * پس از ثبت موفق، دکمه به Badge «نقد ثبت شد» تبدیل می‌شود.
 */
export function ReviewButton({
  consultationId,
  lawyerId,
  lawyerName,
  serviceDefault,
}: {
  consultationId: number;
  lawyerId: number;
  lawyerName?: string;
  /** پیش‌فرض فیلد «خدمت دریافتی» در فرم — معمولاً نوع مشاوره */
  serviceDefault?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  // بستن دیالوگ با Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // پس از ثبت موفق — نشان «نقد ثبت شد»
  if (done) {
    return (
      <span data-testid="review-done">
        <Badge tone="success" icon="check">
          {t("نقد ثبت شد")}
        </Badge>
      </span>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        icon="star"
        data-testid="review-open"
        onClick={() => setOpen(true)}
      >
        {t("ثبت نقد و امتیاز")}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("ثبت نقد و امتیاز")}
            data-testid="review-dialog"
            className="w-full max-w-lg rounded-t-2xl border border-border bg-surface p-5 card-shadow sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-bold text-foreground">
                <Icon name="star" className="h-5 w-5 text-accent-text" />
                {t("ثبت نقد و امتیاز")}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("بستن")}
                data-testid="review-close"
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>
            <ReviewForm
              consultationId={consultationId}
              lawyerId={lawyerId}
              lawyerName={lawyerName}
              defaultService={serviceDefault}
              onDone={() => setDone(true)}
            />
          </div>
        </div>
      )}
    </>
  );
}
