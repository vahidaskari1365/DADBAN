import Link from "next/link";
import { Avatar, Badge, StarRating } from "./ui";
import { Icon } from "./icons";
import { faNum, faPrice } from "@/lib/data";
import type { Lawyer } from "@/db/schema";

export function LawyerCard({ lawyer }: { lawyer: Lawyer }) {
  return (
    <Link
      href={`/lawyers/${lawyer.slug}`}
      className="group flex flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex items-start gap-3">
        <Avatar name={lawyer.name} color={lawyer.avatarColor} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-base font-bold text-foreground">{lawyer.name}</h3>
            {lawyer.verified && (
              <Icon name="badge" className="h-4 w-4 shrink-0 text-primary" />
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">{lawyer.title}</p>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Icon name="location" className="h-3.5 w-3.5" /> {lawyer.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="briefcase" className="h-3.5 w-3.5" /> {faNum(lawyer.experienceYears)} سال سابقه
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {lawyer.specialties.slice(0, 3).map((s) => (
          <Badge key={s} tone="primary">{s}</Badge>
        ))}
        {lawyer.specialties.length > 3 && (
          <Badge tone="neutral">+{faNum(lawyer.specialties.length - 3)}</Badge>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <StarRating rating={lawyer.rating} count={lawyer.reviewCount} />
        <span className="text-xs text-muted">{faNum(lawyer.caseCount)} پرونده</span>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] text-muted">مشاوره متنی از</p>
          <p className="text-sm font-bold text-foreground">{faPrice(lawyer.priceChat)}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          مشاهده پروفایل
          <Icon name="arrow" className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
