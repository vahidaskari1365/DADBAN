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
 * کارت معرفی وکیل — چیدمان یکدست و هم‌اندازه (همهٔ کارت‌ها یک شکل و یک ارتفاع).
 * عکس همیشه مربع استاندارد است (سرور به ۸۰۰×۸۰۰ برش می‌زند)؛
 * بزرگ/کوچک شدن با هاور ندارد — فقط بازخورد ظریف سایه/حاشیه.
 */

export function LawyerCard({
  lawyer,
  priority = false,
  className = "",
}: {
  lawyer: Lawyer;
  /** برای سازگاری با فراخواننده‌های قدیمی — در چیدمان یکدست دیگر استفاده نمی‌شود */
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
  // نوع وکیل — ستون lawyer_type ممکن است هنوز مهاجرت نشده باشد؛ اختیاری خوانده می‌شود
  const isKaramooz = (lawyer as { lawyerType?: string }).lawyerType === "karamooz";

  return (
    <Link
      href={`/lawyers/${lawyer.slug}`}
      className={`group relative block h-full overflow-hidden rounded-3xl border border-border bg-surface card-shadow transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-lift)] ${className}`}
    >
      {/* عکس مربع استاندارد — یکدست در همهٔ کارت‌ها */}
      <div className="relative aspect-square w-full overflow-hidden">
        {hasPhoto ? (
          <Image
            src={lawyer.photoUrl as string}
            alt={`${t("عکس")} ${lawyer.name}`}
            fill
            priority={priority}
            sizes="(min-width: 80rem) 25vw, (min-width: 64rem) 33vw, (min-width: 40rem) 50vw, 100vw"
            className="object-cover"
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
            title={t("احراز هویت‌شده")}
          >
            <Icon name="badge" className="h-4 w-4" />
          </span>
        )}
      </div>

      {/* بدنه کارت — در ستون‌های باریک موبایل فشرده می‌شود */}
      <div className="flex flex-col gap-2 p-3 sm:gap-2.5 sm:p-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-foreground sm:text-base">{lawyer.name}</h3>
            {/* نشان طلایی کارآموز وکالت — شماره پروانه (K-…) برای کارآموز نمایش داده نمی‌شود */}
            {isKaramooz && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--accent-text)] ring-1 ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
                title={t("پروفایل کارآموز وکالت — ثبت‌نام مستقیم")}
              >
                <Icon name="book" className="h-3 w-3" />
                {t("کارآموز وکالت")}
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted sm:text-xs">{lawyer.title}</p>
        </div>

        {/* معرفی کوتاه وکیل — همان متنی که از پنل پروفایل ذخیره می‌شود */}
        {lawyer.bio?.trim() ? (
          <p className="line-clamp-2 text-[11px] leading-5 text-foreground-soft sm:text-xs sm:leading-6">{lawyer.bio}</p>
        ) : null}

        <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted sm:flex">
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

        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {lawyer.specialties.slice(0, 2).map((s) => (
            <Badge key={s} tone="primary">
              {t(s)}
            </Badge>
          ))}
          {lawyer.specialties.length > 2 && (
            <Badge tone="neutral">+{faNum(lawyer.specialties.length - 2)}</Badge>
          )}
        </div>

        {/* فهرست خدمات — تا دو مورد اول + شمارنده باقی */}
        {lawyer.services?.length ? (
          <div className="flex flex-wrap gap-1">
            {lawyer.services.slice(0, 2).map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success"
              >
                <Icon name="check" className="h-3 w-3" />
                {s}
              </span>
            ))}
            {lawyer.services.length > 2 && (
              <span className="inline-flex items-center rounded-full px-1 py-0.5 text-[10px] font-bold text-muted">
                +{faNum(lawyer.services.length - 2)} {t("خدمت دیگر")}
              </span>
            )}
          </div>
        ) : null}

        <div className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-2 sm:pt-3">
          <div>
            <p className="text-[10px] text-muted sm:text-[11px]">{t("مشاوره متنی از")}</p>
            <p className="text-xs font-bold text-foreground sm:text-sm">{faPrice(lawyer.priceChat)}</p>
          </div>
          <span className="hidden items-center gap-1 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:inline-flex">
            {t("مشاهده پروفایل")}
            <Icon name="arrow" className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
