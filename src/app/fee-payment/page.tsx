import type { Metadata } from "next";
import Image from "next/image";
import { Container, SectionHeading, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { FaqAccordion } from "@/components/amazon/faq-accordion";
import { faNum } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import { SITE_NAME } from "@/lib/brand";
import { getT } from "@/lib/i18n/server";

/**
 * حق‌الوکاله و پرداخت قسطی — صفحهٔ مرجعِ صادقانه برای دغدغهٔ پرداخت وکیل.
 * لحن برند: بدون ادعای تأیید نهادها؛ هر قول فقط شفافیت فرآیند است و
 * شرط‌های مالی همیشه «بسته به توافق با وکیل» و «ثبت‌شده در قرارداد» بیان می‌شود.
 */

export const metadata: Metadata = {
  title: "حق‌الوکاله و پرداخت قسطی",
  description:
    "اگر پرداخت حق‌الوکاله برایتان دشوار است، دیگر نگران نباشید؛ در دادبان با توافق وکیل می‌توانید حق‌الوکاله را یکجا، قسطی (۲ تا ۴ قسط) یا مرحله‌ای بپردازید — با شرایط شفاف، ثبت در قرارداد و پیگیری آنلاین.",
  keywords: [
    "حق الوکاله",
    "پرداخت قسطی حق الوکاله",
    "قسطی کردن هزینه وکیل",
    "هزینه وکیل قسطی",
    "پرداخت مرحله‌ای حق‌الوکاله",
    "تعرفه وکالت",
    "دادبان",
  ],
  alternates: {
    canonical: "/fee-payment",
    languages: {
      "fa-IR": "/fee-payment",
      "x-default": "/fee-payment",
    },
  },
  openGraph: {
    title: "حق‌الوکاله، بدون دغدغهٔ پرداخت",
    description:
      "پرداخت یکجا، قسطی یا مرحله‌ای حق‌الوکاله — با توافق وکیل، ثبت در قرارداد و پیگیری شفاف در پنل موکل و وکیل.",
    url: "/fee-payment",
    siteName: SITE_NAME,
    locale: "fa_IR",
    type: "website",
    images: [
      {
        url: "/images/fee-installment.png",
        width: 1344,
        height: 768,
        alt: "ترازوی طلایی عدالت با سکه و سند حقوقی روی زمینهٔ سرمه‌ای — نماد پرداخت منظم حق‌الوکاله",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "حق‌الوکاله، بدون دغدغهٔ پرداخت | دادبان",
    description:
      "با توافق وکیل، حق‌الوکاله را یکجا، قسطی یا مرحله‌ای بپردازید — شفاف و قابل رهگیری.",
    images: ["/images/fee-installment.png"],
  },
};

/* ---------------- محتوای صفحه ---------------- */

const WHAT_IS_FEE: { icon: IconKey; title: string; desc: string }[] = [
  {
    icon: "file",
    title: "حق‌الوکاله چیست؟",
    desc: "دستمزد وکیل بابت خدماتی است که در جریان پرونده انجام می‌دهد؛ مبلغی جدا از هزینه‌های دادرسی مثل هزینهٔ ثبت دادخواست یا ابلاغ اوراق که مستقیم به مرجع قضایی پرداخت می‌شود.",
  },
  {
    icon: "document",
    title: "چقدر و بر مبنای چه؟",
    desc: "میزان حق‌الوکاله بنا بر توافق وکیل و موکل تعیین و در قرارداد وکالت ثبت می‌شود؛ تعرفه‌های پیشنهادی می‌تواند مبنای گفتگو باشد، اما رقم نهایی همان است که دو طرف امضا می‌کنند.",
  },
  {
    icon: "shield",
    title: "تعرفه شفاف",
    desc: "در دادبان مبلغ، شرایط و سبک پرداخت پیش از شروع کار در قرارداد دادبان نوشته می‌شود و بدون توافق کتبی طرفین تغییری نمی‌کند.",
  },
];

const PAYMENT_OPTIONS: {
  n: string;
  icon: IconKey;
  title: string;
  desc: string;
  fit: string;
  highlight?: boolean;
}[] = [
  {
    n: "۱",
    icon: "money",
    title: "پرداخت یکجا",
    desc: "کل حق‌الوکاله با توافق وکیل در ابتدای کار پرداخت می‌شود؛ ساده‌ترین حالت برای بستن مسائل مالی از همان روز اول.",
    fit: "پرونده‌های کوتاه و کم‌مرحله که در یک یا دو جلسه نتیجه می‌گیرند.",
  },
  {
    n: "۲",
    icon: "calendar",
    title: "پرداخت قسطی",
    desc: "حق‌الوکاله با توافق وکیل به ۲ تا ۴ قسط تقسیم می‌شود و موعد هر قسط بر اساس مراحل پرونده در قرارداد مشخص می‌شود.",
    fit: "وقتی مبلغ یکجا برای شما سنگین است، اما قصد شروع فوری پرونده را دارید.",
    highlight: true,
  },
  {
    n: "۳",
    icon: "gavel",
    title: "پرداخت مرحله‌ای",
    desc: "پرداخت متناسب با پیشرفت پرونده است؛ مثلاً ابتدای دادرسی، بعد از جلسهٔ اول و پس از صدور رأی.",
    fit: "پرونده‌های چندمرحله‌ای مثل ملکی، کیفری و دعاوی خانواده.",
  },
];

const HOW_STEPS: { title: string; desc: string }[] = [
  {
    title: "ثبت درخواست و توضیح وضعیت مالی",
    desc: "پرونده را ثبت کنید و در توضیحات بنویسید که پرداخت قسطی می‌خواهید؛ کارشناس دادبان شرایط را پیش از معرفی وکیل بررسی می‌کند.",
  },
  {
    title: "توافق قسطی با وکیل و ثبت در قرارداد دادبان",
    desc: "مبلغ کل، تعداد قسط‌ها و موعد هر قسط با وکیل توافق و مکتوب می‌شود؛ این قرارداد مبنای پرداخت شماست.",
  },
  {
    title: "پرداخت هر قسط از پنل موکل با یادآور خودکار",
    desc: "هر قسط از پنل موکل پرداخت می‌شود و یادآور خودکار، پیش از موعد به شما اطلاع می‌دهد تا چیزی از قلم نیفتد.",
  },
  {
    title: "پیگیری شفاف پرداخت‌ها در داشبورد",
    desc: "وضعیت پرداخت‌های انجام‌شده و باقی‌مانده در داشبورد شما و وکیل یکسان دیده می‌شود؛ هیچ عددی پنهان نمی‌ماند.",
  },
];

const GUARANTEES: { title: string; desc: string }[] = [
  {
    title: "شرایط شما قبل از امضای قرارداد شفاف می‌شود",
    desc: "مبلغ کل، تعداد و موعد قسط‌ها پیش از امضا مکتوب و روشن است؛ چیزی برای «بعداً مشخص می‌شود» باقی نمی‌ماند.",
  },
  {
    title: "قسط‌ها در قرارداد ثبت و برای هر دو طرف قابل رهگیری است",
    desc: "نه چیزی از وکیل پنهان می‌ماند، نه از شما؛ وضعیت هر قسط در داشبورد هر دو طرف یکسان دیده می‌شود.",
  },
  {
    title: "بدون هزینهٔ پنهان",
    desc: "دادبان بابت قسط‌بندی هزینهٔ جداگانه‌ای دریافت نمی‌کند؛ آنچه در قرارداد نوشته شده، همان است که می‌پردازید.",
  },
];

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "آیا پرداخت قسطی برای همهٔ پرونده‌ها ممکن است؟",
    a: "قسطی‌شدن حق‌الوکاله بسته به توافق با وکیل است و به نوع پرونده، مراحل آن و مبلغ توافقی بستگی دارد. در پرونده‌های کوتاه معمولاً پرداخت یکجا یا دو قسط رایج‌تر است؛ در پرونده‌های چندمرحله‌ای امکان تقسیم به قسط‌های بیشتر با توافق وکیل وجود دارد.",
  },
  {
    q: "اولین قسط چه زمانی پرداخت می‌شود؟",
    a: "الگوی رایج این است که قسط اول هنگام شروع کار و ثبت قرارداد پرداخت شود تا وکیل کار را آغاز کند و باقی قسط‌ها بر اساس مراحل پرونده سررسید بخورند؛ اما موعد دقیق همان است که در قرارداد شما ثبت می‌شود.",
  },
  {
    q: "اگر پرداخت یک قسط عقب افتاد چه می‌شود؟",
    a: "شرایط تأخیر همان است که در قرارداد آمده است. اگر پیش‌بینی می‌کنید قسطی دیرتر پرداخت می‌شود، همین موضوع را پیش از موعد با وکیل یا پشتیبانی دادبان در میان بگذارید تا در صورت توافق، زمان‌بندی بازنگری شود.",
  },
  {
    q: "همهٔ وکلای دادبان پرداخت قسطی را می‌پذیرند؟",
    a: "نه؛ پذیرش قسطی به تصمیم هر وکیل و شرایط پرونده بستگی دارد. پیش از ثبت توافق، شرایط پرداخت با وکیل مشخص می‌شود؛ اگر قسطی برایتان ضروری است، از همان ابتدا موضوع را مطرح کنید تا وکیل مناسب انتخاب شود.",
  },
  {
    q: "آیا پرداخت قسطی هزینهٔ اضافه دارد؟",
    a: "دادبان بابت قسط‌بندی هزینهٔ جداگانه‌ای دریافت نمی‌کند؛ مبلغی که می‌پردازید همان حق‌الوکالهٔ توافقی است. آنچه در قرارداد نوشته می‌شود، مبنای پرداخت شماست.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default async function FeePaymentPage() {
  const t = await getT();
  return (
    <>
      {/* HERO — تصویر ترازو و سکه + متن به‌صورت overlay (متن داخل تصویر نیست) */}
      <section className="relative border-b border-border">
        <div className="relative min-h-[540px] sm:min-h-[500px]">
          <Image
            src="/images/fee-installment.png"
            alt={t("ترازوی طلایی عدالت با سکه و سند حقوقی روی زمینهٔ سرمه‌ای — نماد پرداخت منظم حق‌الوکاله")}
            width={1344}
            height={768}
            priority
            sizes="100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to left, color-mix(in oklab, #0f2a48 96%, transparent) 30%, color-mix(in oklab, #15365d 88%, transparent) 60%, color-mix(in oklab, #15365d 40%, transparent))",
            }}
          />
          <Container className="relative flex min-h-[540px] items-center py-12 sm:min-h-[500px] sm:py-16">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/25">
                <Icon name="balance" className="h-3.5 w-3.5 text-[#eec97b]" />
                {t("حق‌الوکاله و پرداخت قسطی")}
              </p>
              <h1 className="mt-4 text-balance text-3xl font-black leading-[1.25] text-white sm:text-4xl md:text-5xl md:leading-[1.2]">
                {t("حق‌الوکاله، بدون دغدغهٔ پرداخت")}
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-sm leading-8 text-white/90 sm:text-base">
                {t(
                  "هزینهٔ وکیل نباید مانع شروع پرونده‌تان باشد. در دادبان، بسته به توافق با وکیل، حق‌الوکاله را می‌توانید یکجا، قسطی یا مرحله‌ای بپردازید — همه‌چیز شفاف و در قرارداد ثبت می‌شود.",
                )}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button href="/case/new" variant="accent" size="lg" icon="folder">
                  {t("ثبت پرونده با پرداخت قسطی")}
                </Button>
                <a
                  href="/ai-assistant"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-6 text-base font-semibold text-white transition-colors hover:bg-white/20"
                >
                  <Icon name="sparkles" className="h-[1.15em] w-[1.15em]" />
                  {t("مشاورهٔ رایگان")}
                </a>
              </div>
            </div>
          </Container>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5"
            style={{
              background:
                "linear-gradient(to left, var(--accent), color-mix(in oklab, var(--accent) 30%, transparent))",
            }}
          />
        </div>
      </section>

      {/* حق‌الوکاله چیست؟ — توضیح ساده و صادقانه */}
      <Container className="py-14 sm:py-16">
        <Reveal variant="blur">
          <SectionHeading
            eyebrow={t("آشنایی اولیه")}
            title={t("حق‌الوکاله چیست؟")}
            desc={t("قبل از هر تصمیمی، این چند نکته را به زبان ساده بدانید — بدون پیچیدگی حقوقی.")}
          />
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {WHAT_IS_FEE.map((w, i) => (
            <Reveal key={w.title} delay={i * 70}>
              <div className="h-full rounded-2xl border border-border bg-surface p-6 card-shadow">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Icon name={w.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-base font-black text-foreground">{t(w.title)}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{t(w.desc)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>

      {/* ۳ گزینهٔ پرداخت — اینفوگرافیک CSS */}
      <Container className="pb-14 sm:pb-16">
        <div id="options" className="scroll-mt-24">
          <Reveal variant="blur">
            <SectionHeading
              eyebrow={t("گزینه‌های پرداخت")}
              title={t("سه راه برای پرداخت حق‌الوکاله")}
              desc={t("بسته به توافق با وکیل، یکی از این سه سبک را انتخاب می‌کنید؛ هر سه در قرارداد ثبت می‌شوند.")}
            />
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PAYMENT_OPTIONS.map((o, i) => (
              <Reveal key={o.title} delay={i * 70}>
                <div
                  className={`relative flex h-full flex-col rounded-2xl border bg-surface p-6 card-shadow ${
                    o.highlight ? "border-accent/50 ring-1 ring-accent/25" : "border-border"
                  }`}
                >
                  {o.highlight && (
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-black text-accent-text ring-1 ring-accent/30">
                      <Icon name="bolt" className="h-3 w-3" />
                      {t("انعطاف بیشتر")}
                    </span>
                  )}
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Icon name={o.icon} className="h-6 w-6" />
                  </span>
                  <p className="mt-4 text-xs font-bold text-accent-text">{t(`گزینهٔ ${o.n}`)}</p>
                  <h3 className="mt-1 text-lg font-black text-foreground">{t(o.title)}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted">{t(o.desc)}</p>
                  <p className="mt-auto border-t border-border pt-3 text-xs leading-6">
                    <span className="font-bold text-foreground-soft">{t("مناسب برای: ")}</span>
                    <span className="text-muted">{t(o.fit)}</span>
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>

      {/* چطور قسطی شروع می‌شود؟ — ۴ گام شماره‌دار */}
      <div id="how" className="scroll-mt-20 border-y border-border bg-surface-2/40">
        <Container className="py-14 sm:py-16">
          <Reveal variant="blur">
            <SectionHeading
              eyebrow={t("مسیر اجرایی")}
              title={t("چطور قسطی شروع می‌شود؟")}
              desc={t("از ثبت درخواست تا پرداخت آخرین قسط، چهار گام ساده.")}
            />
          </Reveal>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 60} as="li">
                <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 card-shadow">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-base font-black text-accent-foreground">
                    {faNum(i + 1)}
                  </span>
                  <h3 className="mt-3 text-sm font-black leading-6 text-foreground">{t(s.title)}</h3>
                  <p className="mt-1.5 text-xs leading-6 text-muted">{t(s.desc)}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </Container>
      </div>

      {/* اطمینان‌بخشی — تصویر + ۳ تضمین صادقانه */}
      <Container className="py-14 sm:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-border card-shadow">
              <Image
                src="/images/fee-worry-free.png"
                alt={t("موکل نگران که با سپر اطمینان دادبان همراه شده — نماد آرامش خاطر در پرداخت قسطی حق‌الوکاله")}
                width={1152}
                height={864}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="h-auto w-full"
              />
            </div>
          </Reveal>
          <Reveal delay={80}>
            <p className="inline-block rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              {t("خیال راحت")}
            </p>
            <h2 className="mt-3 text-2xl font-black text-foreground sm:text-3xl">
              {t("با خیال راحت، قسط‌به‌قسط جلو بروید")}
            </h2>
            <p className="mt-3 text-sm leading-8 text-muted">
              {t("چیزی که ما تضمین می‌کنیم، شفافیت فرآیند است؛ این سه قول قابل بررسی‌اند:")}
            </p>
            <ul className="mt-6 space-y-5">
              {GUARANTEES.map((g) => (
                <li key={g.title} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                    <Icon name="check" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{t(g.title)}</p>
                    <p className="mt-1 text-sm leading-7 text-muted">{t(g.desc)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Container>

      {/* FAQ — آکاردئون */}
      <Container className="pb-14 sm:pb-16">
        <Reveal variant="blur">
          <div id="faq" className="scroll-mt-24">
            <FaqAccordion
              items={FAQ_ITEMS.map((f) => ({ q: t(f.q), a: t(f.a) }))}
              title={t("پرسش‌های پرتکرار دربارهٔ پرداخت قسطی")}
            />
          </div>
        </Reveal>
      </Container>

      {/* CTA نهایی — تک‌هدفه */}
      <Container className="pb-16">
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
              <h2 className="text-2xl font-black text-foreground sm:text-3xl">
                {t("پرونده‌تان را همین امروز شروع کنید")}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-muted sm:text-base">
                {t("وضعیت مالی شما نباید مانع شروع باشد؛ درخواست را ثبت کنید تا شرایط پرداخت با وکیل مشخص و در قرارداد ثبت شود.")}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button
                  href="/case/new"
                  size="lg"
                  icon="folder"
                  className="shadow-[var(--shadow-lift)]"
                >
                  {t("ثبت پرونده با پرداخت قسطی")}
                </Button>
                <Button href="/ai-assistant" size="lg" variant="outline" icon="sparkles">
                  {t("مشاورهٔ رایگان")}
                </Button>
              </div>
              <p className="mt-5 text-xs text-muted">
                {t("توافق نهایی پرداخت همیشه با وکیل و در چارچوب قرارداد دادبان ثبت می‌شود.")}
              </p>
            </div>
          </div>
        </Reveal>
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
