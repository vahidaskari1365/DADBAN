"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";

/**
 * FaqAccordion — بخش پرسش‌های متداول به سبک Customer Q&A آمازون.
 * پاسخ به ابهام‌های لحظه خرید (بفهمه سایت) و کاهش تردید قبل از CTA.
 */
export function FaqAccordion({
  items,
  title = "پرسش‌های متداول",
}: {
  items: { q: string; a: string }[];
  title?: string;
}) {
  const [open, setOpen] = useState<number | null>(0);
  const t = useT();

  if (items.length === 0) return null;

  return (
    <section aria-label={t(title)} className="rounded-3xl border border-border bg-surface p-5 card-shadow sm:p-8">
      <h2 className="text-center text-xl font-black text-foreground sm:text-2xl">{t(title)}</h2>
      <div className="mx-auto mt-6 max-w-3xl space-y-2.5">
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <div
              key={it.q}
              className={`overflow-hidden rounded-2xl border transition-colors ${
                isOpen ? "border-primary/30 bg-surface-2" : "border-border bg-surface"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 p-4 text-right"
              >
                <span className="text-sm font-bold text-foreground">{it.q}</span>
                <Icon
                  name="chevron"
                  className={`h-4 w-4 shrink-0 rotate-90 text-muted transition-transform duration-200 ${
                    isOpen ? "-rotate-90" : ""
                  }`}
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-200 ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-4 pb-4 text-sm leading-7 text-muted">{it.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
