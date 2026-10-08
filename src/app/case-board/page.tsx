import type { Metadata } from "next";
import { Container, SectionHeading, Button, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { CaseBoardClient } from "@/components/case-board-client";
import { SITE_NAME } from "@/lib/brand";

/**
 * «بازار پرونده‌های دادبان» — مدل بازار کار برای پرونده‌های حقوقی:
 * موکل پرونده را ثبت می‌کند ← پرونده (بدون اطلاعات تماس) در برد عمومی دیده می‌شود ←
 * وکلای متخصص نظر و پیشنهاد قیمت (تومان) ثبت می‌کنند ← موکل بهترین پیشنهاد را
 * انتخاب می‌کند و گفتگوی رایگان آغاز می‌شود.
 * روند کار در همین صفحه برای هر دو طرف توضیح داده شده است.
 */

export const metadata: Metadata = {
  title: "بازار پرونده‌ها | ثبت پرونده و پیشنهاد قیمت وکلا",
  description:
    "پروندهٔ حقوقی‌تان را ثبت کنید تا وکلای متخصص دادبان نظر و پیشنهاد قیمت خود را اعلام کنند و شما بهترین را انتخاب کنید. وکیل هستید؟ روی پرونده‌های استان خودتان پیشنهاد قیمت بدهید.",
  alternates: { canonical: "/case-board" },
  openGraph: {
    title: "بازار پرونده‌های دادبان",
    description:
      "مثل بازار کار، ولی برای پرونده‌های حقوقی: موکل ثبت می‌کند، وکلا قیمت می‌دهند، موکل بهترین را انتخاب می‌کند.",
    type: "website",
  },
};

const STEPS: { icon: "file" | "search" | "money" | "check"; title: string; desc: string }[] = [
  {
    icon: "file",
    title: "۱. موکل پرونده را ثبت می‌کند",
    desc: "فرم کوتاه «ثبت پرونده» را در کمتر از دو دقیقه پر کنید: موضوع، شهر، مرحله و توضیحات. یک شمارهٔ پرونده و کد پیگیری محرمانه می‌گیرید.",
  },
  {
    icon: "search",
    title: "۲. پرونده در بازار دیده می‌شود",
    desc: "خلاصهٔ پرونده (بدون نام، شمارهٔ تماس و کد پیگیری) در همین برد عمومی نمایش داده می‌شود و وکلای متخصص همان استان آن را بررسی می‌کنند.",
  },
  {
    icon: "money",
    title: "۳. وکلا نظر و قیمت پیشنهاد می‌دهند",
    desc: "هر وکیل راهکار خود و قیمت پیشنهادی (تومان) را ثبت می‌کند. تعداد پیشنهادهای هر پرونده روی کارت آن دیده می‌شود.",
  },
  {
    icon: "check",
    title: "۴. موکل بهترین پیشنهاد را انتخاب می‌کند",
    desc: "موکل پیشنهادها را با هم مقایسه می‌کند و بهترین وکیل را انتخاب می‌کند؛ گفتگوی رایگان آغاز می‌شود و بقیهٔ پیشنهادها بسته می‌شوند.",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "ثبت پرونده و دیدن پیشنهادها برای موکل هزینه دارد؟",
    a: "نه. ثبت پرونده، دریافت پیشنهاد قیمت و انتخاب وکیل برای موکل کاملاً رایگان است؛ پرداخت فقط طبق توافق مستقیم شما با وکیلِ انتخابی انجام می‌شود.",
  },
  {
    q: "اطلاعات تماس من عمومی می‌شود؟",
    a: "خیر. فقط موضوع، شهر، مرحله و توضیحات کلی پرونده در بازار دیده می‌شود و شمارهٔ تماس‌هایی که در متن توضیحات نوشته شده باشد به‌صورت خودکار ماسک می‌گردد. نام، موبایل و کد پیگیری شما فقط پس از انتخاب وکیل در اختیار همان وکیل قرار می‌گیرد.",
  },
  {
    q: "وکیل چطور روی پرونده‌ها پیشنهاد قیمت بدهد؟",
    a: "با حساب وکیل وارد شوید، پروندهٔ باز استان خودتان را باز کنید و نظر + قیمت پیشنهادی (تومان) را ثبت کنید. ثبت و به‌روزرسانی پیشنهاد برای وکیل رایگان است و تا قبل از انتخاب موکل قابل به‌روزرسانی است.",
  },
  {
    q: "بعد از انتخاب وکیل چه اتفاقی می‌افتد؟",
    a: "پرونده از برد بازار خارج می‌شود، گفتگوی رایگان موکل و وکیل در صفحهٔ پیشنهادها آغاز می‌شود و مسیر پرونده با شمارهٔ پیگیری و در پنل موکل قابل پیگیری است.",
  },
];

export default function CaseBoardPage() {
  return (
    <div className="page-wash">
      <PageHero
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "بازار پرونده‌ها" }]}
        badge="مثل بازار کار، ولی برای پرونده‌های حقوقی"
        title="پرونده‌تان را ثبت کنید؛ وکلا قیمت بدهند، شما بهترین را انتخاب کنید"
        desc="در بازار پرونده‌های دادبان، موکل پروندهٔ خود را ثبت می‌کند، وکلای متخصص همان استان نظر و پیشنهاد قیمت خود را اعلام می‌کنند و موکل آزادانه بهترین پیشنهاد را انتخاب می‌کند. رقابت شفاف بین وکلا یعنی قیمت واقعی برای شما."
      >
        <div className="flex flex-wrap gap-3">
          <Button href="/case/new" icon="plus">ثبت پروندهٔ جدید (رایگان)</Button>
          <Button href="/lawyers" variant="outline" icon="search">جستجوی مستقیم وکیل</Button>
        </div>
      </PageHero>

      {/* برد زندهٔ پرونده‌های باز — آمار، فیلتر، کارت‌ها و مودال پیشنهاد */}
      <div className="py-10">
        <CaseBoardClient />
      </div>

      {/* روند کار — توضیح کامل فرآیند برای هر دو طرف */}
      <section className="mt-8 border-t border-border bg-surface-2/30 py-14" aria-label="روند کار بازار پرونده‌ها">
        <Container>
          <Reveal variant="blur">
            <SectionHeading
              eyebrow="روند کار"
              title="بازار پرونده‌ها در ۴ گام"
              desc="همین چهار قدم از ثبت پرونده تا شروع کار با وکیلِ انتخابی شما — شفاف، بدون واسطهٔ غیرضروری و با رقابت سالم بین وکلا."
            />
          </Reveal>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 80} variant="start">
                <li className="relative h-full rounded-2xl border border-border bg-surface p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Icon name={s.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 text-sm font-black text-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-xs leading-6 text-muted">{s.desc}</p>
                  {i < STEPS.length - 1 && (
                    <Icon
                      name="chevron"
                      className="absolute -start-2 top-10 hidden h-4 w-4 rotate-180 text-primary/40 lg:block"
                      aria-hidden
                    />
                  )}
                </li>
              </Reveal>
            ))}
          </ol>

          {/* دو مسیر — موکل و وکیل */}
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <Reveal variant="start">
              <Card hover={false} className="h-full p-6">
                <Badge tone="primary" icon="user">برای موکل‌ها</Badge>
                <h3 className="mt-3 text-lg font-black text-foreground">پرونده دارید؟ بهترین قیمت را از رقابت وکلا بگیرید</h3>
                <ul className="mt-3 space-y-2 text-xs leading-6 text-muted">
                  <li className="flex items-start gap-2"><Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-success" />ثبت پرونده، دریافت پیشنهاد و انتخاب وکیل — همه رایگان</li>
                  <li className="flex items-start gap-2"><Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-success" />چند وکیل با قیمت‌های مختلف، شما مقایسه می‌کنید</li>
                  <li className="flex items-start gap-2"><Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-success" />اطلاعات تماس شما فقط به وکیل انتخابی داده می‌شود</li>
                  <li className="flex items-start gap-2"><Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-success" />گفتگوی رایگان با وکیلِ انتخابی تا توافق نهایی</li>
                </ul>
                <Button href="/case/new" icon="plus" className="mt-4 w-full sm:w-auto">پروندهٔ من را ثبت کنم</Button>
              </Card>
            </Reveal>
            <Reveal variant="start" delay={100}>
              <Card hover={false} className="h-full p-6">
                <Badge tone="accent" icon="gavel">برای وکلا</Badge>
                <h3 className="mt-3 text-lg font-black text-foreground">وکیل هستید؟ پروندهٔ جدید در استان شماست</h3>
                <ul className="mt-3 space-y-2 text-xs leading-6 text-muted">
                  <li className="flex items-start gap-2"><Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-success" />پرونده‌های باز استان شما را همین‌جا ببینید</li>
                  <li className="flex items-start gap-2"><Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-success" />نظر و قیمت پیشنهادی خود را ثبت و هر وقت خواستید به‌روزرسانی کنید</li>
                  <li className="flex items-start gap-2"><Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-success" />بدون هزینهٔ ثبت پیشنهاد؛ فقط وقتی موکل شما را انتخاب کرد شروع می‌شود</li>
                  <li className="flex items-start gap-2"><Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-success" />در کارتابل پنل وکیل هم «درخواست پرونده‌های استان» را می‌بینید</li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="#board-top"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-soft px-5 text-sm font-bold text-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground"
                  >
                    <Icon name="folder" className="h-4 w-4" />
                    دیدن پرونده‌های باز
                  </a>
                  <Button href="/login" variant="outline" icon="user" className="w-full sm:w-auto">ورود وکیل</Button>
                </div>
              </Card>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* پرسش‌های پرتکرار دربارهٔ فرآیند */}
      <section className="py-14" aria-label="پرسش‌های پرتکرار بازار پرونده‌ها">
        <Container>
          <Reveal variant="blur">
            <SectionHeading eyebrow="پرسش‌های پرتکرار" title="سؤال‌هایی که همیشه پرسیده می‌شود" />
          </Reveal>
          <div className="mx-auto mt-8 max-w-3xl space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-border bg-surface px-4 py-3 open:border-primary/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-foreground [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted transition-transform group-open:-rotate-90" />
                </summary>
                <p className="mt-2 border-t border-border pt-2.5 text-xs leading-7 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA پایانی */}
      <section className="pb-12">
        <Container>
          <Reveal variant="blur">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 text-center card-shadow sm:p-12">
              <div
                className="pointer-events-none absolute inset-0 opacity-50"
                style={{
                  background:
                    "linear-gradient(110deg, color-mix(in oklab, var(--primary) 12%, transparent), color-mix(in oklab, var(--accent) 10%, transparent), color-mix(in oklab, var(--primary) 12%, transparent))",
                }}
              />
              <div className="relative">
                <h2 className="text-2xl font-black text-foreground sm:text-3xl">همین حالا پروندهٔ خود را وارد بازار کنید</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-muted">
                  دو دقیقه وقت بگذارید، وکلای متخصص استان خودتان قیمت بدهند و شما بهترین پیشنهاد را انتخاب کنید — {SITE_NAME} هیچ هزینه‌ای بابت ثبت پرونده و انتخاب وکیل نمی‌گیرد.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button href="/case/new" size="lg" icon="plus" className="shadow-[var(--shadow-lift)]">ثبت پروندهٔ جدید</Button>
                  <Button href="/track-case" size="lg" variant="outline" icon="clock">پیگیری پروندهٔ ثبت‌شده</Button>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </div>
  );
}
