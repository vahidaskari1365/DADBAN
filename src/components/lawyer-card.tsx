"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Badge } from "./ui";
import { Icon } from "./icons";
import { faNum, faPrice } from "@/lib/data";
import type { Lawyer } from "@/db/schema";

/**
 * کارت معرفی وکیل — سبک پینترست (تصویرمحور، عمودی، آماده چیدمان masonry).
 * نسبت عکس بر اساس index بین سه حالت می‌چرخد تا ارتفاع کارت‌ها پله‌ای شود.
 * کلاس نسبت‌ها (.pin-photo-a/b/c) در globals.css تعریف شده‌اند.
 */
const PHOTO_ASPECTS = ["pin-photo-a", "pin-photo-b", "pin-photo-c"] as const;

export function LawyerCard({
  lawyer,
  index = 0,
  priority = false,
  className = "",
}: {
  lawyer: Lawyer;
  index?: number;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const hasPhoto = !!lawyer.photoUrl && !failed;
  const aspect = PHOTO_ASPECTS[index % PHOTO_ASPECTS.length];
  const initials = lawyer.name
    .trim()
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("");

  return (
    <Link
      href={`/lawyers/${lawyer.slug}`}
      className={`group relative block overflow-hidden rounded-3xl border border-border bg-surface card-shadow transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-[var(--shadow-lift)] ${className}`}
    >
      {/* عکس پین‌مانند */}
      <div className={`relative w-full overflow-hidden ${aspect}`}>
        {hasPhoto ? (
          <Image
            src={lawyer.photoUrl as string}
            alt={`عکس ${lawyer.name}`}
            fill
            priority={priority}
            sizes="(min-width: 80rem) 25vw, (min-width: 64rem) 33vw, (min-width: 40rem) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setFailed(true)}
          />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center text-5xl font-bold text-white/90"
            style={{
              background: `linear-gradient(160deg, ${lawyer.avatarColor}, color-mix(in oklab, ${lawyer.avatarColor} 45%, #000))`,
            }}
            aria-hidden
          >
            {initials}
          </span>
        )}

        {/* گرادیان خوانایی پایین عکس */}
        <span
          className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent"
          aria-hidden
        />

        {/* چیپ امتیاز شیشه‌ای */}
        <span className="absolute top-3 start-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
          <Icon name="star" className="h-3.5 w-3.5 text-amber-300" />
          {faNum(lawyer.rating.toFixed(1))}
          <span className="opacity-70">({faNum(lawyer.reviewCount)})</span>
        </span>

        {/* تیک احراز هویت شناور */}
        {lawyer.verified && (
          <span
            className="absolute top-3 end-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
            title="احراز هویت‌شده"
          >
            <Icon name="badge" className="h-4 w-4" />
          </span>
        )}
      </div>

      {/* بدنه کارت — در ستون‌های باریک موبایل فشرده می‌شود */}
      <div className="flex flex-col gap-2 p-3 sm:gap-2.5 sm:p-4">
        <div>
          <h3 className="truncate text-sm font-bold text-foreground sm:text-base">{lawyer.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted sm:text-xs">{lawyer.title}</p>
        </div>

        <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted sm:flex">
          <span className="inline-flex items-center gap-1">
            <Icon name="location" className="h-3.5 w-3.5" /> {lawyer.city}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="briefcase" className="h-3.5 w-3.5" /> {faNum(lawyer.experienceYears)} سال سابقه
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="folder" className="h-3.5 w-3.5" /> {faNum(lawyer.caseCount)} پرونده
          </span>
        </div>

        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {lawyer.specialties.slice(0, 2).map((s) => (
            <Badge key={s} tone="primary">
              {s}
            </Badge>
          ))}
          {lawyer.specialties.length > 2 && (
            <Badge tone="neutral">+{faNum(lawyer.specialties.length - 2)}</Badge>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-2 sm:pt-3">
          <div>
            <p className="text-[10px] text-muted sm:text-[11px]">مشاوره متنی از</p>
            <p className="text-xs font-bold text-foreground sm:text-sm">{faPrice(lawyer.priceChat)}</p>
          </div>
          <span className="hidden items-center gap-1 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:inline-flex">
            مشاهده پروفایل
            <Icon name="arrow" className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
