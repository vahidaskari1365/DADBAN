import type { IconKey } from "@/lib/data";

/**
 * پیکربندی مشترک منوی پنل مدیریت دادورزان.
 *
 * یک منبع واحد برای:
 * - سایدبار پایدار شِل ادمین (src/components/admin/admin-shell.tsx)
 * - بلوک «مدیریت سریع» داشبورد در موبایل (src/app/admin/page.tsx)
 *
 * هر آیتم با کلید دسترسی (perm) محافظت می‌شود؛ فیلتر نهایی سمت سرور با hasPerm انجام می‌شود.
 */

export type AdminMenuGroupKey = "content" | "lawyers" | "engage" | "money" | "system";

export interface AdminMenuGroup {
  key: AdminMenuGroupKey;
  label: string;
  icon: IconKey;
}

export interface AdminMenuItem {
  label: string;
  href: string;
  icon: IconKey;
  perm: string;
  group: AdminMenuGroupKey;
}

/** گروه‌های منوی مدیریت */
export const ADMIN_GROUPS: AdminMenuGroup[] = [
  { key: "content", label: "محتوا و دانایی", icon: "book" },
  { key: "lawyers", label: "وکلا و احراز هویت", icon: "badge" },
  { key: "engage", label: "تعامل و خدمات", icon: "chat" },
  { key: "money", label: "مالی و کاربران", icon: "money" },
  { key: "system", label: "سیستم و نظارت", icon: "shield" },
];

/** منوی کامل مدیریت — ترتیب آیتم‌ها همان ترتیب نمایش در گروه است (داشبورد جدا در صدر سایدبار رندر می‌شود) */
export const ADMIN_MENU: AdminMenuItem[] = [
  { label: "داشبورد", href: "/admin", icon: "home", perm: "", group: "system" },
  { label: "مدیریت مقالات", href: "/admin/articles", icon: "book", perm: "articles", group: "content" },
  { label: "مقاله جدید", href: "/admin/articles/new", icon: "plus", perm: "articles", group: "content" },
  { label: "مدیریت واژه‌نامه حقوقی", href: "/admin/glossary", icon: "book", perm: "knowledge", group: "content" },
  { label: "مدیریت قوانین", href: "/admin/laws", icon: "scale", perm: "knowledge", group: "content" },
  { label: "مدیریت آرای قضایی", href: "/admin/judgments", icon: "gavel", perm: "knowledge", group: "content" },
  { label: "مدیریت فرم‌های حقوقی", href: "/admin/legal-forms", icon: "file", perm: "knowledge", group: "content" },
  { label: "مدیریت پلن‌های عضویت", href: "/admin/plans", icon: "briefcase", perm: "knowledge", group: "content" },
  { label: "محتوای صفحات سایت", href: "/admin/content", icon: "document", perm: "content", group: "content" },
  { label: "تقویم محتوای سئو", href: "/admin/content-calendar", icon: "calendar", perm: "content", group: "content" },
  { label: "مدیریت قراردادها", href: "/admin/contracts", icon: "file", perm: "contracts", group: "content" },
  { label: "مدیریت وکلا", href: "/admin/lawyers", icon: "badge", perm: "lawyers", group: "lawyers" },
  { label: "روی‌بوردینگ وکلا", href: "/admin/onboarding", icon: "badge", perm: "lawyers", group: "lawyers" },
  { label: "احراز هویت وکلا", href: "/admin/verifications", icon: "fingerprint", perm: "lawyers", group: "lawyers" },
  { label: "مدیریت پرسش و پاسخ", href: "/admin/qa", icon: "chat", perm: "qa", group: "engage" },
  { label: "درخواست‌های پرسش", href: "/admin/qa-submissions", icon: "chat", perm: "qa", group: "engage" },
  { label: "تالار گفتگو", href: "/admin/forum", icon: "chat", perm: "forum", group: "engage" },
  { label: "پاسخ‌های تالار گفتگو", href: "/admin/forum/replies", icon: "chat", perm: "forum", group: "engage" },
  { label: "مدیریت پرونده‌ها", href: "/admin/cases", icon: "folder", perm: "cases", group: "engage" },
  { label: "مدیریت مشاوره‌ها", href: "/admin/consultations", icon: "calendar", perm: "consultations", group: "engage" },
  { label: "مدیریت تیکت‌ها", href: "/admin/tickets", icon: "mail", perm: "tickets", group: "engage" },
  { label: "خدمات مدیریت‌شده", href: "/admin/managed-services", icon: "briefcase", perm: "services", group: "engage" },
  { label: "کاربران سایت", href: "/admin/users", icon: "user", perm: "users", group: "money" },
  { label: "پرداخت‌ها", href: "/admin/payments", icon: "money", perm: "finance", group: "money" },
  { label: "مالی و تسویه", href: "/admin/finance", icon: "calculator", perm: "finance", group: "money" },
  { label: "تامین‌کنندگان اعتبار", href: "/admin/providers", icon: "landmark", perm: "finance", group: "money" },
  { label: "تطبیق هوشمند", href: "/admin/matching", icon: "sparkles", perm: "matching", group: "system" },
  { label: "تنظیمات پلتفرم", href: "/admin/settings", icon: "shield", perm: "settings", group: "system" },
  { label: "مدیریت ادمین‌ها و دسترسی‌ها", href: "/admin/admins", icon: "id", perm: "admins", group: "system" },
  { label: "کتابخانه رسانه", href: "/admin/media", icon: "camera", perm: "media", group: "system" },
  { label: "صندوق ایمیل و خبرنامه", href: "/admin/outbox", icon: "send", perm: "outbox", group: "system" },
  { label: "مانیتور خطاها", href: "/admin/errors", icon: "alert", perm: "errors", group: "system" },
  { label: "گزارش بازدید سایت", href: "/admin/analytics", icon: "chart-bar", perm: "", group: "system" },
];
