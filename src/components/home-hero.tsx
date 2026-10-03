"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icons";
import { Button } from "./ui";
import { HeroScene } from "./hero-scene";
import { LEGAL_TOPICS, ALL_PROVINCES, type IconKey } from "@/lib/data";
import { trackEvent } from "@/lib/analytics";
import { buildRecommendation, type HelpType } from "@/lib/recommendation";
import { STAGES, HELPS, ResultCard } from "./quick-start";

/* فانل درجایی هیرو — پس از انتخاب موضوع، مراحل بعدی همین‌جا ادامه می‌یابد (بدون پرش به پایین صفحه) */
const FSTEP_TITLES = [
  "",
  "پرونده در چه مرحله‌ای است؟",
  "یک‌خطی مشکل‌تان را بنویسید (اختیاری)",
  "در کدام استان هستید؟",
  "چه کمکی می‌خواهید؟",
];
const FUNNEL_TOTAL = 4; // مرحله/توضیح/استان/کمک — انتخاب موضوع گام صفر است

export function HomeHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [fstep, setFstep] = useState(0); // 0=انتخاب موضوع، 1..4 مراحل، 5=پیشنهاد
  const [topic, setTopic] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [province, setProvince] = useState<string | null>(null);
  const [help, setHelp] = useState<HelpType | null>(null);
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
    setDescription("");
    setProvince(null);
    setHelp(null);
    setStarted(false);
  };

  const finish = (h: HelpType) => {
    setHelp(h);
    setFstep(5);
    trackEvent("quickstart_completed");
  };

  const back = () => {
    if (fstep <= 1) resetFunnel();
    else setFstep((s) => Math.max(0, s - 1));
  };

  const search = () => {
    const q = query.trim();
    if (q) router.push(`/ai-assistant?q=${encodeURIComponent(q)}`);
  };

  const rec =
    fstep === 5 && topic && stage && province && help
      ? buildRecommendation({ topic, description, stage, city: province, help })
      : null;

  return (
    <section className="relative isolate flex min-h-[90vh] items-center overflow-hidden pb-16 pt-12 sm:min-h-[88vh]">
      <HeroScene />

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
        <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-xs font-medium text-foreground-soft backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          وکیل پایه یک دادگستری با پروانه راستی‌آزمایی‌شده
        </span>

        <h1
          className="animate-fade-up mt-6 text-balance text-4xl font-extrabold leading-[1.18] tracking-tight text-foreground sm:text-5xl md:text-6xl"
          style={{ animationDelay: "0.08s" }}
        >
          مشکل{" "}
          <span className="relative inline-block">
            <span className="bg-gradient-to-l from-primary via-accent to-primary bg-clip-text text-transparent">
              حقوقی‌تان
            </span>
            <svg
              className="absolute -bottom-2 right-0 h-3 w-full text-accent/50"
              viewBox="0 0 200 12"
              preserveAspectRatio="none"
              fill="none"
            >
              <path d="M2 9C40 3 160 3 198 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>{" "}
          چیست؟
        </h1>

        <p
          className="animate-fade-up mx-auto mt-6 max-w-xl text-base leading-8 text-muted sm:text-lg"
          style={{ animationDelay: "0.16s" }}
        >
          در چند سؤال کوتاه، مسیر مطمئن برایت را پیدا می‌کنیم — از راهنمایی رایگان تا وکیل متخصص.
          بدون هزینه پنهان، بدون موظف شدن به ثبت‌نام.
        </p>

        {/* Primary decision CTAs */}
        <div
          className="animate-fade-up mt-7 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "0.2s" }}
        >
          <Button href="/#quickstart" size="lg" icon="arrow" className="shadow-[var(--shadow-lift)]">
            شروع مسیر من
          </Button>
          <Button href="/lawyers" size="lg" variant="outline" icon="search">
            مستقیماً وکیل پیدا می‌کنم
          </Button>
        </div>

        {/* The main question box — فانل کامل در همین‌جا ادامه می‌یابد */}
        <div
          className="animate-fade-up mx-auto mt-9 max-w-2xl rounded-3xl border border-border bg-surface/85 p-5 text-right shadow-[var(--shadow-lift)] backdrop-blur-md sm:p-6"
          style={{ animationDelay: "0.24s" }}
        >
          {fstep === 0 ? (
            <>
              <label htmlFor="hero-search" className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <Icon name="sparkles" className="h-5 w-5 text-accent" />
                برای چه موضوعی به کمک حقوقی نیاز دارید؟
              </label>

              <div className="flex items-center gap-2 rounded-2xl border border-border-strong bg-background p-1.5 transition-colors focus-within:border-primary">
                <span className="pr-2 text-muted-soft">
                  <Icon name="search" className="h-5 w-5" />
                </span>
                <input
                  id="hero-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  placeholder="مثلاً: مستأجرم سه ماه اجاره نداده، چه کنم؟"
                  className="h-11 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-soft"
                />
                <Button onClick={search} size="sm" icon="chat" className="h-11">
                  بپرس
                </Button>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-muted">یا یک موضوع را انتخاب کنید — فرآیند همین‌جا ادامه می‌یابد:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/ai-assistant")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent transition-all duration-200 cursor-pointer hover:border-accent/60 hover:bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] hover:shadow-sm"
                  >
                    <Icon name="sparkles" className="h-3.5 w-3.5" />
                    دستیار حقوقی
                  </button>
                  {LEGAL_TOPICS.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      title={t.hint}
                      onClick={() => pickTopic(t.label)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground-soft transition-all duration-200 cursor-pointer hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                    >
                      <Icon name={t.icon} className="h-3.5 w-3.5" />
                      {t.label}
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
                    aria-label="تغییر موضوع"
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
                        fstep === 5 || i < fstep ? "bg-accent" : "bg-border"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {fstep <= 4 && (
                <h4 className="mt-4 text-base font-bold text-foreground">{FSTEP_TITLES[fstep]}</h4>
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
                        {s}
                        <Icon name="arrow" className="h-4 w-4 opacity-40" />
                      </button>
                    ))}
                  </div>
                )}

                {fstep === 2 && (
                  <div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="مثلاً: مستأجرم سه ماه اجاره نداده و در قرارداد شرط تخلیه دارم…"
                      className="w-full resize-y rounded-xl border border-border-strong bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-soft focus:border-primary"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-[11px] text-muted">اختیاری — برای هدایت دقیق‌تر.</p>
                      <Button onClick={() => setFstep(3)} size="sm" icon="arrow">
                        {description.trim() ? "ادامه" : "ادامه بدون شرح"}
                      </Button>
                    </div>
                  </div>
                )}

                {fstep === 3 && (
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
                            setFstep(4);
                          }
                        }}
                        aria-label="انتخاب استان"
                        className="h-13 w-full cursor-pointer appearance-none rounded-xl border border-border-strong bg-background py-3.5 pl-4 pr-11 text-sm font-medium text-foreground outline-none transition-colors focus:border-primary"
                      >
                        <option value="" disabled>
                          استان خود را از فهرست انتخاب کنید…
                        </option>
                        {ALL_PROVINCES.map((p) => (
                          <option key={p} value={p}>
                            استان {p}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted-soft">
                        <Icon name="chevron" className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                )}

                {fstep === 4 && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {HELPS.map((h) => (
                      <button
                        key={h.key}
                        type="button"
                        onClick={() => finish(h.key)}
                        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-border px-4 py-5 text-center text-sm font-medium text-foreground-soft transition-all hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                      >
                        <Icon name={h.icon as IconKey} className="h-6 w-6" />
                        {h.label}
                      </button>
                    ))}
                  </div>
                )}

                {fstep === 5 && rec && (
                  <div className="animate-fade-up">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15 text-success">
                        <Icon name="check" className="h-5 w-5" />
                      </span>
                      <p className="text-sm font-bold text-foreground">پیشنهاد شما آماده است</p>
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
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <ResultCard label="پیشنهاد اصلی" option={rec.primary} tone="primary" />
                      <ResultCard label="جایگزین" option={rec.alternative} tone="neutral" />
                    </div>
                    <div className="mt-3">
                      <ResultCard label="مسیر رایگان" option={rec.free} tone="accent" />
                    </div>
                    <button
                      type="button"
                      onClick={resetFunnel}
                      className="mt-4 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
                    >
                      شروع دوباره
                    </button>
                  </div>
                )}
              </div>

              {fstep <= 4 && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={back}
                    className="text-sm font-medium text-muted transition-colors hover:text-foreground"
                  >
                    → قبلی
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Trust row — only claims the product actually backs today */}
        <div
          className="animate-fade-up mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted"
          style={{ animationDelay: "0.32s" }}
        >
          {[
            { icon: "badge", text: "احراز هویت وکلا" },
            { icon: "lock", text: "محرمانگی اطلاعات" },
            { icon: "shield", text: "بازگشت وجه طبق سیاست شفاف" },
            { icon: "balance", text: "تعرفه شفاف پیش از تصمیم" },
          ].map((t) => (
            <span key={t.text} className="inline-flex items-center gap-1.5">
              <Icon name={t.icon as "badge"} className="h-4 w-4 text-accent" />
              {t.text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
