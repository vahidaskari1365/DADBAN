"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";

const SUGGESTIONS = [
  "مستأجر اجاره نمی‌دهد، چه کنم؟",
  "چطور مهریه را مطالبه کنم؟",
  "پیگیری پرونده در شعبه",
  "بررسی قرارداد همکاری",
];

export default function AIFunnel() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function go(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/ai-assistant?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-primary-hover p-8 text-primary-foreground sm:p-12">
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="relative grid items-center gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Icon name="sparkles" className="h-4 w-4" /> هوش مصنوعی حقوقی
          </span>
          <h2 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">دستیار حقوقی هوشمند، ۲۴ ساعته راهنمای شماست</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/85">
            موضوع خود را بنویسید؛ دستیار دادبان بهترین اقدام بعدی را پیشنهاد می‌دهد و در موضوعات تخصصی،
            شما را به وکیل متخصص وصل می‌کند — جایگزین وکیل نیست.
          </p>
          <form
            className="mt-6 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              go(q);
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="موضوع حقوقی خود را بنویسید…"
              className="w-full rounded-xl border-0 bg-white/95 px-4 py-3 text-sm text-foreground outline-none ring-2 ring-transparent focus:ring-accent"
            />
            <Button type="submit" variant="accent" icon="arrow">
              دریافت راهنمایی
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => go(s)}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur transition hover:bg-white/20"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="hidden rounded-2xl bg-white/10 p-4 backdrop-blur lg:block">
          <div className="flex items-center gap-2 border-b border-white/15 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon name="sparkles" className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">دستیار دادبان</span>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <p className="rounded-xl rounded-tr-sm bg-white/15 px-3 py-2">مستأجر من سه ماه اجاره نداده، چه کنم؟</p>
            <p className="rounded-xl rounded-tl-sm bg-white/25 px-3 py-2 leading-6">
              موضوع ملک و اجاره شناسایی شد. مدارک لازم: قرارداد اجاره و گواهی پرداخت. مراحل بعدی: اظهارنامه،
              دادخواست تخلیه و پیگیری اجرا — در صورت نیاز به وکیل متخصص وصل می‌شوید.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
