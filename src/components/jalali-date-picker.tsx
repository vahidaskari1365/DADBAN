"use client";

/**
 * تقویم شمسی (جلالی) سبک برای انتخاب تاریخ.
 * خروجی: رشته ISO میلادی "YYYY-MM-DD" (سازگار با APIهای فعلی) — نمایش کاملاً شمسی.
 */

import { useMemo, useState } from "react";
import { toJalaali, toGregorian, jalaaliMonthLength } from "jalaali-js";
import { JALALI_MONTHS, toPersianDigits } from "@/lib/jalali";

const WEEKDAY_HEADERS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

/** تاریخ امروز به وقت تهران — "YYYY-MM-DD" */
function todayTehranIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isoFromJalali(jy: number, jm: number, jd: number): string {
  const g = toGregorian(jy, jm, jd);
  const m = String(g.gm).padStart(2, "0");
  const d = String(g.gd).padStart(2, "0");
  return `${g.gy}-${m}-${d}`;
}

function jalaliFromIso(iso: string): { jy: number; jm: number; jd: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return toJalaali(Number(m[1]), Number(m[2]), Number(m[3]));
}

export function JalaliDatePicker({
  value,
  onChange,
  minIso,
  maxDaysAhead = 60,
}: {
  /** مقدار انتخاب‌شده — ISO میلادی "YYYY-MM-DD" یا رشته خالی */
  value: string;
  /** خروجی ISO میلادی "YYYY-MM-DD" */
  onChange: (iso: string) => void;
  /** کمترین تاریخ قابل انتخاب (ISO) — پیش‌فرض: امروز تهران */
  minIso?: string;
  /** حداکثر روزهای آینده قابل انتخاب */
  maxDaysAhead?: number;
}) {
  const todayIso = useMemo(() => todayTehranIso(), []);
  const min = minIso && /^\d{4}-\d{2}-\d{2}$/.test(minIso) && minIso > todayIso ? minIso : todayIso;
  const maxIso = useMemo(() => {
    const d = new Date(`${min}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + maxDaysAhead);
    return d.toISOString().slice(0, 10);
  }, [min, maxDaysAhead]);

  const selected = jalaliFromIso(value);
  const [view, setView] = useState(() => selected ?? jalaliFromIso(min) ?? { jy: 1404, jm: 1, jd: 1 });

  const goMonth = (delta: number) => {
    let { jy, jm } = view;
    jm += delta;
    if (jm > 12) { jm = 1; jy += 1; }
    if (jm < 1) { jm = 12; jy -= 1; }
    setView({ jy, jm, jd: 1 });
  };

  // روزهای قابل انتخاب برای محدودسازی ناوبری ماه
  const viewMinMonth = (() => {
    const mj = jalaliFromIso(min);
    return mj ? { jy: mj.jy, jm: mj.jm } : null;
  })();
  const viewMaxMonth = (() => {
    const mj = jalaliFromIso(maxIso);
    return mj ? { jy: mj.jy, jm: mj.jm } : null;
  })();
  const prevDisabled = !!viewMinMonth && (view.jy < viewMinMonth.jy || (view.jy === viewMinMonth.jy && view.jm <= viewMinMonth.jm));
  const nextDisabled = !!viewMaxMonth && (view.jy > viewMaxMonth.jy || (view.jy === viewMaxMonth.jy && view.jm >= viewMaxMonth.jm));

  const grid = useMemo(() => {
    const daysInMonth = jalaaliMonthLength(view.jy, view.jm);
    const g = toGregorian(view.jy, view.jm, 1);
    // شنبه‌محور: getDay() 0=یکشنبه … 6=شنبه → ایندکس شنبه‌محور = (getDay()+1)%7
    const firstWeekday = (new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7;
    const cells: (null | { jd: number; iso: string; disabled: boolean; selected: boolean })[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let jd = 1; jd <= daysInMonth; jd++) {
      const iso = isoFromJalali(view.jy, view.jm, jd);
      cells.push({ jd, iso, disabled: iso < min || iso > maxIso, selected: value === iso });
    }
    return cells;
  }, [view, value, min, maxIso]);

  const btnBase =
    "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition-colors cursor-pointer";

  return (
    <div className="rounded-2xl border border-border-strong bg-background p-3">
      {/* سربرگ ماه */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goMonth(1)}
          disabled={nextDisabled}
          aria-label="ماه بعد"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        >
          ‹
        </button>
        <p className="text-sm font-extrabold text-foreground">
          {JALALI_MONTHS[view.jm - 1]} {toPersianDigits(view.jy)}
        </p>
        <button
          type="button"
          onClick={() => goMonth(-1)}
          disabled={prevDisabled}
          aria-label="ماه قبل"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {/* روزهای هفته */}
      <div className="mt-2 grid grid-cols-7 gap-1">
        {WEEKDAY_HEADERS.map((w) => (
          <span key={w} className="flex h-6 items-center justify-center text-[10px] font-bold text-muted">
            {w}
          </span>
        ))}
      </div>

      {/* شبکه روزها */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map((c, i) =>
          c === null ? (
            <span key={`e${i}`} />
          ) : (
            <button
              key={c.iso}
              type="button"
              disabled={c.disabled}
              onClick={() => onChange(c.iso)}
              className={`${btnBase} ${
                c.selected
                  ? "bg-primary text-primary-foreground"
                  : c.disabled
                    ? "cursor-not-allowed text-muted-soft/40"
                    : "border border-transparent text-foreground-soft hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
              }`}
            >
              {toPersianDigits(c.jd)}
            </button>
          ),
        )}
      </div>

      {/* مقدار انتخاب‌شده */}
      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <span className="text-[11px] text-muted">{value ? "تاریخ انتخابی:" : "تاریخی انتخاب نشده"}</span>
        <span className="flex items-center gap-2">
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="cursor-pointer text-[11px] font-medium text-danger transition-colors hover:text-danger/80"
            >
              پاک کردن
            </button>
          )}
          <span className="text-xs font-bold text-foreground">
            {value && selected ? `${toPersianDigits(selected.jd)} ${JALALI_MONTHS[selected.jm - 1]} ${toPersianDigits(selected.jy)}` : "—"}
          </span>
        </span>
      </div>
    </div>
  );
}
