import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "./ui";
import { Icon } from "./icons";

export function PageHero({
  title,
  desc,
  breadcrumb,
  children,
  badge,
}: {
  title: string;
  desc?: string;
  breadcrumb?: { label: string; href?: string }[];
  children?: ReactNode;
  badge?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-surface-2/70 to-background py-10">
      <div
        className="pointer-events-none absolute -top-20 right-[10%] h-56 w-56 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--accent), transparent)" }}
      />
      <Container className="relative">
        {breadcrumb && (
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <Icon name="chevron" className="h-3 w-3 rotate-180" />}
                {b.href ? (
                  <Link href={b.href} className="hover:text-primary">{b.label}</Link>
                ) : (
                  <span className="text-foreground-soft">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {badge && (
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            <Icon name="sparkles" className="h-3.5 w-3.5" /> {badge}
          </span>
        )}
        <h1 className="mt-3 max-w-3xl text-balance text-2xl font-extrabold text-foreground sm:text-3xl md:text-4xl">
          {title}
        </h1>
        {desc && <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">{desc}</p>}
        {children && <div className="mt-6">{children}</div>}
      </Container>
    </section>
  );
}
