"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";

/**
 * «مسیر دادبان» — خط سفر از مشکل تا نتیجه در چهار گام.
 * نوآوری بصری: خط اتصال با نقطهٔ نورانیِ سیار (RTL) + گام‌بندی اسپرینگی.
 */

const STATIONS: { icon: IconKey; title: string; desc: string; tag?: string }[] = [
  { icon: "chat", title: "بگو چه اتفاقی افتاده", desc: "چند سؤال کوتاه یا گفتگو با دستیار هوشمند", tag: "رایگان" },
  { icon: "calculator", title: "مسیر و هزینه روشن می‌شود", desc: "پیش از هر پرداخت، گام‌ها و تعرفه را می‌بینی", tag: "شفاف" },
  { icon: "user", title: "کار را بسپار", desc: "وکیل متخصص یا نمایندهٔ اداری دادبان انجام می‌دهد" },
  { icon: "clock", title: "تا نتیجه کنارت می‌مانیم", desc: "پیگیری زندهٔ پرونده در داشبورد دادبان" },
];

const spring = { type: "spring" as const, stiffness: 190, damping: 22 };

export function JourneyLine() {
  return (
    <div className="relative">
      {/* خط اتصال افقی دسکتاپ + نقطهٔ سیار */}
      <span
        className="absolute inset-x-[13%] top-[27px] hidden h-[2px] bg-gradient-to-l from-accent/55 via-border to-border sm:block"
        aria-hidden
      />
      <span
        className="home-journey-dot absolute top-[22px] z-10 hidden h-3 w-3 rounded-full bg-accent shadow-[0_0_16px_5px_color-mix(in_oklab,var(--accent)_40%,transparent)] sm:block"
        aria-hidden
      />

      {/* خط عمودی موبایل */}
      <span className="absolute bottom-7 right-[27px] top-7 w-[2px] bg-gradient-to-b from-accent/50 via-border to-border sm:hidden" aria-hidden />

      <ol className="relative grid gap-7 sm:grid-cols-4 sm:gap-5">
        {STATIONS.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 26, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "0px 0px -50px 0px" }}
            transition={{ ...spring, delay: i * 0.1 }}
            className="relative flex items-start gap-4 sm:flex-col sm:items-center sm:text-center"
          >
            <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-primary card-shadow">
              <Icon name={s.icon} className="h-6 w-6" />
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-black text-accent-foreground shadow-sm">
                {i + 1}
              </span>
            </span>
            <div className="sm:mt-4">
              <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
                <h3 className="text-[15px] font-black text-foreground">{s.title}</h3>
                {s.tag && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
                    {s.tag}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-6 text-muted sm:max-w-[24ch]">{s.desc}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
