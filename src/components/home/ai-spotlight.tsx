"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";

/**
 * اسپات‌لایت سینمایی «دستیار هوش مصنوعی حقوقی»:
 * پس‌زمینه ken-burns + حباب‌های شناور + افکت تایپ سؤال‌های نمونه + درخشش طلایی.
 */

const SAMPLE_QUESTIONS = [
  "مستأجرم اجاره نمی‌دهد؛ چطور تخلیه‌اش کنم؟",
  "مهریه‌ام را چطور مطالبه کنم؟",
  "چک برگشتی‌ام را چگونه وصول کنم؟",
  "سهم من از ارث چقدر است؟",
  "کارفرما بیمه‌ام را نریخته؛ چه کنم؟",
];

const FEATURES: { icon: "chat" | "clock" | "balance" | "book"; text: string }[] = [
  { icon: "book", text: "با استناد به قانون" },
  { icon: "clock", text: "پاسخ در چند ثانیه" },
  { icon: "balance", text: "رایگان و بدون تعهد" },
];

export function AISpotlight() {
  const t = useT();
  const [qIndex, setQIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "hold" | "deleting">("typing");

  // ماشین‌تایپ سؤال‌های نمونه
  useEffect(() => {
    const full = t(SAMPLE_QUESTIONS[qIndex % SAMPLE_QUESTIONS.length]);
    let timer: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      if (typed.length < full.length) {
        timer = setTimeout(() => setTyped(full.slice(0, typed.length + 1)), 42);
      } else {
        timer = setTimeout(() => setPhase("hold"), 1700);
      }
    } else if (phase === "hold") {
      timer = setTimeout(() => setPhase("deleting"), 400);
    } else {
      if (typed.length > 0) {
        timer = setTimeout(() => setTyped(full.slice(0, typed.length - 1)), 16);
      } else {
        // رفتن به سؤال بعدی — داخل تایمر تا setState سنکرون در effect رخ ندهد
        timer = setTimeout(() => {
          setQIndex((i) => i + 1);
          setPhase("typing");
        }, 60);
      }
    }
    return () => clearTimeout(timer);
  }, [typed, phase, qIndex, t]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 40, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ type: "spring", stiffness: 160, damping: 26 }}
      className="relative isolate overflow-hidden rounded-[2rem] border border-accent/30 bg-primary shadow-[var(--shadow-lift)]"
      aria-label={t("دستیار هوش مصنوعی حقوقی دادبان")}
    >
      {/* پس‌زمینه تصویری با ken-burns */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 animate-[kenburns_26s_ease-in-out_infinite_alternate]">
          <Image
            src="/images/ai-spotlight.png"
            alt={t("ترازوی طلایی عدالت در فضای سرمه‌ای — نماد هوش مصنوعی حقوقی دادبان")}
            fill
            sizes="(max-width: 1024px) 100vw, 1200px"
            className="object-cover opacity-45"
            priority={false}
          />
        </div>
        {/* گرادیان خوانایی */}
        <div className="absolute inset-0 bg-gradient-to-l from-primary/95 via-primary/80 to-primary/55" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_80%_10%,transparent_30%,color-mix(in_oklab,var(--primary)_75%,transparent)_100%)]" />
      </div>

      {/* حباب‌های شناور طلایی */}
      <span className="pointer-events-none absolute right-[12%] top-[18%] h-2.5 w-2.5 rounded-full bg-accent/70 blur-[1px] home-float" aria-hidden />
      <span className="pointer-events-none absolute right-[28%] top-[62%] h-2 w-2 rounded-full bg-accent/50 blur-[1px] home-float-slow" aria-hidden />
      <span className="pointer-events-none absolute left-[16%] top-[30%] h-3 w-3 rounded-full bg-accent/40 blur-[2px] home-float-slow" aria-hidden />
      <span className="pointer-events-none absolute left-[36%] bottom-[16%] h-1.5 w-1.5 rounded-full bg-accent/60 blur-[1px] home-float" aria-hidden />

      <div className="relative grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.15fr_1fr] lg:p-12">
        {/* متن اصلی */}
        <div>
          <motion.span
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1.5 text-xs font-black text-accent-text backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {t("هوش مصنوعی حقوقی دادبان")}
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.22, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-balance text-3xl font-black leading-[1.25] text-primary-foreground sm:text-4xl"
          >
            {t("سؤال حقوقی‌ات را بپرس؛")}
            <span className="mt-1 block bg-gradient-to-l from-accent via-[color-mix(in_oklab,var(--accent)_75%,white)] to-accent bg-clip-text text-transparent">
              {t("جواب مستند بگیر")}
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-4 max-w-lg text-sm leading-8 text-primary-foreground/75 sm:text-base"
          >
            {t(
              "دستیار هوشمند دادبان سؤال شما را می‌فهمد، مادهٔ قانونی مرتبط را پیدا می‌کند و مسیر اقدام بعدی را به زبان ساده توضیح می‌دهد — قبل از اینکه هزینه‌ای بدهید.",
            )}
          </motion.p>

          {/* افکت تایپ سؤال */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.38, duration: 0.5 }}
            className="mt-6 flex min-h-[3.75rem] max-w-lg items-center gap-3 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/[0.07] px-4 py-3 backdrop-blur"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Icon name="chat" className="h-4.5 w-4.5" />
            </span>
            <p className="truncate text-sm text-primary-foreground/90 sm:text-[15px]" aria-live="polite">
              «{typed}
              <span className="home-caret mr-0.5 inline-block h-4 w-[2px] translate-y-[3px] bg-accent" aria-hidden />
              »
            </p>
          </motion.div>

          {/* ویژگی‌ها */}
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
            {FEATURES.map((f) => (
              <span key={f.text} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-foreground/70">
                <Icon name={f.icon} className="h-4 w-4 text-accent-text" />
                {t(f.text)}
              </span>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/ai-assistant"
              className="home-shimmer relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-accent px-6 py-3.5 text-sm font-black text-accent-foreground shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_color-mix(in_oklab,var(--accent)_60%,transparent)] active:scale-[0.98]"
            >
              <Icon name="sparkles" className="h-5 w-5" />
              {t("شروع گفتگو با دستیار")}
            </Link>
            <span className="text-xs text-primary-foreground/60">{t("بدون نیاز به ثبت‌نام")}</span>
          </motion.div>

          {/* Disclaimer — دستیار جایگزین وکیل نیست */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="mt-4 max-w-lg text-[11px] leading-5 text-primary-foreground/55"
          >
            {t("پاسخ‌های دستیار هوشمند برای راهنمایی اولیه هستند و جایگزین مشاوره تخصصی وکیل نمی‌شوند.")}
          </motion.p>
        </div>

        {/* پنل نمونه پاسخ */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotateY: 8 }}
          whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35, type: "spring", stiffness: 140, damping: 22 }}
          className="hidden flex-col justify-center lg:flex"
        >
          <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/[0.06] p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-primary-foreground/10 pb-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-accent-text">
                <Icon name="sparkles" className="h-4 w-4" />
              </span>
              <p className="text-xs font-bold text-primary-foreground/85">{t("پاسخ نمونهٔ دستیار")}</p>
            </div>
            <ul className="mt-3 space-y-2.5 text-xs leading-6 text-primary-foreground/75">
              {[
                "مبنای قانونی: مادهٔ مرتبط قانون با زبان ساده",
                "گام‌های عملی: از اظهارنامه تا دادخواست",
                "هزینه و زمان تقریبی هر مسیر",
                "پیشنهاد ارجاع به وکیل متخصص در صورت نیاز",
              ].map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: 14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.55 + i * 0.12, duration: 0.4 }}
                  className="flex items-start gap-2"
                >
                  <Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-accent-text" />
                  {t(line)}
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
