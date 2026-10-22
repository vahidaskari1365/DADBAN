"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Badge } from "./ui";
import { Icon } from "./icons";
import { faNum, faPrice } from "@/lib/data";
import type { Lawyer } from "@/db/schema";
import { useT } from "@/lib/i18n/provider";

/**
 * کارت فشردهٔ وکیل — استاندارد کارت‌های فهرست (Directory Card):
 * آواتار گرد کوچک (۵۶px) + هویت، یک ردیف متا، تخصص‌ها و نوار قیمت.
 * عکس به‌جای بلوک مربع تمام‌عرض، آواتار کوچک است تا کارت کوتاه بماند و
 * کاربر بتواند چند کارت را در یک نگاه مقایسه کند؛ بیو و فهرست کامل خدمات
 * در صفحهٔ پروفایل دیده می‌شود.
 */

export function LawyerCard({
  lawyer,
  priority = false,
  className = "",
}: {
  lawyer: Lawyer;
  /** برای سازگاری با فراخواننده‌های قدیمی — دیگر استفاده نمی‌شود */
  index?: number;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const t = useT();
  const hasPhoto = !!lawyer.photoUrl && !failed;
  const initials = lawyer.name
    .trim()
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("");
  // نوع — ستون lawyer_type ممکن است هنوز مهاجرت نشده باشد؛ اختیاری خوانده می‌شود
  const lawyerType = (lawyer as { lawyerType?: string }).lawyerType;
  const isKaramooz = lawyerType === "karamooz";
  const isExpert = lawyerType === "expert";
  // عنوان پیش‌فرضِ ثبت‌نام با نشانِ نوع یکسان می‌شود («کارشناس حقوقی / کارشناس حقوقی») — تکرار نمایش داده نشود
  const titleDuplicatesBadge =
    (isExpert && lawyer.title === "کارشناس حقوقی") || (isKaramooz && lawyer.title === "کارآموز وکالت");

  return (
    <Link
      href={`/lawyers/${lawyer.slug}`}
      className={`group relative flex h-full flex-col rounded-2xl border border-border bg-surface p-3.5 card-shadow transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-lift)] ${className}`}
    >
      {/* هدر — آواتار گرد کوچک + هویت */}
      <div className="flex items-start gap-2.5">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-border/70">
          {hasPhoto ? (
            <Image
              src={lawyer.photoUrl as string}
              alt={`${t("عکس")} ${lawyer.name}`}
              fill
              priority={priority}
              sizes="56px"
              className="object-cover"
              onError={() => setFailed(true)}
            />
          ) : (
            <span
              className="absolute inset-0 flex items-center justify-center text-base font-bold text-white/90"
              style={{
                background: `linear-gradient(160deg, ${lawyer.avatarColor}, color-mix(in oklab, ${lawyer.avatarColor} 45%, #000))`,
              }}
              aria-hidden
            >
              {initials}
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="min-w-0 truncate text-sm font-bold text-foreground">{lawyer.name}</h3>
            {/* تیک احراز هویت — کنار نام */}
            {lawyer.verified && (
              <span className="shrink-0 text-primary" title={t("احراز هویت‌شده")} aria-label={t("احراز هویت‌شده")}>
                <Icon name="badge" className="h-4 w-4" />
              </span>
            )}
          </div>

          {/* نشان نوع یا عنوان شغلی — یک خط */}
          {isExpert ? (
            <span
              className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-extrabold text-accent-text ring-1 ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
              title={t("کارشناس حقوقی — مشاوره، قرارداد و اسناد")}
            >
              <Icon name="certificate" className="h-3 w-3 shrink-0" />
              <span className="truncate">{t("کارشناس حقوقی")}</span>
            </span>
          ) : isKaramooz ? (
            <span
              className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] px-1.5 py-0.5 text-[10px] font-extrabold text-[var(--accent-text)] ring-1 ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
              title={t("پروفایل کارآموز وکالت — ثبت‌نام مستقیم")}
            >
              <Icon name="book" className="h-3 w-3 shrink-0" />
              <span className="truncate">{t("کارآموز وکالت")}</span>
            </span>
          ) : (
            !titleDuplicatesBadge && (
              <p className="mt-0.5 truncate text-[11px] text-muted">{lawyer.title}</p>
            )
          )}

          {/* امتیاز — یک خط جمع‌وجور */}
          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-foreground-soft">
            <Icon name="star" className="h-3.5 w-3.5 text-amber-500" />
            {faNum(lawyer.rating.toFixed(1))}
            <span className="font-normal text-muted">({faNum(lawyer.reviewCount)})</span>
          </span>
        </div>
      </div>

      {/* متا — شهر، سابقه، پرونده (در موبایل مخفی برای کوتاه‌ماندن کارت) */}
      <div className="mt-2.5 hidden flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted sm:flex">
        <span className="inline-flex items-center gap-1">
          <Icon name="location" className="h-3.5 w-3.5" /> {t(lawyer.city)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="briefcase" className="h-3.5 w-3.5" /> {faNum(lawyer.experienceYears)} {t("سال سابقه")}
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="folder" className="h-3.5 w-3.5" /> {faNum(lawyer.caseCount)} {t("پرونده")}
        </span>
      </div>

      {/* تخصص‌ها — حداکثر دو مورد + شمارندهٔ باقی */}
      <div className="mb-2.5 mt-2 flex flex-wrap gap-1">
        {lawyer.specialties.slice(0, 2).map((s) => (
          <Badge key={s} tone="primary">
            {t(s)}
          </Badge>
        ))}
        {lawyer.specialties.length > 2 && (
          <Badge tone="neutral">+{faNum(lawyer.specialties.length - 2)}</Badge>
        )}
      </div>

      {/* نوار قیمت — چسبیده به پایین کارت تا همهٔ کارت‌های یک ردیف هم‌تراز باشند */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5">
        <div>
          <p className="text-[10px] text-muted">{t("مشاوره متنی از")}</p>
          <p className="text-xs font-bold text-foreground">{faPrice(lawyer.priceChat)}</p>
        </div>
        <span className="hidden items-center gap-1 rounded-lg bg-primary-soft px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:inline-flex">
          {t("مشاهده پروفایل")}
          <Icon name="arrow" className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
