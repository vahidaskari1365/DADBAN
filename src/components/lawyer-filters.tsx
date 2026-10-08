"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icons";
import { SPECIALTIES, ALL_CITIES, ALL_PROVINCES, faNum } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

export interface LawyerFiltersProps {
  initial: {
    q?: string;
    sp?: string;
    city?: string;
    gender?: string;
    sort?: string;
  };
  total: number;
}

export function LawyerFilters({ initial, total }: LawyerFiltersProps) {
  const router = useRouter();
  const t = useT();
  const tf = templateT(t);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(initial.q ?? "");

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.push(`/lawyers?${params.toString()}`);
  };

  const reset = () => {
    setQ("");
    router.push("/lawyers");
  };

  const selectCls =
    "h-10 w-full rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 card-shadow">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border-strong bg-background px-3">
          <Icon name="search" className="h-4 w-4 shrink-0 text-muted-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && update("q", q)}
            placeholder={t("جستجوی نام یا تخصص…")}
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-soft"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border-strong bg-background px-3 text-sm font-medium text-foreground-soft lg:hidden"
        >
          <Icon name="filter" className="h-4 w-4" />
          {t("فیلتر")}
        </button>
      </div>

      <div className={`mt-3 ${open ? "block" : "hidden"} lg:block`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Field label={t("حوزه تخصص")}>
            <select
              value={initial.sp ?? "all"}
              onChange={(e) => update("sp", e.target.value)}
              className={selectCls}
            >
              <option value="all">{t("همه تخصص‌ها")}</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>{t(s)}</option>
              ))}
            </select>
          </Field>
          <Field label={t("استان / شهر")}>
            <select
              value={initial.city ?? "all"}
              onChange={(e) => update("city", e.target.value)}
              className={selectCls}
            >
              <option value="all">{t("همه استان‌ها و شهرها")}</option>
              <optgroup label={t("استان‌ها")}>
                {ALL_PROVINCES.map((p) => (
                  <option key={p} value={p}>{tf("استان {city}", { city: p })}</option>
                ))}
              </optgroup>
              <optgroup label={t("شهرها")}>
                {ALL_CITIES.map((c) => (
                  <option key={c} value={c}>{t(c)}</option>
                ))}
              </optgroup>
            </select>
          </Field>
          <Field label={t("جنسیت")}>
            <select
              value={initial.gender ?? "all"}
              onChange={(e) => update("gender", e.target.value)}
              className={selectCls}
            >
              <option value="all">{t("همه")}</option>
              <option value="male">{t("آقا")}</option>
              <option value="female">{t("خانم")}</option>
            </select>
          </Field>
          <Field label={t("مرتب‌سازی")}>
            <select
              value={initial.sort ?? "rating"}
              onChange={(e) => update("sort", e.target.value)}
              className={selectCls}
            >
              <option value="rating">{t("بالاترین امتیاز")}</option>
              <option value="experience">{t("بیشترین سابقه")}</option>
              <option value="cases">{t("بیشترین پرونده")}</option>
              <option value="priceLow">{t("ارزان‌ترین مشاوره")}</option>
              <option value="reviews">{t("بیشترین نظرات")}</option>
            </select>
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SPECIALTIES.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update("sp", s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                initial.sp === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground-soft hover:bg-primary-soft hover:text-primary"
              }`}
            >
              {t(s)}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted">{total > 0 ? `${faNum(total)} ${t("وکیل")}` : t("نتیجه‌ای یافت نشد")}</span>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
          >
            <Icon name="x" className="h-3.5 w-3.5" />
            {t("پاک کردن فیلترها")}
          </button>
        </div>
      </div>
    </div>
  );
}
