import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "برای کسب‌وکارها — واحد حقوقی دیجیتال",
  description:
    "مدیریت قراردادها، پرونده‌ها، اسناد و مشاوره‌ی حقوقی کسب‌وکار شما در یک پلتفرم. پلن‌های اشتراکی Starter، Business و Enterprise.",
  alternates: { canonical: "/business" },
};

const FEATURES = [
  { title: "مدیریت قراردادها", desc: "تنظیم، بررسی و آرشیو همه‌ی قراردادها در یک‌جا.", icon: "document" as const },
  { title: "مدیریت پرونده‌ها", desc: "پیگیری پرونده‌های فعال با تایم‌لاین و مهلت‌ها.", icon: "folder" as const },
  { title: "وکیل اختصاصی", desc: "دسترسی به وکیل دائم برای کسب‌وکار شما.", icon: "user" as const },
  { title: "مدیریت اسناد", desc: "آپلود، دسته‌بندی و اشتراک امن اسناد.", icon: "lock" as const },
  { title: "مشاوره نامحدود", desc: "مشاوره حقوقی در ساعات کاری و اضطراری.", icon: "chat" as const },
  { title: "گزارش مالی", desc: "صورتحساب، پرداخت‌ها و گزارش‌های شفاف.", icon: "money" as const },
];

const PLANS = [
  { name: "Starter", price: "۲٫۹۰۰٫۰۰۰", period: "ماهانه", features: ["مشاوره ۶۰ دقیقه/ماه", "بررسی ۲ قرارداد/ماه", "بانک قراردادها", "پشتیبانی ایمیلی"], highlight: false },
  { name: "Business", price: "۷٫۹۰۰٫۰۰۰", period: "ماهانه", features: ["مشاوره ۲۴۰ دقیقه/ماه", "۱۰ قرارداد/ماه", "وکیل اختصاصی", "مدیریت پرونده و اسناد", "پشتیبانی اولویت‌دار"], highlight: true },
  { name: "Enterprise", price: "توافقی", period: "سالانه", features: ["مشاوره نامحدود", "تیم حقوقی اختصاصی", "API و یکپارچه‌سازی", "حساب‌مدیر اختصاصی"], highlight: false },
];

export default function BusinessPage() {
  return (
    <>
      <PageHero
        badge="برای کسب‌وکارها"
        title="واحد حقوقی کسب‌وکارتان را دیجیتال کنید"
        desc="از قرارداد و پرونده تا اسناد و مشاوره؛ دادبان زیرساخت حقوقی آماده‌ی کسب‌وکار شما را فراهم می‌کند."
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "برای کسب‌وکارها" }]}
      >
        <div className="flex flex-wrap gap-2">
          <Button href="/contact" icon="phone">تماس با فروش</Button>
          <Button href="/pricing" variant="outline" icon="money">مشاهده تعرفه</Button>
        </div>
      </PageHero>

      <Container className="py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 50}>
              <Card className="h-full">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name={f.icon} className="h-5 w-5" /></span>
                <h3 className="mt-3 text-sm font-bold text-foreground">{f.title}</h3>
                <p className="mt-1 text-xs leading-6 text-muted">{f.desc}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>

      {/* Plans */}
      <Container className="py-10">
        <div className="grid gap-5 lg:grid-cols-3">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 70}>
              <div className={`relative flex h-full flex-col rounded-3xl border p-6 card-shadow ${p.highlight ? "border-primary bg-primary-soft/40 lg:-translate-y-3" : "border-border bg-surface"}`}>
                {p.highlight && <span className="absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">پیشنهاد ویژه</span>}
                <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
                <div className="mt-3"><span className="text-2xl font-extrabold text-foreground">{p.price}</span><span className="mr-1 text-xs text-muted"> تومان / {p.period}</span></div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground-soft"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}</li>
                  ))}
                </ul>
                <Button href="/contact" variant={p.highlight ? "primary" : "outline"} className="mt-6 w-full">انتخاب پلن</Button>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>

      <Container className="py-12">
        <Reveal>
          <Card hover={false} className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-right">
            <div>
              <h2 className="text-xl font-bold text-foreground">آماده‌اید تیم حقوقی اختصاصی داشته باشید؟</h2>
              <p className="mt-1 text-sm text-muted">کارشناسان فروش دادبان بهترین پلن را برای کسب‌وکار شما پیشنهاد می‌دهند.</p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-center gap-2">
              <Badge tone="success" icon="shield">قرارداد سازمانی</Badge>
              <Badge tone="primary" icon="lock">امنیت داده</Badge>
            </div>
          </Card>
        </Reveal>
      </Container>
    </>
  );
}
