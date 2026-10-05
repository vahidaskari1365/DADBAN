import { Reveal } from "@/components/reveal";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";

/**
 * «مسائل حقوقی رایج» — بخش Landing-oriented:
 * جمله‌هایی به زبان خودِ کاربر که مستقیم به مسیر واقعی سایت وصل می‌شوند.
 */

const PROBLEMS: { text: string; href: string; icon: IconKey }[] = [
  { text: "مستأجرم اجاره نمی‌دهد", href: "/lawyers?sp=ملک", icon: "home" },
  { text: "چک برگشتی دارم", href: "/lawyers?sp=چک و اسناد", icon: "money" },
  { text: "از من شکایت شده", href: "/lawyers?sp=کیفری", icon: "shield" },
  { text: "می‌خواهم طلاق بگیرم", href: "/lawyers?sp=خانواده", icon: "family" },
  { text: "قراردادم را قبل از امضا بررسی کنم", href: "/contracts/review", icon: "file" },
  { text: "مشکل حقوق و مزایا دارم", href: "/employee-lawyers", icon: "briefcase" },
  { text: "درباره ارث اختلاف داریم", href: "/lawyers?sp=ارث", icon: "scale" },
  { text: "می‌خواهم شرکت ثبت کنم", href: "/pricing", icon: "building" },
];

export function CommonProblems() {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {PROBLEMS.map((p, i) => (
        <Reveal key={p.text} delay={i * 40} variant="start">
          <a
            href={p.href}
            className="group flex min-h-[52px] items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all duration-200 hover:border-accent/40 hover:bg-accent-soft/40"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Icon name={p.icon} className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm font-semibold text-foreground-soft transition-colors group-hover:text-foreground">
              {p.text}
            </span>
            <Icon name="arrow" className="h-4 w-4 shrink-0 text-muted opacity-50 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100 group-hover:text-accent-text" />
          </a>
        </Reveal>
      ))}
    </div>
  );
}
