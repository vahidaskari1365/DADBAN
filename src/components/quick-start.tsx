"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "./ui";
import { Icon } from "./icons";
import { LEGAL_TOPICS, ALL_CITIES, faNum } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import { buildRecommendation, type HelpType, type Recommendation } from "@/lib/recommendation";
import { trackEvent } from "@/lib/analytics";

const STAGES = ["هنوز اقدامی نکرده‌ام", "اظهارنامه/اخطار داده‌ام", "در دادگاه/دادسراست", "رأی صادر شده", "مرحله اجرا"];
const HELPS: { key: HelpType; label: string; icon: IconKey }[] = [
  { key: "consult", label: "مشاوره و راهنمایی", icon: "chat" },
  { key: "lawyer", label: "استخدام وکیل", icon: "user" },
  { key: "doc", label: "تنظیم سند/قرارداد", icon: "document" },
];
const TOTAL = 5;

const STEP_TITLES = [
  "موضوع پرونده شما چیست؟",
  "یک‌خطی مشکل‌تان را بنویسید (اختیاری)",
  "پرونده در چه مرحله‌ای است؟",
  "در کدام شهر هستید؟",
  "چه کمکی می‌خواهید؟",
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

function ResultCard({ label, option, tone }: { label: string; option: Recommendation["primary"]; tone: "primary" | "neutral" | "accent" }) {
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
        شروع
      </Button>
    </div>
  );
}

function QuickStartInner() {
  const search = useSearchParams();
  const initialTopic = search.get("topic");
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState<string | null>(initialTopic && LEGAL_TOPICS.some((t) => t.label === initialTopic) ? initialTopic : null);
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [help, setHelp] = useState<HelpType | null>(null);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  const canNext =
    step === 0 ? topic !== null : step === 1 ? true : step === 2 ? stage !== null : step === 3 ? city !== null : help !== null;

  const goNext = () => {
    if (!started) {
      trackEvent("quickstart_started");
      setStarted(true);
    }
    if (step < TOTAL - 1) {
      setStep((s) => s + 1);
    } else {
      trackEvent("quickstart_completed");
      setDone(true);
    }
  };

  const reset = () => {
    setStep(0);
    setTopic(null);
    setDescription("");
    setStage(null);
    setCity(null);
    setHelp(null);
    setDone(false);
    setStarted(false);
  };

  const rec: Recommendation | null =
    done && topic && stage && city && help
      ? buildRecommendation({ topic, description, stage, city, help })
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
            <h3 className="mt-5 text-2xl font-bold leading-snug">مسیر مناسب شما را مشخص می‌کنیم</h3>
            <p className="mt-3 text-sm leading-7 text-white/80">
              به چند سؤال کوتاه پاسخ دهید؛ یک پیشنهاد اولیهٔ شفاف با دلیل، یک گزینه جایگزین و یک
              مسیر رایگان دریافت می‌کنید.
            </p>
            <ul className="mt-5 space-y-2 text-xs text-white/75">
              {["پیشنهاد اولیه با دلیل روشن", "گزینه جایگزین", "مسیر بدون هزینه"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Icon name="check" className="h-3.5 w-3.5 text-accent" />
                  {t}
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
              گام {faNum((done ? TOTAL : step + 1))} از {faNum(TOTAL)}
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="p-6 sm:p-8">
          {rec === null ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                مسیر سریع دادبان
              </p>
              <h4 className="mt-2 text-xl font-bold text-foreground">{STEP_TITLES[step]}</h4>

              <div className="mt-5">
                {step === 0 && (
                  <div className="flex flex-wrap gap-2">
                    {LEGAL_TOPICS.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => setTopic(t.label)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all cursor-pointer ${
                          topic === t.label
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-foreground-soft hover:border-primary/40 hover:bg-primary-soft"
                        }`}
                      >
                        <Icon name={t.icon} className="h-4 w-4" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="مثلاً: مستأجرم سه ماه اجاره نداده و در قرارداد شرط تخلیه دارم…"
                      className="w-full resize-y rounded-xl border border-border-strong bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-soft focus:border-primary"
                    />
                    <p className="mt-1.5 text-[11px] text-muted">اختیاری — فقط برای دقیق‌تر شدن هدایت استفاده می‌شود.</p>
                  </div>
                )}

                {step === 2 && (
                  <div className="flex flex-col gap-2">
                    {STAGES.map((s) => (
                      <OptionCard key={s} label={s} active={stage === s} onClick={() => setStage(s)} icon={stage === s ? "check" : undefined} />
                    ))}
                  </div>
                )}

                {step === 3 && (
                  <div className="flex flex-wrap gap-2">
                    {ALL_CITIES.slice(0, 18).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCity(c)}
                        className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-all cursor-pointer ${
                          city === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground-soft hover:bg-primary-soft"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                {step === 4 && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {HELPS.map((h) => (
                      <OptionCard key={h.key} label={h.label} icon={h.icon} active={help === h.key} onClick={() => setHelp(h.key)} big />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className={`text-sm font-medium text-muted transition-colors hover:text-foreground ${step === 0 ? "invisible" : ""}`}
                >
                  → قبلی
                </button>
                <Button onClick={goNext} disabled={!canNext} icon="arrow">
                  {step === TOTAL - 1 ? "دیدن پیشنهاد" : step === 1 ? (description.trim() ? "ادامه" : "ادامه بدون شرح") : "ادامه"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="animate-scale-in">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 text-success">
                <Icon name="check" className="h-6 w-6" />
              </span>
              <h4 className="mt-4 text-xl font-bold text-foreground">پیشنهاد شما آماده است</h4>
              <p className="mt-1 text-sm leading-7 text-muted">{rec.nextStep}</p>

              {/* چرا این پیشنهاد؟ — توضیح‌پذیری */}
              <div className="mt-4 rounded-xl border border-border bg-surface-2/60 p-3.5">
                <p className="text-xs font-bold text-foreground">چرا این پیشنهاد؟</p>
                <ul className="mt-2 space-y-1 text-xs leading-6 text-muted">
                  {rec.reasons.map((r) => (
                    <li key={r} className="flex items-start gap-1.5">
                      <Icon name="check" className="mt-1 h-3 w-3 shrink-0 text-success" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ResultCard label="پیشنهاد اصلی" option={rec.primary} tone="primary" />
                <ResultCard label="جایگزین" option={rec.alternative} tone="neutral" />
              </div>
              <div className="mt-3">
                <ResultCard label="مسیر رایگان" option={rec.free} tone="accent" />
              </div>

              <button
                type="button"
                onClick={reset}
                className="mt-5 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
              >
                شروع دوباره
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
