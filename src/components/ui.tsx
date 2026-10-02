import type { ReactNode } from "react";
import Image from "next/image";
import { Icon } from "./icons";
import type { IconKey } from "@/lib/data";
import { faNum } from "@/lib/data";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/brand";

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  desc,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  align?: "center" | "start";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <span className="inline-block rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold tracking-wide text-primary">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-3 text-pretty text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-[2rem]">
        {title}
      </h2>
      {desc && (
        <p className={`mt-3 text-base leading-7 text-muted ${align === "center" ? "mx-auto" : ""}`}>
          {desc}
        </p>
      )}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "primary" | "danger";
  icon?: IconKey;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-2 text-foreground-soft border-border",
    accent: "bg-accent-soft text-accent border-accent/30",
    success: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-success border-[color-mix(in_oklab,var(--success)_30%,transparent)]",
    primary: "bg-primary-soft text-primary border-primary/20",
    danger: "bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] text-danger border-[color-mix(in_oklab,var(--danger)_28%,transparent)]",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {icon && <Icon name={icon} className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

export function StarRating({
  rating,
  count,
  size = "sm",
}: {
  rating: number;
  count?: number;
  size?: "sm" | "md";
}) {
  const px = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span className="inline-flex items-center gap-1">
      <span className="flex items-center" aria-label={`امتیاز ${rating} از ۵`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Icon
            key={i}
            name="star"
            className={`${px} ${i <= Math.round(rating) ? "text-accent" : "text-border-strong"}`}
          />
        ))}
      </span>
      <span className={`font-semibold text-foreground ${size === "md" ? "text-base" : "text-sm"}`}>
        {faNum(rating.toFixed(1))}
      </span>
      {count != null && (
        <span className="text-xs text-muted">({faNum(count.toLocaleString("en-US"))})</span>
      )}
    </span>
  );
}

export function Avatar({
  name,
  color,
  size = "md",
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes: Record<string, string> = {
    sm: "h-10 w-10 text-sm",
    md: "h-14 w-14 text-base",
    lg: "h-20 w-20 text-xl",
    xl: "h-24 w-24 text-2xl",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl font-bold text-white shadow-sm ${sizes[size]}`}
      style={{ background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 55%, #000))` }}
      aria-hidden
    >
      {name.trim().split(" ").slice(-2).map((w) => w[0]).join("")}
    </span>
  );
}

export function Logo({ withText = true }: { withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="relative inline-flex h-12 w-12 shrink-0 overflow-hidden rounded-xl shadow-md ring-1 ring-black/5 sm:h-14 sm:w-14">
        <Image
          src="/logo1.png"
          alt={SITE_NAME}
          width={56}
          height={56}
          sizes="(min-width: 640px) 56px, 48px"
          className="h-full w-full object-cover"
          priority
        />
      </span>
      {withText && (
        <span className="flex flex-col leading-none">
          <span className="text-lg font-extrabold tracking-tight text-foreground">{SITE_NAME}</span>
          <span className="text-[10px] font-medium text-muted">{SITE_TAGLINE}</span>
        </span>
      )}
    </span>
  );
}

export function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  icon,
  className = "",
  ...rest
}: {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "accent" | "outline" | "ghost" | "soft";
  size?: "sm" | "md" | "lg";
  icon?: IconKey;
} & React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const variants: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm",
    accent: "bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm",
    outline: "border border-border-strong bg-surface text-foreground hover:bg-surface-2",
    ghost: "text-foreground-soft hover:bg-surface-2 hover:text-foreground",
    soft: "bg-primary-soft text-primary hover:bg-[color-mix(in_oklab,var(--primary)_18%,transparent)]",
  };
  const sizes: Record<string, string> = {
    sm: "h-9 px-3.5 text-sm gap-1.5",
    md: "h-11 px-5 text-sm gap-2",
    lg: "h-12 px-6 text-base gap-2",
  };
  const cls = `inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`;
  if (href) {
    return (
      <a href={href} className={cls} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {icon && <Icon name={icon} className="h-[1.15em] w-[1.15em]" />}
        {children}
      </a>
    );
  }
  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} className="h-[1.15em] w-[1.15em]" />}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 card-shadow transition-all duration-200 ${
        hover ? "hover:-translate-y-1 hover:border-border-strong hover:shadow-[var(--shadow-lift)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function TrustBadgeIcons({ name }: { name: IconKey }) {
  return <Icon name={name} className="h-6 w-6" />;
}

export function EmptyState({
  title,
  desc,
  icon = "folder",
}: {
  title: string;
  desc?: string;
  icon?: IconKey;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-2/50 px-6 py-16 text-center">
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted-soft">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <p className="text-base font-semibold text-foreground">{title}</p>
      {desc && <p className="mt-1 max-w-sm text-sm text-muted">{desc}</p>}
    </div>
  );
}

export function Stat({ value, label, icon }: { value: string; label: string; icon: IconKey }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{value}</span>
      <span className="text-xs text-muted sm:text-sm">{label}</span>
    </div>
  );
}
