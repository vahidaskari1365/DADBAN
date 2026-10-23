/**
 * نقش‌های کاربر و نگاشت آن‌ها به پنل مقصد — منبع مشترک کلاینت/سرور.
 *
 * چرا این فایل وجود دارد؟ باگ گزارش‌شده: هر جفت یوزر (حتی وکیل) وارد «پنل موکل» می‌شد،
 * چون پارامتر ?redirect= صفحهٔ لاگین (که بعد از خروج و بازدید مجدد از /dashboard/client
 * توسط proxy تنظیم می‌شود) بر مسیریابی نقش‌محور اولویت داشت و صفحات ناحیهٔ موکل
 * گارد نقش نداشتند. این ماژول قاعدهٔ واحد «نقش برنده است» را در یک جا نگه می‌دارد.
 */

export type UserRole = "lawyer" | "client" | "team" | "staff" | "supervisor";

/** نقش‌های سمت وکیل — مقصدشان همیشه پنل وکیل است (عضو تیم = «پنل همکاران» داخل همان پوسته) */
export const isLawyerSideRole = (role: string | null | undefined): boolean =>
  role === "lawyer" || role === "team";

/** نقش‌های سمت موکل — ناحیهٔ موکل/پرونده/اسناد */
export const isClientSideRole = (role: string | null | undefined): boolean =>
  role === "client";

/** برچسب فارسی نقش‌ها — منوی اکانت، پنل‌ها و خوش‌آید */
export const ROLE_FA: Record<string, string> = {
  lawyer: "وکیل",
  client: "موکل",
  team: "همکار وکیل",
  staff: "کارشناس عملیات",
  supervisor: "ناظر ارشد",
};

/** مقصد پیش‌فرض بعد از ورود، صرفاً بر اساس نقش (بدون توجه به ?redirect=) */
export const panelHomeForRole = (role: string | null | undefined): string =>
  isLawyerSideRole(role) ? "/dashboard/lawyer" : "/dashboard/client";

/**
 * آیا مقصدِ ?redirect= برای این نقش مجاز است؟
 * قاعده: نقشِ وکیل‌سمت هرگز با ریدایرکتِ ناحیهٔ موکل به پنل موکل فرستاده نمی‌شود
 * و بالعکس — حتی اگر URL لاگین چنین پارامتری داشت (سناریوی تلهٔ بعد از خروج).
 */
export const isRedirectSafeForRole = (
  role: string | null | undefined,
  target: string | null | undefined,
): boolean => {
  if (!target) return true;
  if (!target.startsWith("/") || target.startsWith("//")) return false;
  // بای‌پس پارس WHATWG: «/\evil.com» به دامنهٔ بیرونی می‌رود (بک‌اسلش = اسلش)؛
  // نویسه‌های کنترلی هم مسیر را می‌شکنند — هر دو رد می‌شوند
  if (target.includes("\\") || target.includes("%5C") || target.includes("%5c")) return false;
  for (let i = 0; i < target.length; i++) {
    const code = target.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return false;
  }
  const clientArea = ["/dashboard/client", "/dashboard/cases", "/dashboard/documents"];
  const lawyerArea = ["/dashboard/lawyer"];
  const hits = (prefixes: string[]) => prefixes.some((p) => target === p || target.startsWith(p + "/") || target.startsWith(p + "#") || target.startsWith(p + "?"));
  if (isLawyerSideRole(role) && hits(clientArea)) return false;
  if (isClientSideRole(role) && hits(lawyerArea)) return false;
  return true;
};
