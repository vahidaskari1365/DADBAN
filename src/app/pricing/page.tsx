import type { Metadata } from "next";
import { Container, Button, Badge, Card } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { faPrice, faNum } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("تعرفه خدمات و فروشگاه خدمات حقوقی"),
    description: t("فروشگاه خدمات حقوقی دادورزان: مشاوره، تنظیم قرارداد، بررسی قرارداد، تنظیم دادخواست و شکواییه، ثبت شرکت و خدمات ثبتی. پلن‌های اشتراکی کسب‌وکار."),
    alternates: { canonical: "/pricing" },
  };
}

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

export default async function PricingPage() {
  const t = await getT();
  const tt = templateT(t);

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-pricing.png"
        title={t("فروشگاه و تعرفه خدمات حقوقی")}
        desc={t("خدمات حقوقی را به‌صورت شفاف و با قیمت مشخص سفارش دهید؛ یا برای کسب‌وکار خود اشتراک حقوقی بگیرید.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("تعرفه خدمات") }]}
      />

      {/* Services marketplace */}
      <Container className="py-10">
        <h2 className="text-xl font-bold text-foreground">{t("خدمات واحد (Marketplace)")}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <Card key={s.title} className="flex flex-col">
              <div className="flex items-start justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                {s.popular && <Badge tone="accent" icon="star">{t("پرفروش")}</Badge>}
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">{t(s.title)}</h3>
              <p className="mt-1 flex-1 text-xs text-muted">{t(s.desc)}</p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <p className="text-sm font-bold text-foreground">{faPrice(s.price)}</p>
                <Button href="/consultation" size="sm" variant="soft" icon="plus">{t("سفارش")}</Button>
              </div>
            </Card>
          ))}
        </div>
      </Container>

      {/* Subscription plans */}
      <Container className="py-10">
        <div className="text-center">
          <Badge tone="primary" icon="briefcase">{t("اشتراک حقوقی کسب‌وکار")}</Badge>
          <h2 className="mt-3 text-2xl font-bold text-foreground">{t("پلن‌های حقوقی سازمانی")}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">{t("وکیل دائم، مدیریت قراردادها و اسناد و مشاوره نامحدود برای کسب‌وکار شما.")}</p>
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
                  {t("پیشنهاد ویژه")}
                </span>
              )}
              <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
              <p className="mt-1 text-xs text-muted">{t(p.desc)}</p>
              <div className="mt-4">
                <span className="text-2xl font-extrabold text-foreground">{p.price}</span>
                <span className="mr-1 text-xs text-muted">{tt("تومان / {period}", { period: p.period })}</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground-soft">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {t(f)}
                  </li>
                ))}
              </ul>
              <Button
                href="/contact"
                variant={p.highlight ? "primary" : "outline"}
                className="mt-6 w-full"
              >
                {t(p.cta)}
              </Button>
            </div>
          ))}
        </div>
      </Container>

      {/* Registry services */}
      <Container className="py-10">
        <h2 className="text-xl font-bold text-foreground">{t("خدمات ثبتی")}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REGISTRY.map((r) => (
            <a key={r.title} href="/consultation" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                <Icon name={r.icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">{t(r.title)}</p>
                <p className="text-xs text-muted">{t(r.desc)}</p>
              </div>
              <Icon name="chevron" className="mr-auto h-4 w-4 rotate-180 text-muted" />
            </a>
          ))}
        </div>
      </Container>

      <Container className="py-12">
        <div className="rounded-3xl border border-border bg-surface p-8 text-center card-shadow">
          <h2 className="text-xl font-bold text-foreground">{t("سؤال درباره تعرفه‌ها دارید؟")}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">{t("کارشناسان فروش دادورزان برای مشاوره انتخاب پلن مناسب در خدمت شما هستند.")}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button href="/contact" icon="phone">{t("تماس با فروش")}</Button>
            <Button href="/consultation" variant="outline" icon="chat">{t("مشاوره آنلاین")}</Button>
          </div>
        </div>
      </Container>
    </>
  );
}
