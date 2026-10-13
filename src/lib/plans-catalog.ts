/**
 * کاتالوگ پلن‌های عضویت وکلا — منبع واحد برای:
 *  - seed اولیهٔ جدول membership_plans (پنل ادمین)
 *  - fallback صفحهٔ /plans وقتی دیتابیس در دسترس نیست
 * پس از اولین seed، منبع واقعی همان جدول است و ویرایش ادمین همیشه برنده است.
 */
export type PlanIcon = "user" | "bolt" | "badge";

export interface PlanCatalogItem {
  key: string;
  name: string;
  icon: PlanIcon;
  /** ۰ = رایگان (تومان) */
  price: number;
  desc: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
}

export const PLANS_CATALOG: PlanCatalogItem[] = [
  {
    key: "basic",
    name: "پایه",
    icon: "user",
    price: 0,
    desc: "شروع حضور حرفه‌ای در دادورزان",
    features: [
      "پروفایل عمومی کامل با عکس و تخصص‌ها",
      "دریافت درخواست مشاوره و پرونده",
      "نمایش در فهرست وکلای استان",
      "ساعت کاری و زمان‌های آزاد",
    ],
    cta: "شروع رایگان",
    href: "/join-as-lawyer",
  },
  {
    key: "pro",
    name: "حرفه‌ای",
    icon: "bolt",
    price: 490000,
    desc: "برای وکلایی که می‌خواهند بیشتر دیده شوند",
    features: [
      "اولویت نمایش در نتایج جستجو",
      "نشان «حرفه‌ای» روی پروفایل",
      "آمار کامل بازدید و عملکرد پروفایل",
      "معرفی در خبرنامه و شبکه‌های اجتماعی",
      "پشتیبانی اولویت‌دار",
    ],
    cta: "فعال‌سازی پلن حرفه‌ای",
    href: "/contact",
    highlight: true,
  },
  {
    key: "gold",
    name: "طلایی",
    icon: "badge",
    price: 990000,
    desc: "حداکثر دیده‌شدن برای پروفایل شما",
    features: [
      "صدر فهرست وکلا و نتایج جستجو",
      "نشان طلایی تأیید ویژه",
      "کارت معرفی اختصاصی در صفحهٔ اصلی",
      "کمپین معرفی ماهانه در فضای مجازی",
      "مدیر پروفایل اختصاصی",
    ],
    cta: "فعال‌سازی پلن طلایی",
    href: "/contact",
  },
];
