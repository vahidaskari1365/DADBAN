"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "./ui";
import { Icon } from "./icons";
import { LEGAL_TOPICS, ALL_PROVINCES, faNum } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import { buildFunnelOptions, saveFunnelSelections, type FunnelRecommendation, type RecommendationOption } from "@/lib/recommendation";
import { trackEvent } from "@/lib/analytics";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

export const STAGES = ["هنوز اقدامی نکرده‌ام", "اظهارنامه/اخطار داده‌ام", "در دادگاه/دادسراست", "رأی صادر شده", "مرحله اجرا"];
const TOTAL = 3;

const STEP_TITLES = [
  "موضوع پرونده شما چیست؟",
  "پرونده در چه مرحله‌ای است؟",
  "در کدام استان هستید؟",
];

function OptionCard({
  label,
  icon,
  active,
  onClick,
  big,
}: {
  label: string;
  icon?: IconKey;
  active: boolean;
  onClick: () => void;
  big?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border px-4 text-right text-sm font-medium transition-all cursor-pointer ${
        big ? "flex-col justify-center py-5 text-center" : "py-3"
      } ${active ? "border-primary bg-primary-soft text-primary" : "border-border text-foreground-soft hover:bg-surface-2"}`}
    >
      {icon && <Icon name={icon} className={big ? "h-6 w-6" : "h-4 w-4"} />}
      {label}
    </button>
  );
}

export function ResultCard({ label, option, tone }: { label: string; option: RecommendationOption; tone: "primary" | "neutral" | "accent" }) {
  const t = useT();
  const styles = {
    primary: "border-primary bg-primary-soft/40 ring-1 ring-primary/30",
    neutral: "border-border",
    accent: "border-accent/40 bg-accent-soft/30",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${styles}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1.5 flex items-center gap-2 text-sm font-bold text-foreground">
        <Icon name={option.icon} className="h-4 w-4 shrink-0 text-primary" />
        {option.title}
      </p>
      <p className="mt-1 text-xs leading-6 text-muted">{option.desc}</p>
      <Button href={option.href} size="sm" icon={option.icon} className="mt-3">
        {t("شروع")}
      </Button>
    </div>
  );
}

function QuickStartInner() {
  const t = useT();
  const tf = templateT(t);
  const search = useSearchParams();
  const initialTopic = search.get("topic");
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState<string | null>(initialTopic && LEGAL_TOPICS.some((t) => t.label === initialTopic) ? initialTopic : null);
  const [stage, setStage] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  const canNext =
    step === 0 ? topic !== null : step === 1 ? stage !== null : province !== null;

  const goNext = () => {
    if (!started) {
      trackEvent("quickstart_started");
      setStarted(true);
    }
    if (step < TOTAL - 1) {
      setStep((s) => s + 1);
    } else {
      // پایان فانل — انتخاب‌ها ذخیره می‌شود تا فرم «ثبت پرونده» خودکار پر شود
      if (topic && stage && province) saveFunnelSelections({ topic, stage, province });
      trackEvent("quickstart_completed");
      setDone(true);
    }
  };

  const reset = () => {
    setStep(0);
    setTopic(null);
    setStage(null);
    setProvince(null);
    setDone(false);
    setStarted(false);
  };

  const rec: FunnelRecommendation | null =
    done && topic && stage && province
      ? buildFunnelOptions({ topic, stage, city: province })
      : null;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-lift)]">
      <div className="grid lg:grid-cols-[1fr_1.3fr]">
        {/* Side panel */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-primary to-primary-hover p-8 text-primary-foreground lg:flex">
          <div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <Icon name="bolt" className="h-6 w-6" />
            </span>
            <h3 className="mt-5 text-2xl font-bold leading-snug">{t("مسیر مناسب شما را مشخص می‌کنیم")}</h3>
            <p className="mt-3 text-sm leading-7 text-white/80">
              {t(
                "به چند سؤال کوتاه پاسخ دهید؛ سه مسیر پیشنهادی شفاف با دلیل دریافت می‌کنید و انتخاب‌هایتان در فرم بعدی خودکار پر می‌شود.",
              )}
            </p>
            <ul className="mt-5 space-y-2 text-xs text-white/75">
              {["سه مسیر پیشنهادی با دلیل روشن", "انتخاب‌های شما ذخیره می‌شود", "بدون پر کردن مجدد فرم"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Icon name="check" className="h-3.5 w-3.5 text-accent-text" />
                  {t(item)}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8">
            <div className="flex items-center gap-2">
              {Array.from({ length: TOTAL }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    i <= (done ? TOTAL - 1 : step) ? "bg-accent" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-white/70">
              {tf("گام {n} از {m}", { n: faNum((done ? TOTAL : step + 1)), m: faNum(TOTAL) })}
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="p-6 sm:p-8">
          {rec === null ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-text">
                {t("مسیر سریع دادورزان")}
              </p>
              <h4 className="mt-2 text-xl font-bold text-foreground">{t(STEP_TITLES[step])}</h4>

              <div className="mt-5">
                {step === 0 && (
                  <div className="flex flex-wrap gap-2">
                    {LEGAL_TOPICS.map((lt) => (
                      <button
                        key={lt.label}
                        type="button"
                        onClick={() => setTopic(lt.label)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all cursor-pointer ${
                          topic === lt.label
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-foreground-soft hover:border-primary/40 hover:bg-primary-soft"
                        }`}
                      >
                        <Icon name={lt.icon} className="h-4 w-4" />
                        {t(lt.label)}
                      </button>
                    ))}
                  </div>
                )}

                {step === 1 && (
                  <div className="flex flex-col gap-2">
                    {STAGES.map((s) => (
                      <OptionCard key={s} label={t(s)} active={stage === s} onClick={() => setStage(s)} icon={stage === s ? "check" : undefined} />
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <div className="relative">
                      <span className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-muted-soft">
                        <Icon name="location" className="h-5 w-5" />
                      </span>
                      <select
                        value={province ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setProvince(v || null);
                          // انتخاب استان → پایان فانل و نمایش سه گزینه
                          // (ذخیره مستقیم با v — state در همان رویداد هنوز به‌روز نشده)
                          if (v) {
                            try {
                              window.localStorage.setItem("dadban_province", v);
                            } catch {
                              /* حافظه محلی در دسترس نیست */
                            }
                            if (topic && stage) saveFunnelSelections({ topic, stage, province: v });
                            trackEvent("quickstart_completed");
                            setDone(true);
                          }
                        }}
                        aria-label={t("انتخاب استان")}
                        className="h-13 w-full cursor-pointer appearance-none rounded-xl border border-border-strong bg-background py-3.5 pl-4 pr-11 text-sm font-medium text-foreground outline-none transition-colors focus:border-primary"
                      >
                        <option value="" disabled>
                          {t("استان خود را از فهرست انتخاب کنید…")}
                        </option>
                        {ALL_PROVINCES.map((p) => (
                          <option key={p} value={p}>
                            {tf("استان {p}", { p })}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted-soft">
                        <Icon name="chevron" className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-muted">
                      {t("همه ۳۱ استان ایران در فهرست است — استان محل سکونت یا اقامت فعلی خود را انتخاب کنید.")}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className={`text-sm font-medium text-muted transition-colors hover:text-foreground ${step === 0 ? "invisible" : ""}`}
                >
                  {t("→ قبلی")}
                </button>
                <Button onClick={goNext} disabled={!canNext} icon="arrow">
                  {step === TOTAL - 1 ? t("دیدن پیشنهاد") : t("ادامه")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="animate-scale-in">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 text-success">
                <Icon name="check" className="h-6 w-6" />
              </span>
              <h4 className="mt-4 text-xl font-bold text-foreground">{t("پیشنهاد شما آماده است")}</h4>
              <p className="mt-1 text-sm leading-7 text-muted">{rec.nextStep}</p>

              {/* چرا این پیشنهاد؟ — توضیح‌پذیری */}
              <div className="mt-4 rounded-xl border border-border bg-surface-2/60 p-3.5">
                <p className="text-xs font-bold text-foreground">{t("چرا این پیشنهاد؟")}</p>
                <ul className="mt-2 space-y-1 text-xs leading-6 text-muted">
                  {rec.reasons.map((r) => (
                    <li key={r} className="flex items-start gap-1.5">
                      <Icon name="check" className="mt-1 h-3 w-3 shrink-0 text-success" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {rec.options.map((o, i) => (
                  <ResultCard key={o.key} label={tf("گزینه {n}", { n: faNum(i + 1) })} option={o} tone={i === 0 ? "primary" : i === 1 ? "neutral" : "accent"} />
                ))}
              </div>

              <button
                type="button"
                onClick={reset}
                className="mt-5 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
              >
                {t("شروع دوباره")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function QuickStart() {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-3xl border border-border bg-surface" />}>
      <QuickStartInner />
    </Suspense>
  );
}
