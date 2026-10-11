import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";

/**
 * ویجت‌های آماری پنل‌ها — presentational و بدون وابستگی سرور.
 * از dashboard-shell جدا شده‌اند چون کامپوننت‌های client (پنل‌های پورتال)
 * نباید از ماژولی که next/headers را import می‌کند، ویجت بگیرند.
 * API بر اساس مصرف فعلی: StatCard{label,value,hint?,tone?,icon?},
 * StatusBadge{tone}>{label}, Progress{value 0..100}.
 */

const STAT_TONES: Record<string, { chip: string; value: string }> = {
  default: { chip: "bg-primary-soft text-primary", value: "text-foreground" },
  gold: { chip: "bg-accent-soft text-accent-text", value: "text-foreground" },
  success: { chip: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-success", value: "text-foreground" },
  danger: { chip: "bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] text-danger", value: "text-foreground" },
};

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "gold" | "success" | "danger";
  icon?: IconKey;
}) {
  const t = STAT_TONES[tone] ?? STAT_TONES.default;
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-bold text-muted">{label}</span>
        {icon && (
          <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${t.chip}`}>
            <Icon name={icon} className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={`tnum mt-2 text-xl font-black leading-7 ${t.value}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-5 text-muted">{hint}</p>}
    </div>
  );
}

const BADGE_TONES: Record<string, string> = {
  neutral: "bg-surface-2 text-foreground-soft border-border",
  accent: "bg-accent-soft text-accent-text border-accent/30",
  success: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-success border-[color-mix(in_oklab,var(--success)_30%,transparent)]",
  primary: "bg-primary-soft text-primary border-primary/25",
  danger: "bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] text-danger border-[color-mix(in_oklab,var(--danger)_30%,transparent)]",
};

/** Tone مشترک با lib/money.ts — نام‌های رنگی قدیمی به toneهای استاندارد نگاشت می‌شوند */
export type StatusTone = "primary" | "success" | "neutral" | "accent" | "danger" | "green" | "gold" | "gray" | "red" | "cyan";

const STATUS_TONE_MAP: Record<string, string> = {
  primary: "primary",
  success: "success",
  neutral: "neutral",
  accent: "accent",
  danger: "danger",
  green: "success",
  gold: "accent",
  gray: "neutral",
  red: "danger",
  cyan: "primary",
};

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  const mapped = STATUS_TONE_MAP[tone] ?? "neutral";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold leading-5 ${BADGE_TONES[mapped] ?? BADGE_TONES.neutral}`}
    >
      {children}
    </span>
  );
}

export function Progress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
    >
      <div
        className="h-full rounded-full bg-gradient-to-l from-primary to-primary-hover transition-[width] duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
