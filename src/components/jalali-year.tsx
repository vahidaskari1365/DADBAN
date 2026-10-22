"use client";

import { useEffect, useState } from "react";
import { toJalali, toPersianDigits } from "@/lib/jalali";

/**
 * سال شمسی جاری برای «© ۱۴۰۴ دادورزان» — مقدار اولیه از سرور (SSR) می‌آید و
 * بعد از هیدریشن با تقویم جلالی مرورگر تازه‌سازی می‌شود تا حتی در صفحات
 * کش‌شده/استاتیک هم سال همیشه درست باشد.
 */
export function JalaliYear({ initial }: { initial: string }) {
  const [year, setYear] = useState(initial);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setYear(toPersianDigits(toJalali(new Date()).jy));
      } catch {
        /* مقدار سروری می‌ماند */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return <span suppressHydrationWarning>{year}</span>;
}
