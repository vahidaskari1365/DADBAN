"use client";

import { useState } from "react";
import { Avatar, Badge, EmptyState, StarRating } from "./ui";
import { Icon } from "./icons";
import { faNum } from "@/lib/data";
import { formatToman } from "@/lib/money";
import type { IconKey } from "@/lib/data";

export interface ProfileReview {
  id: number;
  clientName: string;
  rating: number;
  comment: string;
  service: string | null;
  dateFa: string;
}

export interface ProfilePricing {
  key: string;
  label: string;
  price: number;
  icon: IconKey;
  features: string[];
}

export interface ProfileTabsProps {
  about: string;
  licenseNo: string;
  responseTime: string;
  views: number;
  specialties: string[];
  services: string[];
  pricing: ProfilePricing[];
  caseCount: number;
  satisfaction: number;
  experienceYears: number;
  reviews: ProfileReview[];
}

type TabKey = "info" | "specialties" | "records" | "reviews";

const TABS: { key: TabKey; label: string; icon: IconKey }[] = [
  { key: "info", label: "اطلاعات", icon: "id" },
  { key: "specialties", label: "تخصص‌ها", icon: "scale" },
  { key: "records", label: "سوابق", icon: "briefcase" },
  { key: "reviews", label: "نظرات", icon: "star" },
];

/** تب‌های پروفایل وکیل — اطلاعات | تخصص‌ها | سوابق | نظرات */
export function LawyerProfileTabs(props: ProfileTabsProps) {
  const [tab, setTab] = useState<TabKey>("info");

  return (
    <div>
      {/* نوار تب‌ها — اسکرول افقی روی موبایل */}
      <div role="tablist" aria-label="بخش‌های پروفایل وکیل" className="flex gap-1.5 overflow-x-auto border-b border-border pb-px">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`lawyer-tab-${t.key}`}
              aria-selected={active}
              aria-controls={`lawyer-panel-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-t-xl border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
                active
                  ? "border-[color:var(--gold)] bg-surface text-foreground"
                  : "border-transparent text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              <Icon name={t.icon} className={`h-4 w-4 ${active ? "text-accent" : ""}`} />
              {t.label}
              {t.key === "reviews" && (
                <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">{faNum(props.reviews.length)}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="animate-fade-up pt-5">
        {/* ————— اطلاعات ————— */}
        {tab === "info" && (
          <div role="tabpanel" id="lawyer-panel-info" aria-labelledby="lawyer-tab-info" className="space-y-6">
            <section>
              <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                <Icon name="user" className="h-5 w-5 text-accent" /> درباره من
              </h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-8 text-foreground-soft">{props.about}</p>
            </section>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="text-xs text-muted">شماره پروانه</p>
                <p className="mt-1 text-sm font-bold text-foreground" dir="ltr">{props.licenseNo}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="text-xs text-muted">زمان پاسخ</p>
                <p className="mt-1 text-sm font-bold text-foreground">{props.responseTime}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="text-xs text-muted">رضایت موکلان</p>
                <p className="mt-1 text-sm font-bold text-[#8a6420]">{faNum(props.satisfaction)}٪</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="text-xs text-muted">بازدید پروفایل</p>
                <p className="mt-1 text-sm font-bold text-foreground">{faNum(props.views.toLocaleString("en-US"))}</p>
              </div>
            </div>
          </div>
        )}

        {/* ————— تخصص‌ها ————— */}
        {tab === "specialties" && (
          <div role="tabpanel" id="lawyer-panel-specialties" aria-labelledby="lawyer-tab-specialties" className="space-y-6">
            <section>
              <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                <Icon name="scale" className="h-5 w-5 text-accent" /> حوزه‌های تخصص
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {props.specialties.map((s) => (
                  <a
                    key={s}
                    href={`/lawyers?sp=${encodeURIComponent(s)}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-3.5 py-1.5 text-sm font-semibold text-primary transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    <Icon name="scale" className="h-3.5 w-3.5" />
                    {s}
                  </a>
                ))}
              </div>
            </section>

            <section>
              <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                <Icon name="check" className="h-5 w-5 text-success" /> خدمات و تعرفه
              </h3>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {props.pricing.map((p) => (
                  <div key={p.key} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <Icon name={p.icon} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">{p.label}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{p.features.join(" • ")}</p>
                    </div>
                    <p className="dp-money shrink-0 text-sm">{formatToman(p.price)}</p>
                  </div>
                ))}
              </div>
              {props.services.length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {props.services.map((s) => (
                    <div key={s} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground-soft">
                      <Icon name="check" className="h-4 w-4 shrink-0 text-success" /> {s}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ————— سوابق ————— */}
        {tab === "records" && (
          <div role="tabpanel" id="lawyer-panel-records" aria-labelledby="lawyer-tab-records" className="space-y-6">
            {/* سه باکس آمار */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border bg-surface p-4 text-center card-shadow">
                <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon name="folder" className="h-4.5 w-4.5" />
                </span>
                <p className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">{faNum(props.caseCount)}</p>
                <p className="mt-0.5 text-xs text-muted">پرونده موفق</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4 text-center card-shadow">
                <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon name="star" className="h-4.5 w-4.5" />
                </span>
                <p className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">{faNum(props.satisfaction)}٪</p>
                <p className="mt-0.5 text-xs text-muted">رضایت موکلان</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4 text-center card-shadow">
                <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon name="briefcase" className="h-4.5 w-4.5" />
                </span>
                <p className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">{faNum(props.experienceYears)}</p>
                <p className="mt-0.5 text-xs text-muted">سال سابقه</p>
              </div>
            </div>

            {/* تایم‌لاین سوابق حرفه‌ای */}
            <div className="dp-timeline space-y-5 pr-1">
              <div className="dp-timeline-item done relative pr-8">
                <span className="dp-timeline-dot" aria-hidden />
                <p className="text-sm font-bold text-foreground">احراز هویت و تأیید پروانه</p>
                <p className="mt-1 text-xs leading-6 text-muted">پروانه وکالت شماره {props.licenseNo} توسط کارشناسان دادپیو راستی‌آزمایی شده است.</p>
              </div>
              <div className="dp-timeline-item done relative pr-8">
                <span className="dp-timeline-dot" aria-hidden />
                <p className="text-sm font-bold text-foreground">تجربه حرفه‌ای — {faNum(props.experienceYears)} سال</p>
                <p className="mt-1 text-xs leading-6 text-muted">فعالیت مستمر در حوزه‌های {props.specialties.join("، ")}.</p>
              </div>
              <div className="dp-timeline-item doing relative pr-8">
                <span className="dp-timeline-dot" aria-hidden />
                <p className="text-sm font-bold text-foreground">{faNum(props.caseCount)} پرونده موفق</p>
                <p className="mt-1 text-xs leading-6 text-muted">با رضایت {faNum(props.satisfaction)}٪ موکلان بر اساس {faNum(props.reviews.length)} نظر ثبت‌شده.</p>
              </div>
            </div>
          </div>
        )}

        {/* ————— نظرات ————— */}
        {tab === "reviews" && (
          <div role="tabpanel" id="lawyer-panel-reviews" aria-labelledby="lawyer-tab-reviews">
            {props.reviews.length === 0 ? (
              <EmptyState title="هنوز نظری ثبت نشده است" icon="chat" />
            ) : (
              <div className="space-y-3">
                {props.reviews.map((r) => (
                  <div key={r.id} className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
                    <Avatar name={r.clientName} color="#64748b" size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-foreground">{r.clientName}</p>
                        <span className="shrink-0 text-xs text-muted">{r.dateFa}</span>
                      </div>
                      <StarRating rating={r.rating} />
                      <p className="mt-1.5 text-sm leading-7 text-foreground-soft">{r.comment}</p>
                      {r.service && <div className="mt-2"><Badge tone="accent">{r.service}</Badge></div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
