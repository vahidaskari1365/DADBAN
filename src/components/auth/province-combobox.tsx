"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { LOCATIONS } from "@/lib/data";

/**
 * کومبوباکس استان با جستجوی زنده — فرم ثبت‌نام وکلای رسمی.
 * تایپ می‌کنید، استان‌های منطبق (شامل «ی/ي» و «ک/ك») پیشنهاد می‌شوند؛
 * با کلیک یا Enter انتخاب می‌شود، با ↑/↓ جابه‌جا و با Esc بسته می‌شود.
 * استایل با فیلدهای پنل ورود (verso-field زیرخط‌دار) یکدست است.
 */

const PROVINCES = Array.from(new Set(LOCATIONS.map((l) => l.province)));

/** یکسان‌سازی برای جستجوی فارسی: ی/ك عربی → فارسی + فاصله‌های تکراری */
const normalize = (s: string) =>
  s
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export function ProvinceCombobox({
  value,
  onChange,
  id = "province",
  autoCompleteLabel = "استان",
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  autoCompleteLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const q = normalize(query);
    if (!q) return PROVINCES;
    return PROVINCES.filter((p) => normalize(p).includes(q));
  }, [query]);

  /* بستن با کلیک/تپ بیرون از کومبوباکس */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const select = (p: string) => {
    onChange(p);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const openList = () => {
    setOpen(true);
    setQuery("");
    setActive(Math.max(0, PROVINCES.indexOf(value)));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      openList();
      e.preventDefault();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      setActive((a) => Math.min(a + 1, list.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setActive((a) => Math.max(a - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (list[active]) select(list[active]);
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
      e.preventDefault();
    }
  };

  return (
    <div className="relative" ref={rootRef} data-testid="province-combobox">
      <div className="verso-field">
        <Icon name="location" className="pointer-events-none absolute right-0 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--auth-ink-soft)]" />
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-label={autoCompleteLabel}
          autoComplete="off"
          value={open ? query : value}
          placeholder={open ? (value ? value : "جستجوی استان…") : "انتخاب یا جستجوی استان…"}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            if (!open) setOpen(true);
          }}
          onFocus={openList}
          onClick={openList}
          onKeyDown={onKeyDown}
          className="pe-6"
        />
        <Icon name="chevron" className={`pointer-events-none absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-[var(--auth-ink-soft)] transition-transform ${open ? "-rotate-90" : ""}`} />
      </div>

      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-label={autoCompleteLabel}
          className="nice-scroll absolute inset-x-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-[var(--auth-line)] bg-[var(--auth-form-bg)] p-1.5 shadow-[0_24px_48px_-18px_rgba(15,23,42,0.35)]"
        >
          {list.length === 0 && (
            <li className="px-3 py-3 text-center text-xs text-[var(--auth-ink-soft)]">استانی با این نام پیدا نشد</li>
          )}
          {list.map((p, i) => {
            const selected = p === value;
            return (
              <li key={p} role="option" aria-selected={selected}>
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => select(p)}
                  className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-start text-sm transition-colors ${
                    i === active
                      ? "bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] font-bold text-[var(--auth-ink)]"
                      : "text-[var(--auth-ink-soft)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {selected && <Icon name="check" className="h-3.5 w-3.5 text-[var(--accent-text)]" />}
                    {p}
                  </span>
                  {i === active && <span className="text-[10px] text-[var(--auth-ink-soft)]">Enter</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
