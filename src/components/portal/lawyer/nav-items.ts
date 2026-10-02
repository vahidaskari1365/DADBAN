import type { IconKey } from "@/lib/data";

/* ناوبری ۱۲گانهٔ پنل وکیل — مطابق پروتوتایپ dadpayo_legal_marketplace_v5 */
export type LawyerNavKey =
  | "dashboard"
  | "market"
  | "cases"
  | "proposals"
  | "contracts"
  | "finance"
  | "installments"
  | "caseflow"
  | "calendar"
  | "team"
  | "messages"
  | "profile";

export function lawyerNav(
  active: LawyerNavKey,
  badges: Partial<Record<LawyerNavKey, string>> = {},
): { label: string; icon: IconKey; active?: boolean; badge?: string; href: string }[] {
  return [
    { label: "داشبورد", icon: "home", href: "/dashboard/lawyer", active: active === "dashboard" },
    { label: "پرونده‌های پیشنهادی", icon: "scale", href: "/dashboard/lawyer/market", active: active === "market" },
    { label: "پرونده‌های من", icon: "folder", href: "/dashboard/lawyer#my-cases", active: active === "cases" },
    {
      label: "پیشنهادهای قیمت",
      icon: "send",
      href: "/dashboard/lawyer/proposals",
      active: active === "proposals",
      badge: badges.proposals,
    },
    { label: "قراردادها", icon: "file", href: "/dashboard/lawyer/proposals#contracts", active: active === "contracts" },
    { label: "مالی و برداشت", icon: "money", href: "/dashboard/lawyer/finance", active: active === "finance" },
    { label: "اقساط و تأمین اعتبار", icon: "calculator", href: "/dashboard/lawyer#installments", active: active === "installments" },
    { label: "روند پرونده", icon: "clock", href: "/dashboard/lawyer#caseflow", active: active === "caseflow" },
    { label: "تقویم و مهلت‌ها", icon: "calendar", href: "/dashboard/lawyer/calendar", active: active === "calendar" },
    { label: "کارآموز و تیم", icon: "user", href: "/dashboard/lawyer/team", active: active === "team" },
    { label: "پیام‌ها", icon: "mail", href: "/dashboard/lawyer#messages", active: active === "messages" },
    { label: "پروفایل حرفه‌ای", icon: "id", href: "/dashboard/lawyer/profile", active: active === "profile" },
  ];
}
