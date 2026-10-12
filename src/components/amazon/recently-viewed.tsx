"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge, StarRating } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LawyerPhoto } from "@/components/lawyer-photo";
import { faNum, faPrice } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

/**
 * کیت شخصی‌سازی به سبک آمازون:
 * - LawyerViewRecorder: بازدید پروفایل وکیل را در localStorage ثبت می‌کند.
 * - LawyerDiscovery: دو ردیف «بازدیدهای اخیر شما» + «پیشنهاد برای شما».
 *   پیشنهادها از API واقعی وکلای برتر می‌آید و اگر کاربر سابقه بازدید داشته
 *   باشد، وکلای هم‌تخصص در صدر قرار می‌گیرند (Recommended based on browsing).
 */

const LS_KEY = "dp:recent-lawyers";
const MAX_ITEMS = 12;

export type ViewedLawyer = {
  id: number;
  slug: string;
  name: string;
  title: string;
  city: string;
  rating: number;
  reviewCount: number;
  caseCount: number;
  priceChat: number;
  experienceYears: number;
  verified: boolean;
  specialties: string[];
  avatarColor: string;
  photoUrl?: string | null;
  ts?: number;
};

function readHistory(): ViewedLawyer[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ViewedLawyer[];
    return Array.isArray(arr) ? arr.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function recordLawyerView(l: Omit<ViewedLawyer, "ts">) {
  try {
    const list = readHistory().filter((x) => x.slug !== l.slug);
    list.unshift({ ...l, ts: Date.now() });
    localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch {
    /* private mode — ignore */
  }
}

/** روی صفحه پروفایل وکیل قرار می‌گیرد و بازدید را ثبت می‌کند (بدون رندر). */
export function LawyerViewRecorder({ lawyer }: { lawyer: Omit<ViewedLawyer, "ts"> }) {
  useEffect(() => {
    recordLawyerView(lawyer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lawyer.slug]);
  return null;
}

function LawyerMiniCard({ l }: { l: ViewedLawyer }) {
  const t = useT();
  const tf = templateT(t);
  return (
    <Link
      href={`/lawyers/${l.slug}`}
      className="group flex w-[248px] shrink-0 flex-col rounded-2xl border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex items-center gap-3">
        <LawyerPhoto name={l.name} color={l.avatarColor} photoUrl={l.photoUrl} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="truncate text-sm font-bold text-foreground">{l.name}</h3>
            {l.verified && <Icon name="badge" className="h-3.5 w-3.5 shrink-0 text-primary" />}
          </div>
          <p className="truncate text-[11px] text-muted">{l.title}</p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1">
        {l.specialties.slice(0, 2).map((s) => (
          <Badge key={s} tone="primary">{s}</Badge>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
        <StarRating rating={l.rating} count={l.reviewCount} />
        <span className="text-[11px] font-semibold text-foreground">
          {tf("از {p}", { p: faPrice(l.priceChat) })}
        </span>
      </div>
    </Link>
  );
}

function Rail({
  title,
  icon,
  desc,
  children,
}: {
  title: string;
  icon: "clock" | "sparkles";
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface/70 p-5 card-shadow sm:p-6">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon name={icon} className="h-4.5 w-4.5" />
        </span>
        <div>
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          {desc && <p className="text-xs text-muted">{desc}</p>}
        </div>
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:thin]">
        {children}
      </div>
    </div>
  );
}

/**
 * LawyerDiscovery — ردیف‌های شخصی‌سازی‌شده؛ در خانه، وکیل‌یابی و پروفایل وکیل.
 * excludeSlug: در پروفایل، خودِ وکیل از فهرست حذف می‌شود.
 */
export function LawyerDiscovery({
  excludeSlug,
  hideRecent = false,
}: {
  excludeSlug?: string;
  hideRecent?: boolean;
}) {
  const t = useT();
  const tf = templateT(t);
  const [recent, setRecent] = useState<ViewedLawyer[] | null>(null);
  const [top, setTop] = useState<ViewedLawyer[] | null>(null);

  const load = useCallback(() => {
    // سابقه بازدید
    try {
      const list = readHistory().filter((x) => x.slug !== excludeSlug);
      setRecent(list);
    } catch {
      setRecent([]);
    }
    // وکلای برتر واقعی
    const params = new URLSearchParams({ limit: "8" });
    if (excludeSlug) params.set("exclude", excludeSlug);
    fetch(`/api/lawyers/top?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setTop(Array.isArray(d?.lawyers) ? d.lawyers : []))
      .catch(() => setTop([]));
  }, [excludeSlug]);

  useEffect(() => {
    // با تاخیر میکروتسکی اجرا می‌شود تا خواندن localStorage و setState
    // داخل effect سینک نباشد (جلوگیری از cascading render)
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  if (recent === null && top === null) return null;

  const recentList = (recent ?? []).filter((x) => x.slug !== excludeSlug);
  const topList = top ?? [];

  // شخصی‌سازی: وکلای هم‌تخصص با بازدیدهای اخیر اول دیده شوند
  const viewedSpecs = new Set(recentList.flatMap((x) => x.specialties ?? []));
  const ranked = [...topList].sort((a, b) => {
    const aBoost = (a.specialties ?? []).some((s) => viewedSpecs.has(s)) ? 1 : 0;
    const bBoost = (b.specialties ?? []).some((s) => viewedSpecs.has(s)) ? 1 : 0;
    return bBoost - aBoost;
  });
  const personalized = recentList.length > 0;

  if (recentList.length === 0 && topList.length === 0) return null;

  return (
    <div className="space-y-5" data-discovery>
      {!hideRecent && recentList.length > 0 && (
        <Rail
          title={t("بازدیدهای اخیر شما")}
          icon="clock"
          desc={t("ادامه از جایی که رها کردی")}
        >
          {recentList.map((l) => (
            <LawyerMiniCard key={`r-${l.slug}`} l={l} />
          ))}
        </Rail>
      )}

      {topList.length > 0 && (
        <Rail
          title={personalized ? t("پیشنهاد برای شما") : t("انتخاب کاربران دادورزان")}
          icon="sparkles"
          desc={
            personalized
              ? t("بر اساس تخصص‌هایی که به آن‌ها علاقه نشان دادی")
              : t("وکلای تأییدشده با بالاترین امتیاز واقعی")
          }
        >
          {ranked.map((l) => (
            <LawyerMiniCard key={`t-${l.slug}`} l={l} />
          ))}
        </Rail>
      )}

      {recentList.length > 0 && (
        <p className="text-center text-[11px] text-muted">
          {tf("سابقه بازدید فقط روی دستگاه خودت ذخیره می‌شود — {n} وکیل", { n: faNum(recentList.length) })}
        </p>
      )}
    </div>
  );
}
