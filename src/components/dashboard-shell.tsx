import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "./icons";
import type { IconKey } from "@/lib/data";
import { SITE_NAME } from "@/lib/brand";

export type DashboardRole = "موکل" | "وکیل" | "کارآموز" | "همکار" | "ادمین";

export function DashboardShell({
  role,
  title,
  subtitle,
  userName,
  userRole,
  nav,
  actions,
  children,
}: {
  role: DashboardRole;
  title: string;
  subtitle?: string;
  userName?: string;
  userRole?: string;
  nav: { label: string; icon: IconKey; active?: boolean; badge?: string; href?: string }[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const initial = (userName ?? role).trim().charAt(0);
  return (
    <div className="min-h-screen bg-background lg:flex lg:flex-row-reverse">
      {/* ===== Sidebar (dark navy, right side in RTL) ===== */}
      <aside className="dp-sidebar sticky top-0 z-40 flex h-auto shrink-0 flex-row items-center gap-1 overflow-x-auto px-3 py-2 lg:sticky lg:h-screen lg:w-[248px] lg:flex-col lg:items-stretch lg:overflow-y-auto lg:px-4 lg:py-6">
        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center gap-3 rounded-xl px-2 py-1 lg:mb-2 lg:justify-center lg:border-b lg:border-white/10 lg:pb-5">
          <span className="dp-logo-ring grid h-10 w-10 place-items-center rounded-[13px] text-xl font-bold">د</span>
          <span className="hidden leading-tight lg:block">
            <b className="block text-[17px]">{SITE_NAME}</b>
            <small className="mt-0.5 block text-[10px] text-white/55">Legal Marketplace</small>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex flex-row gap-1 lg:mt-3 lg:flex lg:flex-col">
          {nav.map((n) => {
            const cls = `dp-sidebar-item flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-medium lg:w-full ${
              n.active ? "" : ""
            }`;
            const inner = (
              <>
                <Icon name={n.icon} className="h-[18px] w-[18px] shrink-0" />
                <span className="hidden whitespace-nowrap md:inline lg:inline">{n.label}</span>
                {n.badge && (
                  <span className="mr-auto hidden rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-[#1b2334] md:inline lg:inline">
                    {n.badge}
                  </span>
                )}
              </>
            );
            return n.href ? (
              <Link key={n.label} href={n.href} className={cls} data-active={n.active ? "true" : "false"}>
                {inner}
              </Link>
            ) : (
              <button key={n.label} type="button" className={cls} data-active={n.active ? "true" : "false"}>
                {inner}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="mr-auto lg:mr-0 lg:mt-auto lg:pt-4">
          <a
            href="/api/auth/logout"
            className="dp-sidebar-item flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-medium lg:w-full"
          >
            <Icon name="x" className="h-[18px] w-[18px]" />
            <span className="hidden md:inline lg:inline">خروج</span>
          </a>
        </div>
      </aside>

      {/* ===== Main ===== */}
      <div className="min-w-0 flex-1">
        {/* Top header */}
        <header className="border-b border-border bg-surface/80 px-4 py-4 backdrop-blur lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="rounded-full bg-primary-soft px-2 py-0.5 font-semibold text-primary dark:text-primary">
                  پنل {role}
                </span>
              </div>
              <h1 className="mt-1 truncate text-xl font-extrabold text-foreground lg:text-2xl">{title}</h1>
              {subtitle && <p className="mt-0.5 hidden text-sm text-muted sm:block">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-navy-2 font-bold text-cyan dark:bg-navy-2" style={{ background: "#17264a", color: "#7fd8ee" }}>
                  {initial}
                </span>
                <span className="hidden leading-tight sm:block">
                  <b className="block text-[13px] text-foreground">{userName ?? "کاربر دادپیو"}</b>
                  <small className="block text-[11px] text-muted">{userRole ?? role}</small>
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main id="main" className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

/* ===== Reusable panel widgets (shared by all roles) ===== */

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "gold" | "success" | "danger";
  icon?: IconKey;
}) {
  const toneCls =
    tone === "gold"
      ? "text-accent"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-danger"
          : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <small className="text-xs text-muted">{label}</small>
        {icon && <Icon name={icon} className="h-4 w-4 text-muted" />}
      </div>
      <strong className={`mt-2 block text-2xl font-extrabold ${toneCls}`}>{value}</strong>
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </div>
  );
}

export function Progress({ value, tone = "gold" }: { value: number; tone?: "gold" | "success" | "primary" }) {
  const bg = tone === "success" ? "bg-success" : tone === "primary" ? "bg-primary" : "bg-accent";
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-3">
      <span className={`block h-full rounded-full ${bg}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function StatusBadge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "gold" | "gray" | "red" | "cyan" }) {
  const map: Record<string, string> = {
    green: "bg-success/10 text-success",
    gold: "bg-accent/15 text-accent",
    gray: "bg-surface-3 text-muted",
    red: "bg-danger/10 text-danger",
    cyan: "bg-cyan/15 text-[#1d7a8c]",
  };
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${map[tone]}`}>{children}</span>;
}
