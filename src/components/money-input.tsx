"use client";

/* ============================================================================
 * MoneyInput — ورودی مبلغ با گروه‌بندی سه‌رقمی حین تایپ
 * کاربر عدد را می‌نویسد، نمایش به‌صورت زنده «30,000,000» جدا می‌شود.
 * والد همیشه مقدار خامِ رقم‌ها (بدون کاما) را می‌گیرد — قرارداد API تغییری نمی‌کند.
 * ========================================================================== */

import { useEffect, useRef } from "react";
import { toEn } from "@/lib/money";

/** پاک‌سازی ورودی به رقم‌های خام: حذف جداکننده/حروف + تبدیل ارقام فارسی + حذف صفرهای ابتدایی */
export function parsePrice(input: string): string {
  return toEn(input)
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, 15);
}

/** گروه‌بندی سه‌رقمی: 30000000 → 30,000,000 */
export function groupPrice(input: string): string {
  return parsePrice(input).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  /** مقدار خام (فقط رقم، بدون کاما) */
  value: string;
  /** هر بار تغییر، رقم خام را برمی‌گرداند */
  onValueChange: (raw: string) => void;
};

export function MoneyInput({ value, onValueChange, className, dir = "ltr", ...rest }: MoneyInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  /** تعداد رقمِ پیش از مکان‌نما — برای بازگرداندن مکان‌نما به جای درست پس از قالب‌بندی */
  const caretDigits = useRef<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    caretDigits.current = toEn(el.value.slice(0, caret)).replace(/\D/g, "").length;
    const raw = parsePrice(el.value);
    const formatted = groupPrice(raw);
    // پاک‌سازی فوری DOM (مثلاً حرف تایپ‌شده) حتی اگر state والد تغییر نکند
    if (el.value !== formatted) el.value = formatted;
    onValueChange(raw);
  };

  // پس از هر به‌روزرسانی مقدار، مکان‌نما کنار همان رقمی برمی‌گردد که کاربر آنجا بود
  useEffect(() => {
    const el = ref.current;
    if (!el || caretDigits.current === null) return;
    const target = caretDigits.current;
    caretDigits.current = null;
    if (el !== document.activeElement) return;
    const v = el.value;
    let count = 0;
    let pos = 0;
    while (pos < v.length && count < target) {
      if (v[pos] >= "0" && v[pos] <= "9") count++;
      pos++;
    }
    const newPos = count === target ? pos : v.length;
    if (el.selectionStart !== newPos) el.setSelectionRange(newPos, newPos);
  }, [value]);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      dir={dir}
      value={groupPrice(value)}
      onChange={handleChange}
      className={className}
      {...rest}
    />
  );
}
