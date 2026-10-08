"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icons";
import { Button } from "./ui";
import { HeroScene } from "./hero-scene";
import { LEGAL_TOPICS, ALL_PROVINCES, faNum } from "@/lib/data";
import { trackEvent } from "@/lib/analytics";
import { buildFunnelOptions, saveFunnelSelections, type FunnelRecommendation } from "@/lib/recommendation";
import { STAGES, ResultCard } from "./quick-start";
import { useT } from "@/lib/i18n/provider";

/* فانل درجایی هیرو — پس از انتخاب موضوع، مراحل بعدی همین‌جا ادامه می‌یابد (بدون پرش به پایین صفحه) */
const FSTEP_TITLES = [
  "",
  "پرونده در چه مرحله‌ای است؟",
  "در کدام استان هستید؟",
];
const FUNNEL_TOTAL = 2; // مرحله/استان — انتخاب موضوع گام صفر است؛ پس از استان، سه گزینه نهایی نمایش داده می‌شود

/* موضوعات محبوب هیرو — از داده واقعی سیستم (LEGAL_TOPICS) انتخاب شده‌اند */
const HERO_TOPIC_LABELS = ["ملک و اجاره", "طلاق", "کیفری", "کار", "قرارداد", "ارث", "چک", "مهریه"];

export function HomeHero() {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [fstep, setFstep] = useState(0); // 0=انتخاب موضوع، 1..2 مراحل، 3=پیشنهاد سه‌گزینه‌ای
  const [topic, setTopic] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    trackEvent("landing_view");
  }, []);

  const markStarted = () => {
    if (!started) {
      trackEvent("quickstart_started");
      setStarted(true);
    }
  };

  const pickTopic = (label: string) => {
    setTopic(label);
    setQuery("");
    markStarted();
    setFstep(1);
  };

  const resetFunnel = () => {
    setFstep(0);
    setTopic(null);
    setStage(null);
    setProvince(null);
    setStarted(false);
  };

  const back = () => {
    if (fstep <= 1) resetFunnel();
    else setFstep((s) => Math.max(0, s - 1));
  };

  const search = () => {
    const q = query.trim();
    if (q) router.push(`/ai-assistant?q=${encodeURIComponent(q)}`);
  };

  const rec: FunnelRecommendation | null =
    fstep === 3 && topic && stage && province
      ? buildFunnelOptions({ topic, stage, city: province })
      : null;

  const heroTopics = HERO_TOPIC_LABELS.map(
    (label) => LEGAL_TOPICS.find((t) => t.label === label)!,
  ).filter(Boolean);

  return (
    <section className="relative isolate flex min-h-[86vh] items-center overflow-hidden pb-16 pt-12 sm:min-h-[84vh]">
      <HeroScene />

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
        <h1
          className="animate-fade-up text-balance text-4xl font-extrabold leading-[1.2] tracking-tight text-foreground sm:text-5xl md:text-6xl"
        >
          {t("مشکل حقوقی دارید؟")}{" "}
          <span className="relative inline-block">
            <span className="bg-gradient-to-l from-primary via-accent to-primary bg-clip-text text-transparent">
              {t("اول مسیر درست")}
            </span>
            <svg
              className="absolute -bottom-2 right-0 h-3 w-full text-accent-text/50"
              viewBox="0 0 200 12"
              preserveAspectRatio="none"
              fill="none"
            >
              <path d="M2 9C40 3 160 3 198 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>{" "}
          {t("را پیدا کنید.")}
        </h1>

        <p
          className="animate-fade-up mx-auto mt-6 max-w-xl text-base leading-8 text-muted sm:text-lg"
          style={{ animationDelay: "0.12s" }}
        >
          {t(
            "مسئله‌تان را برای دادبان بنویسید؛ مسیر مناسب را پیدا کنید و اگر لازم بود، به وکیل یا خدمت حقوقی مناسب وصل شوید.",
          )}
        </p>

        {/* Legal Problem Search — ورودی اصلی؛ پس از Enter به مسیر بررسی مشکل می‌رود */}
        <div
          className="animate-fade-up mx-auto mt-9 max-w-2xl rounded-3xl border border-border bg-surface/85 p-5 text-right shadow-[var(--shadow-lift)] backdrop-blur-md sm:p-6"
          style={{ animationDelay: "0.18s" }}
        >
          {fstep === 0 ? (
            <>
              <div className="flex flex-col gap-2 rounded-2xl border border-border-strong bg-background p-1.5 transition-colors focus-within:border-primary sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center">
                  <span className="pr-2 text-muted-soft">
                    <Icon name="search" className="h-5 w-5" />
                  </span>
                  <input
                    id="hero-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                    placeholder={t("مثلاً: مستأجرم چند ماه اجاره نداده، چه کار کنم؟")}
                    aria-label={t("شرح مشکل حقوقی شما")}
                    className="h-11 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-soft"
                  />
                </div>
                <Button onClick={search} size="sm" icon="arrow" className="h-11 w-full justify-center sm:w-auto">
                  {t("بررسی مشکل من")}
                </Button>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-muted">{t("یا موضوع را انتخاب کنید — مسیر همین‌جا ادامه می‌یابد:")}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {heroTopics.map((top) => (
                    <button
                      key={top.label}
                      type="button"
                      title={t(top.hint)}
                      onClick={() => pickTopic(top.label)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground-soft transition-all duration-200 cursor-pointer hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                    >
                      <Icon name={top.icon} className="h-3.5 w-3.5" />
                      {t(top.label)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="animate-fade-up">
              {/* سربرگ فانل: موضوع + پیشرفت */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary">
                  <Icon name="check" className="h-3.5 w-3.5" />
                  {topic}
                  <button
                    type="button"
                    onClick={resetFunnel}
                    aria-label={t("تغییر موضوع")}
                    className="mr-1 cursor-pointer rounded-full p-0.5 text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <Icon name="x" className="h-3 w-3" />
                  </button>
                </span>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: FUNNEL_TOTAL }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                        fstep === 3 || i < fstep ? "bg-accent" : "bg-border"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {fstep <= 2 && (
                <h4 className="mt-4 text-base font-bold text-foreground">{t(FSTEP_TITLES[fstep])}</h4>
              )}

              <div className="mt-3">
                {fstep === 1 && (
                  <div className="flex flex-col gap-2">
                    {STAGES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setStage(s);
                          setFstep(2);
                        }}
                        className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground-soft transition-all hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                      >
                        {t(s)}
                        <Icon name="arrow" className="h-4 w-4 opacity-40" />
                      </button>
                    ))}
                  </div>
                )}

                {fstep === 2 && (
                  <div>
                    <div className="relative">
                      <span className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-muted-soft">
                        <Icon name="location" className="h-5 w-5" />
                      </span>
                      <select
                        value={province ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v) {
                            setProvince(v);
                            try {
                              window.localStorage.setItem("dadban_province", v);
                            } catch {
                              /* حافظه محلی در دسترس نیست */
                            }
                            // پایان فانل — ذخیره انتخاب‌ها و نمایش سه گزینه
                            saveFunnelSelections({ topic: topic ?? "", stage: stage ?? "", province: v });
                            trackEvent("quickstart_completed");
                            setFstep(3);
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
                            {t("استان")} {p}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted-soft">
                        <Icon name="chevron" className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                )}

                {fstep === 3 && rec && (
                  <div className="animate-fade-up">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15 text-success">
                        <Icon name="check" className="h-5 w-5" />
                      </span>
                      <p className="text-sm font-bold text-foreground">{t("پیشنهاد شما آماده است")}</p>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-muted">{rec.nextStep}</p>
                    <ul className="mt-2 space-y-1 text-xs leading-6 text-muted">
                      {rec.reasons.slice(0, 3).map((r) => (
                        <li key={r} className="flex items-start gap-1.5">
                          <Icon name="check" className="mt-1 h-3 w-3 shrink-0 text-success" />
                          {r}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {rec.options.map((o, i) => (
                        <ResultCard key={o.key} label={t(`گزینه ${faNum(i + 1)}`)} option={o} tone={i === 0 ? "primary" : i === 1 ? "neutral" : "accent"} />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={resetFunnel}
                      className="mt-4 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
                    >
                      {t("شروع دوباره")}
                    </button>
                  </div>
                )}
              </div>

              {fstep <= 2 && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={back}
                    className="text-sm font-medium text-muted transition-colors hover:text-foreground"
                  >
                    {t("→ قبلی")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
