/**
 * تایپ‌ها و دسته‌بندی‌های مرکز قوانین دادورزان.
 *
 * طراحی محتوایی بر اساس گزارش مصوب سئو (AEO/GEO/AIO/SXO):
 *  - introLead: بلوک citation-ready (پاسخ مستقیم قابل نقل توسط AI)
 *  - keyArticles: جدول مواد کلیدی (AI موتورها به جدول امتیاز بالایی می‌دهند)
 *  - faqs: سوال‌محور + پاسخ خودکفا (FAQPage schema)
 *  - relatedRoutes: لینک داخلی خدماتی برای SXO (کاهش bounce، افزایش کانورژن)
 */

import type { IconKey } from "@/lib/data";

export interface LawKeyArticle {
  /** شماره و عنوان ماده — مثل «ماده ۱۰۸۲» */
  no: string;
  title: string;
  desc: string;
}

export interface LawFaq {
  q: string;
  a: string;
}

export interface LawRoute {
  label: string;
  href: string;
  icon?: IconKey;
}

export interface LawCategory {
  slug: string;
  label: string;
  icon: IconKey;
  desc: string;
}

export interface Law {
  slug: string;
  name: string;
  year: string;
  authority: string;
  status: string;
  subjects: string[];
  /** خلاصه کوتاه کارت (حدود ۲۰ کلمه) — meta description هم از این ساخته می‌شود */
  summary: string;
  /** slug دسته از LAW_CATEGORIES */
  category: string;
  /** بلوک citation-ready — پاسخ مستقیم ۷۰ تا ۱۱۰ کلمه‌ای با عدد و سال */
  introLead: string;
  /** پاسخ یک‌جمله‌ای مستقیم به «X چیست؟» */
  purpose: string;
  /** ۲ تا ۳ پاراگراف توضیحی (ساختار، تاریخچه، کاربرد عملی) */
  intro: string[];
  /** جدول مواد کلیدی */
  keyArticles: LawKeyArticle[];
  /** نکات کلیدی عدددار */
  highlights: string[];
  /** ۴ پرسش متداول سوال‌محور با پاسخ خودکفا */
  faqs: LawFaq[];
  /** مسیرهای خدماتی مرتبط (SXO) */
  relatedRoutes: LawRoute[];
  /** سیگنال تازگی محتوا — مثل «مهر ۱۴۰۵» */
  updated: string;
}

/** هفت دسته مرکز قوانین — هر قانون حتماً یکی از این‌ها را دارد */
export const LAW_CATEGORIES: LawCategory[] = [
  {
    slug: "family",
    label: "خانواده و احوال شخصیه",
    icon: "family",
    desc: "قوانین ازدواج، طلاق، مهریه، نفقه، حضانت و ارث — پرتقاضاترین حوزه دعاوی خانواده در ایران.",
  },
  {
    slug: "criminal",
    label: "کیفری و مجازات",
    icon: "gavel",
    desc: "جرایم و مجازات‌ها، قانون مجازات اسلامی، چک برگشتی و اسناد مالی جرم‌انگاری‌شده.",
  },
  {
    slug: "procedure",
    label: "دادرسی و وکالت",
    icon: "scale",
    desc: "نحوه طرح دعوا، آیین رسیدگی در دادسرا و دادگاه، مقررات وکالت و مراجع اداری.",
  },
  {
    slug: "commerce",
    label: "مالی و تجاری",
    icon: "briefcase",
    desc: "چک و سفته، شرکت‌های تجاری، مالیات‌ها، تجارت الکترونیکی و حمایت از مصرف‌کننده.",
  },
  {
    slug: "labor",
    label: "کار و تأمین اجتماعی",
    icon: "id",
    desc: "قرارداد کار، اخراج، دستمزد، مرخصی، حق بیمه و بازنشستگی.",
  },
  {
    slug: "property",
    label: "املاک و ثبت",
    icon: "home",
    desc: "سند رسمی، اجاره، مستأجر و موجر، انتقال مالکیت و قوانین جدید املاک.",
  },
  {
    slug: "admin",
    label: "اداری و استخدامی",
    icon: "landmark",
    desc: "کارمندان دولت، مدیریت خدمات کشوری و رسیدگی به تخلفات اداری.",
  },
];
