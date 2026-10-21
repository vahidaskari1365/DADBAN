"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LEGAL_TOPICS } from "@/lib/data";
import { Icon } from "@/components/icons";

/**
 * انتخاب‌گر تخصص — مشترک بین پاپاپ اجباریِ ورود و صفحه «تخصص من».
 * ذخیره با PUT /api/lawyer/profile { specialties } (الگوی همان API پروفایل).
 */
export function SpecialtiesPicker({
  initial,
  compact = false,
  onSaved,
}: {
  initial?: string[];
  compact?: boolean;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initial ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const toggle = (label: string) => {
    setSelected((prev) =>
      prev.includes(label)
        ? prev.filter((s) => s !== label)
        : prev.length >= 6
          ? prev
          : [...prev, label],
    );
    setSaved(false);
    setError(null);
  };

  const save = async () => {
    if (selected.length < 1) {
      setError("حداقل یک تخصص انتخاب کنید.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lawyer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialties: selected }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "ذخیره ممکن نشد؛ دوباره تلاش کنید.");
        return;
      }
      setSaved(true);
      onSaved?.();
      startTransition(() => router.refresh());
    } catch {
      setError("خطای شبکه؛ اتصال اینترنت را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs leading-6 text-muted">
          حوزه‌هایی را که کار می‌کنید انتخاب کنید (۱ تا ۶ مورد) — تخصص‌ها در پروفایل عمومی و فیلتر موکل‌ها استفاده می‌شود.
        </p>
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary tnum">
          {new Intl.NumberFormat("fa-IR").format(selected.length)} انتخاب
        </span>
      </div>

      <div
        role="group"
        aria-label="انتخاب تخصص‌ها"
        className={`mt-3 grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}
      >
        {LEGAL_TOPICS.map((t) => {
          const active = selected.includes(t.label);
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => toggle(t.label)}
              aria-pressed={active}
              className={`flex items-start gap-2 rounded-xl border p-3 text-right transition-all ${
                active
                  ? "border-primary/50 bg-primary-soft/60 shadow-[0_0_0_1px_var(--color-primary)]"
                  : "border-border bg-surface hover:border-primary/30"
              }`}
            >
              <span
                className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
                aria-hidden
              >
                {active && <Icon name="check" className="h-2.5 w-2.5" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-foreground">{t.label}</span>
                <span className="mt-0.5 block truncate text-[11px] leading-5 text-muted">{t.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="mt-3 rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-xs font-semibold text-success">
          تخصص‌ها ذخیره شد ✓
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={busy || pending}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {busy || pending ? "در حال ذخیره…" : "ذخیره تخصص‌ها"}
      </button>
    </div>
  );
}
