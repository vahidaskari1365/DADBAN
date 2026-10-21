import Link from "next/link";
import { Container, Logo } from "./ui";
import { SITE_TAGLINE } from "@/lib/brand";
import { Icon } from "./icons";
import NewsletterForm from "./newsletter-form";
import type { IconKey } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { SPECIALTY_LANDINGS, CITY_LANDINGS } from "@/lib/seo-landings";

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "خدمات حقوقی",
    links: [
      { label: "همه خدمات", href: "/services" },
      { label: "مشاوره آنلاین", href: "/consultation" },
      { label: "رزرو مشاوره", href: "/consultation" },
      { label: "قراردادساز", href: "/contracts/builder" },
      { label: "بررسی قرارداد", href: "/contracts/review" },
      { label: "فرم‌های حقوقی", href: "/legal-forms" },
      { label: "محاسبه‌گرهای حقوقی", href: "/calculators" },
      { label: "پرداخت اقساطی حق‌الوکاله", href: "/fee-payment" },
    ],
  },
  {
    title: "وکیل‌یابی",
    links: [
      { label: "جستجوی وکیل", href: "/lawyers" },
      { label: "تخصص‌های وکالت", href: "/lawyers/specialty" },
      { label: "وکیل طلاق و خانواده", href: "/lawyers/specialty/talaq-khanavadeh" },
      { label: "وکیل کیفری", href: "/lawyers/specialty/keifari" },
      { label: "وکیل ملکی", href: "/lawyers/specialty/melki" },
      { label: "وکیل در تهران", href: "/lawyers/city/tehran" },
      { label: "وکیل در مشهد", href: "/lawyers/city/mashhad" },
      { label: "تعرفه وکالت ۱۴۰۵", href: "/fee-guide" },
    ],
  },
  {
    title: "هوش مصنوعی",
    links: [
      { label: "دستیار حقوقی هوشمند", href: "/ai-assistant" },
      { label: "تحلیل قرارداد", href: "/contracts/review" },
      { label: "پرسش و پاسخ حقوقی", href: "/qa" },
    ],
  },
  {
    title: "دانش حقوقی",
    links: [
      { label: "مقالات", href: "/knowledge" },
      { label: "مرکز قوانین", href: "/laws" },
      { label: "آرای قضایی", href: "/judgments" },
      { label: "واژه‌نامه حقوقی", href: "/glossary" },
      { label: "پرسش و پاسخ", href: "/qa" },
    ],
  },
  {
    title: "پلتفرم",
    links: [
      { label: "درباره دادورزان", href: "/about" },
      { label: "برای کسب‌وکارها", href: "/business" },
      { label: "تعرفه پلن‌های عضویت", href: "/pricing" },
      { label: "پلن‌های عضویت وکلا", href: "/plans" },
      { label: "تالار گفتگو", href: "/forum" },
      { label: "پنل موکل", href: "/dashboard/client" },
      { label: "پنل وکیل", href: "/dashboard/lawyer" },
      { label: "عضویت وکلای جدید", href: "/join-as-lawyer" },
      { label: "پنل مدیریت", href: "/admin" },
      { label: "تماس و پشتیبانی", href: "/support" },
    ],
  },
  {
    title: "قوانین و مقررات",
    links: [
      { label: "شرایط استفاده", href: "/legal/terms" },
      { label: "حریم خصوصی", href: "/legal/privacy" },
      { label: "بازگشت وجه", href: "/legal/refund-policy" },
      { label: "امنیت", href: "/legal/security" },
      { label: "شفافیت", href: "/legal/transparency" },
    ],
  },
];

const FEATURES: { icon: IconKey; label: string }[] = [
  { icon: "badge", label: "وکلای تأییدشده" },
  { icon: "lock", label: "محرمانگی اطلاعات" },
  { icon: "shield", label: "بازگشت وجه طبق سیاست شفاف" },
  { icon: "balance", label: "حل اختلاف شفاف" },
];

export async function Footer() {
  const t = await getT();
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(5,1fr)]">
          <div>
            <Link
              href="/"
              aria-label={t("دادورزان — صفحه اصلی")}
              className="inline-block transition-opacity hover:opacity-85"
            >
              <Logo tagline={t(SITE_TAGLINE)} />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-7 text-muted">
              {t(
                "دادورزان، پلتفرم هوشمند خدمات حقوقی؛ از پیدا کردن وکیل متخصص و رزرو مشاوره تا مدیریت پرونده، تنظیم اسناد و دستیار حقوقی هوش مصنوعی — همه در یک‌جا.",
              )}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {FEATURES.map((f) => (
                <span key={f.label} className="inline-flex items-center gap-2 text-xs text-foreground-soft">
                  <Icon name={f.icon} className="h-4 w-4 text-accent-text" />
                  {t(f.label)}
                </span>
              ))}
            </div>

            {/* خبرنامه — فرم کلاینتِ کوچک؛ در سرور فقط سربرگ و توضیح ترجمه می‌شود */}
            <div className="mt-6 max-w-xs border-t border-border pt-5">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <Icon name="mail" className="h-4 w-4 text-accent-text" aria-hidden />
                {t("خبرنامه")}
              </h3>
              <p className="mt-2 text-xs leading-6 text-muted">
                {t("هر دو هفته یک‌بار، تازه‌ترین قوانین و راهنماهای حقوقی در ایمیل شما.")}
              </p>
              <div className="mt-3">
                <NewsletterForm />
              </div>
            </div>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold text-foreground">{t(col.title)}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition-colors hover:text-primary"
                    >
                      {t(l.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {/* نماد اعتماد الکترونیکی (اینماد) — در فضای خالی زیر ستون‌های فوتر، سمت چپ (محل انتخاب کاربر). لینک رسمی trustseal با id و Code دست‌نخورده است */}
          <div className="justify-self-start lg:col-span-2 lg:col-start-5 lg:justify-self-end">
            <a
              href="https://trustseal.enamad.ir/?id=8196650&Code=AqY8rJ3zls3XOs6nEqKQYBxLwScNxIUe"
              target="_blank"
              rel="noopener"
              referrerPolicy="origin"
              aria-label="نماد اعتماد الکترونیکی اینماد دادورزان"
              className="inline-flex overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-border transition-transform hover:scale-105"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/enamad-seal.jpg"
                alt="نماد اعتماد الکترونیکی اینماد"
                referrerPolicy="origin"
                width={110}
                height={110}
                decoding="async"
                className="h-[110px] w-[110px] object-contain"
              />
            </a>
          </div>
        </div>

        {/* نوار سئو — لینک‌سازی داخلی سراسری به صفحات فرود (تخصص‌ها × شهرها) */}
        <div className="mt-10 space-y-5 border-t border-border pt-8">
          <nav aria-label="تخصص‌های وکالت">
            <h3 className="text-xs font-bold text-foreground">تخصص‌های وکالت در دادورزان</h3>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {SPECIALTY_LANDINGS.map((s) => (
                <Link
                  key={s.slug}
                  href={`/lawyers/specialty/${s.slug}`}
                  className="text-xs text-muted transition-colors hover:text-primary"
                >
                  {s.h1}
                </Link>
              ))}
            </div>
          </nav>
          <nav aria-label="وکیل در شهرهای ایران">
            <h3 className="text-xs font-bold text-foreground">وکیل در شهرهای ایران</h3>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {CITY_LANDINGS.map((c) => (
                <Link
                  key={c.slug}
                  href={`/lawyers/city/${c.slug}`}
                  className="text-xs text-muted transition-colors hover:text-primary"
                >
                  وکیل در {c.city}
                </Link>
              ))}
            </div>
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted">
            © {new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(new Date().getFullYear())} {t("دادورزان — تمامی حقوق محفوظ است.")}
          </p>
          <p className="text-xs text-muted">
            {t("محتوای این پلتفرم صرفاً جنبه راهنمایی دارد و جایگزین مشاوره تخصصی وکیل نیست.")}
          </p>
        </div>
      </Container>
    </footer>
  );
}
