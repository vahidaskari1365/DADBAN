import Link from "next/link";
import { Avatar, StarRating } from "./ui";
import { Icon } from "./icons";
import { faNum, faPrice } from "@/lib/data";
import type { Lawyer } from "@/db/schema";

/** کارت وکیل — استایل دادپیو: بج تأییدشده، نوار اعتماد طلایی، قیمت مشاوره */
export function LawyerCard({ lawyer }: { lawyer: Lawyer }) {
  // درصد اعتماد از امتیاز واقعی وکیل (۵ ستاره → ۱۰۰٪)
  const trust = Math.min(100, Math.round((lawyer.rating / 5) * 100));

  return (
    <Link
      href={`/lawyers/${lawyer.slug}`}
      className="group flex flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex items-start gap-3">
        <Avatar name={lawyer.name} color={lawyer.avatarColor} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-base font-bold text-foreground">{lawyer.name}</h3>
            {lawyer.verified && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[rgba(213,168,76,.4)] bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-[#8a6420]">
                <Icon name="badge" className="h-3 w-3" />
                تأییدشده
              </span>
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
          <span key={s} className="rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
            {s}
          </span>
        ))}
        {lawyer.specialties.length > 3 && (
          <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-foreground-soft">
            +{faNum(lawyer.specialties.length - 3)}
          </span>
        )}
      </div>

      {/* نوار اعتماد */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>میزان اعتماد</span>
          <span className="font-bold text-[#8a6420]">{faNum(trust)}٪</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-gradient-to-l from-[#e0b65c] to-[#c3973a] transition-[width] duration-500"
            style={{ width: `${trust}%` }}
            role="progressbar"
            aria-label={`میزان اعتماد ${lawyer.name}`}
            aria-valuenow={trust}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <StarRating rating={lawyer.rating} count={lawyer.reviewCount} />
        <span className="text-xs text-muted">{faNum(lawyer.caseCount)} پرونده</span>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] text-muted">مشاوره از</p>
          <p className="dp-money text-sm">{faPrice(lawyer.priceChat)}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          مشاهده پروفایل
          <Icon name="arrow" className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
