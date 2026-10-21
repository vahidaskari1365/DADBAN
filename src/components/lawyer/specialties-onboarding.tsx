"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { SpecialtiesPicker } from "@/components/lawyer/specialties-picker";

/**
 * پاپاپ الزامی انتخاب تخصص — به محض ورود وکیلی که هنوز تخصص ثبت نکرده
 * (تازه‌ثبت‌نام و وکلای قدیمی بدون تخصص — درخواست کارفرما، قابلیت ۱).
 * تا تکمیل، هر ورود به پنل دوباره باز می‌شود.
 */
export function SpecialtiesOnboarding({ lawyerName }: { lawyerName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <>
      <button
        type="button"
        data-testid="specialties-onboarding"
        onClick={() => setOpen(true)}
        className="hidden"
        aria-hidden
      />
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="انتخاب تخصص‌های شما"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border bg-primary-soft/40 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Icon name="certificate" className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-[15px] font-black text-foreground">
                    {lawyerName ? `خوش آمدید ${lawyerName}!` : "خوش آمدید!"}
                  </h2>
                  <p className="mt-0.5 text-xs leading-6 text-muted">
                    پیش از شروع کار، تخصص‌های خود را مشخص کنید — این انتخاب، پرونده‌ها و موکل‌های پیشنهادی شما را تعیین می‌کند.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="بستن"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <SpecialtiesPicker compact onSaved={() => setTimeout(() => setOpen(false), 700)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
