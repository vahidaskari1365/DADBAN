import type { Metadata } from "next";
import { Container, Button, Badge, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faPrice, faNum } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import Link from "next/link";

export const metadata: Metadata = {
  title: "تعرفه خدمات و فروشگاه خدمات حقوقی",
  description:
    "فروشگاه خدمات حقوقی دادبان: مشاوره، تنظیم قرارداد، بررسی قرارداد، تنظیم دادخواست و شکواییه، ثبت شرکت و خدمات ثبتی. پلن‌های اشتراکی کسب‌وکار.",
  alternates: { canonical: "/pricing" },
};

const SERVICES: { title: string; desc: string; price: number; icon: IconKey; popular?: boolean }[] = [
  { title: "مشاوره ۳۰ دقیقه‌ای", desc: "تماس تلفنی با وکیل متخصص", price: 350000, icon: "phone", popular: true },
  { title: "تنظیم قرارداد", desc: "توسط وکیل متخصص", price: 850000, icon: "document" },
  { title: "بررسی قرارداد", desc: "تحلیل حقوقی و ریسک‌ها", price: 600000, icon: "file" },
  { title: "تنظیم دادخواست", desc: "تهیه تخصصی سند دادگاهی", price: 750000, icon: "gavel" },
  { title: "تنظیم شکواییه", desc: "تهیه شکایت کیفری", price: 680000, icon: "gavel" },
  { title: "اظهارنامه", desc: "تنظیم تخصصی اظهارنامه", price: 500000, icon: "mail" },
  { title: "بررسی پرونده", desc: "ارزیابی اولیه و راهنمایی", price: 400000, icon: "folder" },
  { title: "ثبت شرکت", desc: "خدمات ثبتی کامل", price: 3500000, icon: "stamp" },
];

const PLANS: { name: string; price: string; period: string; desc: string; features: string[]; cta: string; highlight?: boolean }[] = [
  {
    name: "Basic", price: "۲٫۹۰۰٫۰۰۰", period: "ماهانه", desc: "مناسب کسب‌وکارهای کوچک و فریلنسرها",
    features: ["مشاوره ماهانه ۶۰ دقیقه‌ای", "بررسی ۲ قرارداد در ماه", "دسترسی به بانک قراردادها", "پشتیبانی ایمیلی"],
    cta: "شروع اشتراک",
  },
  {
    name: "Business", price: "۷٫۹۰۰٫۰۰۰", period: "ماهانه", desc: "برای شرکت‌های متوسط و استارتاپ‌ها",
    features: ["مشاوره ماهانه ۲۴۰ دقیقه‌ای", "تنظیم و بررسی ۱۰ قرارداد", "وکیل اختصاصی", "مدیریت پرونده‌ها و اسناد", "پشتیبانی اولویت‌دار"],
    cta: "پرطرفدارترین", highlight: true,
  },
  {
    name: "Enterprise", price: "توافقی", period: "سالانه", desc: "برای سازمان‌های بزرگ",
    features: ["مشاوره نامحدود", "تیم حقوقی اختصاصی", "API و یکپارچه‌سازی", "مدیریت قراردادهای سازمانی", "حساب‌مدیر اختصاصی"],
    cta: "تماس با فروش",
  },
];

const REGISTRY: { title: string; desc: string; icon: IconKey }[] = [
  { title: "ثبت شرکت", desc: "سهامی خاص، با مسئولیت محدود و…", icon: "building" },
  { title: "تغییرات شرکت", desc: "افزایش سرمایه، تغییر مدیران", icon: "stamp" },
  { title: "ثبت برند", desc: "ثبت علامت تجاری", icon: "badge" },
  { title: "ثبت اختراع", desc: "حفاظت از مالکیت فکری", icon: "sparkles" },
  { title: "صورتجلسات", desc: "تنظیم و ثبت صورتجلسات", icon: "document" },
  { title: "امور ثبتی", desc: "انحلال و تغییرات", icon: "folder" },
];

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-surface-2/60 to-background py-8">
        <Container>
          <nav className="flex items-center gap-1.5 text-xs text-muted">
            <Link href="/" className="hover:text-primary">خانه</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <span className="text-foreground-soft">تعرفه خدمات</span>
          </nav>
          <h1 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">فروشگاه و تعرفه خدمات حقوقی</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            خدمات حقوقی را به‌صورت شفاف و با قیمت مشخص سفارش دهید؛ یا برای کسب‌وکار خود اشتراک حقوقی بگیرید.
          </p>
        </Container>
      </section>

      {/* Services marketplace */}
      <Container className="py-10">
        <h2 className="text-xl font-bold text-foreground">خدمات واحد (Marketplace)</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <Card key={s.title} className="flex flex-col">
              <div className="flex items-start justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                {s.popular && <Badge tone="accent" icon="star">پرفروش</Badge>}
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">{s.title}</h3>
              <p className="mt-1 flex-1 text-xs text-muted">{s.desc}</p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <p className="text-sm font-bold text-foreground">{faPrice(s.price)}</p>
                <Button href="/consultation" size="sm" variant="soft" icon="plus">سفارش</Button>
              </div>
            </Card>
          ))}
        </div>
      </Container>

      {/* Subscription plans */}
      <Container className="py-10">
        <div className="text-center">
          <Badge tone="primary" icon="briefcase">اشتراک حقوقی کسب‌وکار</Badge>
          <h2 className="mt-3 text-2xl font-bold text-foreground">پلن‌های حقوقی سازمانی</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">وکیل دائم، مدیریت قراردادها و اسناد و مشاوره نامحدود برای کسب‌وکار شما.</p>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-3xl border p-6 card-shadow ${
                p.highlight ? "border-primary bg-primary-soft/40 lg:-translate-y-3 lg:shadow-[var(--shadow-lift)]" : "border-border bg-surface"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                  پیشنهاد ویژه
                </span>
              )}
              <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
              <p className="mt-1 text-xs text-muted">{p.desc}</p>
              <div className="mt-4">
                <span className="text-2xl font-extrabold text-foreground">{p.price}</span>
                <span className="mr-1 text-xs text-muted">تومان / {p.period}</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground-soft">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                href="/contact"
                variant={p.highlight ? "primary" : "outline"}
                className="mt-6 w-full"
              >
                {p.cta}
              </Button>
            </div>
          ))}
        </div>
      </Container>

      {/* Registry services */}
      <Container className="py-10">
        <h2 className="text-xl font-bold text-foreground">خدمات ثبتی</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REGISTRY.map((r) => (
            <a key={r.title} href="/consultation" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon name={r.icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">{r.title}</p>
                <p className="text-xs text-muted">{r.desc}</p>
              </div>
              <Icon name="chevron" className="mr-auto h-4 w-4 rotate-180 text-muted" />
            </a>
          ))}
        </div>
      </Container>

      <Container className="py-12">
        <div className="rounded-3xl border border-border bg-surface p-8 text-center card-shadow">
          <h2 className="text-xl font-bold text-foreground">سؤال درباره تعرفه‌ها دارید؟</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">کارشناسان فروش دادبان برای مشاوره انتخاب پلن مناسب در خدمت شما هستند.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button href="/contact" icon="phone">تماس با فروش</Button>
            <Button href="/consultation" variant="outline" icon="chat">مشاوره آنلاین</Button>
          </div>
        </div>
      </Container>
    </>
  );
}
