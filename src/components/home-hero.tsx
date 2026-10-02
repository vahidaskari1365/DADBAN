"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icons";
import { Button } from "./ui";
import { HeroScene } from "./hero-scene";
import { LEGAL_TOPICS } from "@/lib/data";
import { trackEvent } from "@/lib/analytics";

export function HomeHero() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    trackEvent("landing_view");
  }, []);

  const go = () => {
    if (query.trim()) {
      router.push(`/ai-assistant?q=${encodeURIComponent(query.trim())}`);
      return;
    }
    if (selected) {
      // انتخاب موضوع → شروع مسیر با همان موضوع در موتور تصمیم‌گیری
      router.push(`/?topic=${encodeURIComponent(selected)}#quickstart`);
      return;
    }
    router.push("/#quickstart");
  };

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

        {/* The main question box */}
        <div
          className="animate-fade-up mx-auto mt-9 max-w-2xl rounded-3xl border border-border bg-surface/85 p-5 shadow-[var(--shadow-lift)] backdrop-blur-md sm:p-6"
          style={{ animationDelay: "0.24s" }}
        >
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
              onKeyDown={(e) => e.key === "Enter" && go()}
              placeholder="مثلاً: مستأجرم سه ماه اجاره نداده، چه کنم؟"
              className="h-11 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-soft"
            />
            <Button onClick={go} size="sm" icon="chat" className="h-11">
              بپرس
            </Button>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-muted">یا یک موضوع را انتخاب کنید:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/ai-assistant")}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent transition-all duration-200 cursor-pointer hover:border-accent/60 hover:bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] hover:shadow-sm"
              >
                <Icon name="sparkles" className="h-3.5 w-3.5" />
                دستیار حقوقی
              </button>
              {LEGAL_TOPICS.map((t) => {
                const active = selected === t.label;
                return (
                  <button
                    key={t.label}
                    type="button"
                    title={t.hint}
                    onClick={() => {
                      setSelected(active ? null : t.label);
                      setQuery("");
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-surface text-foreground-soft hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                    }`}
                  >
                    <Icon name={t.icon} className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {selected && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 animate-fade-up">
              <p className="text-sm text-foreground">
                موضوع انتخاب‌شده: <span className="font-bold text-primary">{selected}</span>
              </p>
              <Button onClick={go} size="sm" icon="arrow" className="mr-auto">
                شروع مسیر با همین موضوع
              </Button>
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
