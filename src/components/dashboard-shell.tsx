import type { ReactNode } from "react";
import Link from "next/link";
import { Container, Button } from "./ui";
import { Icon } from "./icons";
import type { IconKey } from "@/lib/data";

export function DashboardShell({
  role,
  title,
  nav,
  children,
}: {
  role: "موکل" | "وکیل";
  title: string;
  /** href-when-present = real link; otherwise a plain label (لا Buttons مرده) */
  nav: { label: string; icon: IconKey; active?: boolean; badge?: string; href?: string }[];
  children: ReactNode;
}) {
  return (
    <Container className="py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge>{role} · داشبورد</Badge>
          <h1 className="mt-2 text-2xl font-extrabold text-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-medium text-success">
            <span className="h-2 w-2 rounded-full bg-success" /> آنلاین
          </span>
          <Button href="/api/auth/logout" variant="ghost" size="sm" icon="x">خروج</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-surface p-2 lg:flex-col">
            {nav.map((n) => {
              const cls = `flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                n.active ? "bg-primary text-primary-foreground" : "text-foreground-soft hover:bg-surface-2"
              }`;
              const inner = (
                <>
                  <Icon name={n.icon} className="h-4 w-4" />
                  {n.label}
                  {n.badge && (
                    <span className={`mr-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${n.active ? "bg-white/20" : "bg-accent text-accent-foreground"}`}>
                      {n.badge}
                    </span>
                  )}
                </>
              );
              return n.href ? (
                <Link key={n.label} href={n.href} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button key={n.label} type="button" className={cls}>
                  {inner}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </Container>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
      {children}
    </span>
  );
}
