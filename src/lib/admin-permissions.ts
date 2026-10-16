/**
 * کاتالوگ دسترسی‌های پنل ادمین دادورزان.
 *
 * - هر بخش از پنل به یک کلید دسترسی وصل است (PERM map در APIها و صفحات).
 * - مالک (ورود با ADMIN_EMAIL از env) همیشه super_admin با «*» است و از همه‌چیز عبور می‌کند.
 * - ادمین‌های اضافه از /admin/admins ساخته می‌شوند؛ نقش پیش‌سازنده دارد و دسترسی‌ها
 *   به‌صورت ریز (checkbox) قابل تنظیم‌اند. نقش فقط «برچسب + پیش‌فرض» است؛ منبع حقیقت
 *   همان CSV permissions در جدول admin_users است.
 */

export interface AdminPermissionDef {
  key: string;
  label: string;
  group: "محتوا" | "عملیات" | "مدیریت";
  /** توضیح کوتاه برای tooltip صفحهٔ مدیریت ادمین‌ها */
  hint?: string;
}

export const ADMIN_PERMISSIONS: AdminPermissionDef[] = [
  /* ---------------- محتوا ---------------- */
  { key: "articles", label: "مقالات مجله", group: "محتوا", hint: "ساخت، ویرایش و حذف مقالات /knowledge" },
  { key: "content", label: "محتوای صفحات سایت", group: "محتوا", hint: "بلاک‌های CMS صفحات + بازبینی حقوقی" },
  { key: "knowledge", label: "دانشنامه", group: "محتوا", hint: "واژه‌نامه، قوانین، آرای قضایی، فرم‌های حقوقی، پلن‌های عضویت" },
  { key: "forum", label: "تالار گفتگو", group: "محتوا", hint: "موضوع‌ها و پاسخ‌های تالار" },
  { key: "qa", label: "پرسش و پاسخ", group: "محتوا", hint: "پرسش‌های منتشرشده و درخواست‌های پاسخ" },
  { key: "contracts", label: "قراردادها", group: "محتوا" },
  { key: "media", label: "رسانه‌ها", group: "محتوا", hint: "آپلود و حذف تصاویر" },

  /* ---------------- عملیات ---------------- */
  { key: "lawyers", label: "وکلا و احراز هویت", group: "عملیات", hint: "مدیریت پروفایل وکلا، احراز هویت و روی‌بوردینگ" },
  { key: "cases", label: "پرونده‌ها", group: "عملیات" },
  { key: "consultations", label: "مشاوره‌ها", group: "عملیات" },
  { key: "services", label: "خدمات مدیریت‌شده", group: "عملیات", hint: "کاتالوگ خدمات و دسته‌بندی‌ها" },
  { key: "tickets", label: "تیکت‌های پشتیبانی", group: "عملیات" },
  { key: "users", label: "کاربران سایت", group: "عملیات", hint: "مشاهده، ویرایش و حذف کاربران ثبت‌نام‌شده" },

  /* ---------------- مدیریت ---------------- */
  { key: "finance", label: "مالی", group: "مدیریت", hint: "پرداخت‌ها، تسویه‌ها، درخواست‌های اعتبار" },
  { key: "settings", label: "تنظیمات پلتفرم", group: "مدیریت" },
  { key: "matching", label: "تطبیق هوشمند", group: "مدیریت" },
  { key: "outbox", label: "صندوق ایمیل و خبرنامه", group: "مدیریت" },
  { key: "errors", label: "مانیتور خطاها", group: "مدیریت" },
  { key: "admins", label: "مدیریت ادمین‌ها", group: "مدیریت", hint: "ساخت ادمین جدید و تعیین دسترسی — فقط مالک/مدیر کل" },
] as const;

export type AdminPermissionKey = (typeof ADMIN_PERMISSIONS)[number]["key"];

const VALID_KEYS = new Set<string>(ADMIN_PERMISSIONS.map((p) => p.key));

export function isValidPermission(key: string): boolean {
  return VALID_KEYS.has(key);
}

/** لیست کلیدهای معتبر — برای اعتبارسنجی سمت سرور */
export function allPermissionKeys(): string[] {
  return [...VALID_KEYS];
}

/* ----------------------------- نقش‌های پیش‌سازنده ----------------------------- */

export interface AdminRoleDef {
  label: string;
  /** پیش‌فرض دسترسی‌ها — «*» فقط برای super_admin */
  permissions: string[];
  /** فقط مدیر کل می‌تواند کسی را super_admin کند */
  superOnly?: boolean;
}

export const ADMIN_ROLES: Record<string, AdminRoleDef> = {
  super_admin: { label: "مدیر کل — دسترسی کامل", permissions: ["*"], superOnly: true },
  content_manager: {
    label: "سردبیر محتوا",
    permissions: ["articles", "content", "knowledge", "forum", "qa", "contracts", "media"],
  },
  support: {
    label: "پشتیبانی",
    permissions: ["tickets", "qa", "consultations", "cases", "users"],
  },
  operations: {
    label: "عملیات وکلا",
    permissions: ["lawyers", "cases", "consultations", "services", "users"],
  },
  finance: {
    label: "مالی",
    permissions: ["finance"],
  },
  moderator: {
    label: "مدیر تالار و پرسش‌وپاسخ",
    permissions: ["forum", "qa"],
  },
  custom: {
    label: "دسترسی سفارشی",
    permissions: [],
  },
};

export function permissionsForRole(role: string): string[] {
  return ADMIN_ROLES[role]?.permissions ?? [];
}

export function roleLabel(role: string): string {
  return ADMIN_ROLES[role]?.label ?? role;
}

export function isValidRole(role: string): boolean {
  return role in ADMIN_ROLES;
}
