"use client";

import { useState } from "react";
import { Avatar, Badge, EmptyState, StarRating } from "./ui";
import { Icon } from "./icons";
import { faNum } from "@/lib/data";
import { formatToman } from "@/lib/money";
import type { IconKey } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

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
  const t = useT();
  const tf = templateT(t);
  const [tab, setTab] = useState<TabKey>("info");

  return (
    <div>
      {/* نوار تب‌ها — اسکرول افقی روی موبایل */}
      <div role="tablist" aria-label={t("بخش‌های پروفایل وکیل")} className="flex gap-1.5 overflow-x-auto border-b border-border pb-px">
        {TABS.map((tb) => {
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              type="button"
              role="tab"
              id={`lawyer-tab-${tb.key}`}
              aria-selected={active}
              aria-controls={`lawyer-panel-${tb.key}`}
              onClick={() => setTab(tb.key)}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-t-xl border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
                active
                  ? "border-[color:var(--gold)] bg-surface text-foreground"
                  : "border-transparent text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              <Icon name={tb.icon} className={`h-4 w-4 ${active ? "text-accent" : ""}`} />
              {t(tb.label)}
              {tb.key === "reviews" && (
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
                <Icon name="user" className="h-5 w-5 text-accent" /> {t("درباره من")}
              </h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-8 text-foreground-soft">{props.about}</p>
            </section>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="text-xs text-muted">{t("شماره پروانه")}</p>
                <p className="mt-1 text-sm font-bold text-foreground" dir="ltr">{props.licenseNo}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="text-xs text-muted">{t("زمان پاسخ")}</p>
                <p className="mt-1 text-sm font-bold text-foreground">{props.responseTime}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="text-xs text-muted">{t("رضایت موکلان")}</p>
                <p className="mt-1 text-sm font-bold text-[#8a6420]">{faNum(props.satisfaction)}٪</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="text-xs text-muted">{t("بازدید پروفایل")}</p>
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
                <Icon name="scale" className="h-5 w-5 text-accent" /> {t("حوزه‌های تخصص")}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {props.specialties.map((s) => (
                  <a
                    key={s}
                    href={`/lawyers?sp=${encodeURIComponent(s)}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-3.5 py-1.5 text-sm font-semibold text-primary transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    <Icon name="scale" className="h-3.5 w-3.5" />
                    {t(s)}
                  </a>
                ))}
              </div>
            </section>

            <section>
              <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                <Icon name="check" className="h-5 w-5 text-success" /> {t("خدمات و تعرفه")}
              </h3>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {props.pricing.map((p) => (
                  <div key={p.key} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <Icon name={p.icon} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">{t(p.label)}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{p.features.map((f) => t(f)).join(" • ")}</p>
                    </div>
                    <p className="dp-money shrink-0 text-sm">{formatToman(p.price)}</p>
                  </div>
                ))}
              </div>
              {props.services.length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {props.services.map((s) => (
                    <div key={s} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground-soft">
                      <Icon name="check" className="h-4 w-4 shrink-0 text-success" /> {t(s)}
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
                <p className="mt-0.5 text-xs text-muted">{t("پرونده موفق")}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4 text-center card-shadow">
                <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon name="star" className="h-4.5 w-4.5" />
                </span>
                <p className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">{faNum(props.satisfaction)}٪</p>
                <p className="mt-0.5 text-xs text-muted">{t("رضایت موکلان")}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4 text-center card-shadow">
                <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon name="briefcase" className="h-4.5 w-4.5" />
                </span>
                <p className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">{faNum(props.experienceYears)}</p>
                <p className="mt-0.5 text-xs text-muted">{t("سال سابقه")}</p>
              </div>
            </div>

            {/* تایم‌لاین سوابق حرفه‌ای */}
            <div className="dp-timeline space-y-5 pr-1">
              <div className="dp-timeline-item done relative pr-8">
                <span className="dp-timeline-dot" aria-hidden />
                <p className="text-sm font-bold text-foreground">{t("احراز هویت و تأیید پروانه")}</p>
                <p className="mt-1 text-xs leading-6 text-muted">{tf("پروانه وکالت شماره {no} توسط کارشناسان دادورزان راستی‌آزمایی شده است.", { no: props.licenseNo })}</p>
              </div>
              <div className="dp-timeline-item done relative pr-8">
                <span className="dp-timeline-dot" aria-hidden />
                <p className="text-sm font-bold text-foreground">{tf("تجربه حرفه‌ای — {n} سال", { n: faNum(props.experienceYears) })}</p>
                <p className="mt-1 text-xs leading-6 text-muted">{tf("فعالیت مستمر در حوزه‌های {sp}.", { sp: props.specialties.map((s) => t(s)).join("، ") })}</p>
              </div>
              <div className="dp-timeline-item doing relative pr-8">
                <span className="dp-timeline-dot" aria-hidden />
                <p className="text-sm font-bold text-foreground">{tf("{n} پرونده موفق", { n: faNum(props.caseCount) })}</p>
                <p className="mt-1 text-xs leading-6 text-muted">{tf("با رضایت {s}٪ موکلان بر اساس {n} نظر ثبت‌شده.", { s: faNum(props.satisfaction), n: faNum(props.reviews.length) })}</p>
              </div>
            </div>
          </div>
        )}

        {/* ————— نظرات ————— */}
        {tab === "reviews" && (
          <div role="tabpanel" id="lawyer-panel-reviews" aria-labelledby="lawyer-tab-reviews">
            {props.reviews.length === 0 ? (
              <EmptyState title={t("هنوز نظری ثبت نشده است")} icon="chat" />
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
                      {r.service && <div className="mt-2"><Badge tone="accent">{r.service ? t(r.service) : r.service}</Badge></div>}
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
