"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icons";
import { SPECIALTIES, ALL_CITIES } from "@/lib/data";

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
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border-strong bg-background px-3">
          <Icon name="search" className="h-4 w-4 text-muted-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && update("q", q)}
            placeholder="جستجوی نام یا تخصص…"
            className="h-10 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-soft"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border-strong bg-background px-3 text-sm font-medium text-foreground-soft lg:hidden"
        >
          <Icon name="filter" className="h-4 w-4" />
          فیلتر
        </button>
      </div>

      <div className={`mt-3 ${open ? "block" : "hidden"} lg:block`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Field label="حوزه تخصص">
            <select
              value={initial.sp ?? "all"}
              onChange={(e) => update("sp", e.target.value)}
              className={selectCls}
            >
              <option value="all">همه تخصص‌ها</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="شهر">
            <select
              value={initial.city ?? "all"}
              onChange={(e) => update("city", e.target.value)}
              className={selectCls}
            >
              <option value="all">همه شهرها</option>
              {ALL_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="جنسیت">
            <select
              value={initial.gender ?? "all"}
              onChange={(e) => update("gender", e.target.value)}
              className={selectCls}
            >
              <option value="all">همه</option>
              <option value="male">آقا</option>
              <option value="female">خانم</option>
            </select>
          </Field>
          <Field label="مرتب‌سازی">
            <select
              value={initial.sort ?? "rating"}
              onChange={(e) => update("sort", e.target.value)}
              className={selectCls}
            >
              <option value="rating">بالاترین امتیاز</option>
              <option value="experience">بیشترین سابقه</option>
              <option value="cases">بیشترین پرونده</option>
              <option value="priceLow">ارزان‌ترین مشاوره</option>
              <option value="reviews">بیشترین نظرات</option>
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
              {s}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted">{total > 0 ? `${total} وکیل` : "نتیجه‌ای یافت نشد"}</span>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
          >
            <Icon name="x" className="h-3.5 w-3.5" />
            پاک کردن فیلترها
          </button>
        </div>
      </div>
    </div>
  );
}
