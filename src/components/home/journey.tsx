"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";

/**
 * «مسیر حقوقی در دادبان ساده است» — سه گام بسیار ساده.
 * خط اتصال با نقطهٔ نورانی سیار (RTL) — تنها موشن این بخش، برای کمک به Hierarchy.
 */

const STEPS: { icon: IconKey; title: string; desc: string }[] = [
  { icon: "chat", title: "مسئله‌تان را بگویید", desc: "شرح کوتاه مشکل را بنویسید یا موضوع را انتخاب کنید." },
  { icon: "search", title: "مسیر مناسب را پیدا کنید", desc: "دادبان گام‌های بعدی، هزینه و وکیل یا خدمت مناسب را روشن می‌کند." },
  { icon: "handshake", title: "با وکیل یا خدمت مناسب اقدام کنید", desc: "کار را با اطمینان شروع کنید و پیشرفتش را پیگیری کنید." },
];

const spring = { type: "spring" as const, stiffness: 190, damping: 22 };

export function HowItWorks() {
  const t = useT();
  return (
    <div className="relative">
      {/* خط اتصال افقی دسکتاپ + نقطهٔ سیار */}
      <span
        className="absolute inset-x-[18%] top-[27px] hidden h-[2px] bg-gradient-to-l from-accent/55 via-border to-border sm:block"
        aria-hidden
      />
      <span
        className="home-journey-dot absolute top-[22px] z-10 hidden h-3 w-3 rounded-full bg-accent shadow-[0_0_16px_5px_color-mix(in_oklab,var(--accent)_40%,transparent)] sm:block"
        aria-hidden
      />

      {/* خط عمودی موبایل */}
      <span className="absolute bottom-7 right-[27px] top-7 w-[2px] bg-gradient-to-b from-accent/50 via-border to-border sm:hidden" aria-hidden />

      <ol className="relative grid gap-8 sm:grid-cols-3 sm:gap-6">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
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
              <h3 className="text-[15px] font-black text-foreground">{t(s.title)}</h3>
              <p className="mt-1 text-xs leading-6 text-muted sm:max-w-[30ch] sm:text-[13px]">{t(s.desc)}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
