import Link from "next/link";
import { Container, Logo } from "./ui";
import { Icon } from "./icons";
import type { IconKey } from "@/lib/data";

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
    ],
  },
  {
    title: "هوش مصنوعی",
    links: [
      { label: "مرکز هوش مصنوعی", href: "/ai" },
      { label: "جعبه‌ابزار منبع‌باز", href: "/ai/resources" },
      { label: "دستیار حقوقی", href: "/ai-assistant" },
      { label: "تحلیل سند با عکس", href: "/ai#tools" },
      { label: "جستجوی وب حقوقی", href: "/ai#tools" },
      { label: "استودیوی صدا", href: "/ai#tools" },
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
      { label: "درباره دادبان", href: "/about" },
      { label: "برای کسب‌وکارها", href: "/business" },
      { label: "پنل موکل", href: "/dashboard/client" },
      { label: "پنل وکیل", href: "/dashboard/lawyer" },
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

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(5,1fr)]">
          <div>
            <Link
              href="/"
              aria-label="دادبان — صفحه اصلی"
              className="inline-block transition-opacity hover:opacity-85"
            >
              <Logo />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-7 text-muted">
              دادبان، پلتفرم هوشمند خدمات حقوقی؛ از پیدا کردن وکیل متخصص و رزرو مشاوره تا مدیریت
              پرونده، تنظیم اسناد و دستیار حقوقی هوش مصنوعی — همه در یک‌جا.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {FEATURES.map((f) => (
                <span key={f.label} className="inline-flex items-center gap-2 text-xs text-foreground-soft">
                  <Icon name={f.icon} className="h-4 w-4 text-accent" />
                  {f.label}
                </span>
              ))}
            </div>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold text-foreground">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition-colors hover:text-primary"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted">
            © {new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(new Date().getFullYear())} دادبان — تمامی حقوق محفوظ است.
          </p>
          <p className="text-xs text-muted">
            محتوای این پلتفرم صرفاً جنبه راهنمایی دارد و جایگزین مشاوره تخصصی وکیل نیست.
          </p>
        </div>
      </Container>
    </footer>
  );
}
