import type { Metadata } from "next";
import Link from "next/link";
import { Container, SectionHeading, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AiTools } from "@/components/ai/ai-tools";
import { SITE_NAME } from "@/lib/brand";
import type { IconKey } from "@/lib/data";

export const metadata: Metadata = {
  title: "مرکز هوش مصنوعی حقوقی",
  description:
    "ابزارهای هوش مصنوعی دادبان: دستیار حقوقی هوشمند، تحلیل اسناد و قرارداد با عکس، جستجوی وب حقوقی و استودیوی صدا (متن به گفتار و گفتار به متن).",
  alternates: { canonical: "/ai" },
  openGraph: {
    title: `مرکز هوش مصنوعی حقوقی | ${SITE_NAME}`,
    description: "تحلیل سند با عکس، جستجوی وب حقوقی، دستیار هوشمند و ابزارهای صوتی — همه در دادبان.",
  },
};

const CAPABILITIES: { title: string; desc: string; icon: IconKey; href?: string }[] = [
  {
    title: "دستیار حقوقی هوشمند",
    desc: "پاسخ فوری به سؤالات حقوقی با استناد دقیق به ماده و نام قانون، به‌همراه راهنمای گام‌به‌گام.",
    icon: "sparkles",
    href: "/ai-assistant",
  },
  {
    title: "تحلیل سند با عکس",
    desc: "عکس دادخواست، ابلاغیه، چک یا قرارداد را بفرستید؛ نوع سند، طرفین، ریسک‌ها و مواد قانونی مرتبط استخراج می‌شود.",
    icon: "document",
  },
  {
    title: "جستجوی وب حقوقی",
    desc: "جستجوی زنده در منابع معتبر حقوقی وب همراه با ذکر منبع برای هر نتیجه.",
    icon: "search",
  },
  {
    title: "استودیوی صدا",
    desc: "متن را به گفتار طبیعی تبدیل کنید یا با ضبط صدا، سؤال حقوقی خود را به متن بسپارید.",
    icon: "chat",
  },
];

export default function AiHubPage() {
  return (
    <div className="page-wash pb-16">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden border-b border-border bg-surface-2">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-soft blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-accent-soft blur-3xl" />
        <Container className="relative">
          <div className="grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-[1.2fr_1fr] lg:py-20">
            <div>
              <Badge tone="accent" icon="sparkles">هوش مصنوعی حقوقی نسل جدید</Badge>
              <h1 className="mt-4 text-3xl font-black leading-[1.25] text-foreground sm:text-4xl lg:text-5xl">
                مرکز هوش مصنوعی <span className="text-primary">دادبان</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-muted sm:text-lg sm:leading-9">
                سند حقوقی‌تان را عکس بگیرید و بفرستید، سؤال خود را بپرسید یا با صدا صحبت کنید —
                هوش مصنوعی دادبان با استناد به مواد قانونی، شما را راهنمایی می‌کند.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button href="/ai-assistant" size="lg" icon="chat">شروع گفتگو با دستیار</Button>
                <Button href="/contracts/review" variant="outline" size="lg" icon="document">تحلیل قرارداد متنی</Button>
              </div>
            </div>
            <div className="relative hidden lg:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ai-hero.jpg"
                alt="ترازوی عدالت در هم‌آمیخته با هوش مصنوعی — نماد مرکز هوش مصنوعی دادبان"
                className="w-full rounded-3xl border border-border shadow-[var(--shadow-lift)]"
                loading="eager"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* ─── قابلیت‌ها ─── */}
      <section className="mt-14">
        <Container>
          <SectionHeading
            eyebrow="قابلیت‌ها"
            title="چهار دستیار هوشمند، یک مرکز"
            desc="هر ابزار برای یک نیاز حقوقی طراحی شده؛ همه بدون نیاز به نصب."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((c) => {
              const inner = (
                <>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon name={c.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-bold text-foreground">{c.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted">{c.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">
                    {c.href ? "ورود به ابزار" : "همین پایین‌تر"} <Icon name="arrow" className="h-3.5 w-3.5" />
                  </span>
                </>
              );
              return c.href ? (
                <Link key={c.title} href={c.href} className="group rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-lift)]">
                  {inner}
                </Link>
              ) : (
                <Card key={c.title} className="group">
                  {inner}
                </Card>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ─── جعبه‌ابزار منبع‌باز ─── */}
      <section className="mt-10">
        <Container>
          <Link
            href="/ai/resources"
            className="group relative block overflow-hidden rounded-3xl border border-border bg-surface p-6 transition-all hover:border-primary hover:shadow-[var(--shadow-lift)] sm:p-8"
          >
            <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary-soft blur-2xl" />
            <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Icon name="bolt" className="h-7 w-7" />
              </span>
              <div className="flex-1">
                <h3 className="text-lg font-black text-foreground sm:text-xl">
                  جعبه‌ابزار منبع‌باز هوش مصنوعی
                  <Badge tone="primary" icon="sparkles">جدید</Badge>
                </h3>
                <p className="mt-1.5 max-w-2xl text-sm leading-7 text-muted">
                  کاتالوگ زنده‌ی ۱۱۸ مدل رایگان از ۱۶ تأمین‌کننده، خواندن صفحه وب و تحلیل مخزن گیت‌هاب،
                  ۳۱ مهارت عامل، آکادمی مهندسی AI و تست سلامت دروازه‌ی مسیریابی دادبان.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-primary">
                ورود به جعبه‌ابزار <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </span>
            </div>
          </Link>
        </Container>
      </section>

      {/* ─── ابزارها (تعاملی) ─── */}
      <section id="tools" className="mt-16 scroll-mt-24">
        <Container>
          <SectionHeading
            eyebrow="ابزارهای زنده"
            title="همین حالا امتحان کنید"
            desc="سند بفرستید، جستجو کنید یا با ابزار صوتی کار کنید."
          />
          <div className="mt-8 rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6">
            <AiTools />
          </div>
        </Container>
      </section>

      {/* ─── سلب مسئولیت ─── */}
      <section className="mt-12">
        <Container>
          <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
            <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <p className="text-sm leading-7 text-foreground-soft">
              خروجی ابزارهای هوش مصنوعی دادبان جنبه اطلاع‌رسانی و راهنمایی اولیه دارد و جایگزین مشاوره، وکالت یا نظر قطعی وکیل رسمی نیست.
              برای تصمیم‌های مهم حقوقی، با وکلای تأییدشده‌ی <Link href="/lawyers" className="font-bold text-primary hover:underline">دادبان</Link> مشورت کنید.
            </p>
          </div>
        </Container>
      </section>
    </div>
  );
}
