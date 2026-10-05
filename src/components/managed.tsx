"use client";
import { formatJalali } from "@/lib/jalali";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";
import {
  STATUS_LABELS,
  STATUS_TONE,
  URGENCY_LABELS,
  CATEGORY_LABELS,
  CLASSIFICATION_LABELS,
  PRICE_TYPE_LABELS,
  faNumSafe,
} from "@/lib/managed-labels";

const TONE_MAP: Record<string, "neutral" | "accent" | "success" | "primary" | "danger"> = {
  muted: "neutral",
  info: "primary",
  warn: "accent",
  success: "success",
  danger: "danger",
  brand: "primary",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={TONE_MAP[STATUS_TONE[status] ?? "muted"] ?? "neutral"}>{STATUS_LABELS[status] ?? status}</Badge>;
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const tone =
    urgency === "URGENT" || urgency === "HIGH" ? "danger" : urgency === "LOW" ? "neutral" : "accent";
  return <Badge tone={tone as any}>{URGENCY_LABELS[urgency] ?? urgency}</Badge>;
}

export function PriceTag({ price, priceType }: { price?: number | null; priceType?: string }) {
  if (priceType === "FIXED" && price) return <span className="font-semibold text-foreground">{faNumSafe(price)} تومان</span>;
  if (priceType === "FROM" && price) return <span className="font-semibold text-foreground">از {faNumSafe(price)} تومان</span>;
  return <span className="text-sm text-muted">{PRICE_TYPE_LABELS[priceType ?? ""] ?? "پس از بررسی اعلام می‌شود"}</span>;
}

export function ServiceCard({
  service,
}: {
  service: {
    title: string;
    slug: string;
    shortDescription: string;
    icon: string;
    category?: string;
    estimatedTime?: string;
    priceType?: string;
    basePrice?: number;
    requiresLawyer?: boolean;
  };
}) {
  return (
    <Link href={`/services/${service.slug}`} className="block">
      <Card hover className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Icon name={(service.icon as IconKey) ?? "folder"} className="h-6 w-6" />
          </span>
          {service.requiresLawyer && (
            <Badge tone="accent" icon="scale">
              با نظارت وکیل
            </Badge>
          )}
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">{service.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{service.shortDescription}</p>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border pt-2">
          <span className="text-[11px] text-muted">
            {service.category ? CATEGORY_LABELS[service.category] ?? "" : ""}
          </span>
          <span className="flex items-center gap-2 whitespace-nowrap">
            {service.estimatedTime && (
              <span className="text-[11px] text-muted">{service.estimatedTime}</span>
            )}
            <span className="text-sm font-bold text-foreground">
              <PriceTag price={service.basePrice} priceType={service.priceType} />
            </span>
          </span>
        </div>
      </Card>
    </Link>
  );
}

export function Timeline({ events }: { events: { id: number; type: string; title: string; description: string; createdByName?: string | null; createdAt: string | Date }[] }) {
  if (!events.length) return <p className="text-sm text-muted">هنوز رویدادی ثبت نشده است.</p>;
  return (
    <ol className="relative space-y-4 border-r border-border pr-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -right-[27px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{e.title}</span>
          </div>
          {e.description && <p className="mt-0.5 text-sm leading-6 text-muted">{e.description}</p>}
          <p className="mt-1 text-xs text-muted">
            {e.createdByName ? `${e.createdByName} • ` : ""}
            {formatJalali(e.createdAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function ClassificationBadge({ classification }: { classification?: string }) {
  if (!classification) return null;
  return <Badge tone="primary">{CLASSIFICATION_LABELS[classification] ?? classification}</Badge>;
}
