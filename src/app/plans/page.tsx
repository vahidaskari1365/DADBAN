import type { Metadata } from "next";
import { Container, Button, Badge } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { BorderBeam } from "@/components/magicui/border-beam";
import { faPrice } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { getMembershipPlans } from "@/lib/content-store";
import type { PlanCatalogItem } from "@/lib/plans-catalog";
import { safeJsonLd } from "@/lib/jsonld";

export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("پلن‌های عضویت وکلا"),
    description: t(
      "پلن‌های عضویت وکلا در دادورزان: نمایش برتر در نتایج جستجو، نشان تأیید ویژه، آمار پیشرفته پروفایل و اولویت در دریافت درخواست‌های موکلان؛ پلن مناسب وکیل خود را انتخاب کنید.",
    ),
    alternates: { canonical: "/plans" },
  };
}

const FAQ: { q: string; a: string }[] = [
  {
    q: "چطور پلنم را فعال کنم؟",
    a: "روی دکمهٔ پلن موردنظر کلیک کنید و در صفحهٔ تماس درخواست فعال‌سازی را ثبت کنید؛ کارشناسان دادورزان حداکثر تا یک روز کاری پلن شما را فعال می‌کنند.",
  },
  {
    q: "آیا می‌توانم پلنم را بعداً تغییر دهم؟",
    a: "بله؛ در هر زمان می‌توانید پلن خود را ارتقا دهید؛ مابه‌التفاوت به‌صورت منصفانه و متناسب با روزهای باقی‌مانده محاسبه می‌شود.",
  },
  {
    q: "آیا امکان لغو اشتراک هست؟",
    a: "بله؛ اشتراک ماهانه است و هر زمان قابل لغو است؛ پس از لغو، پروفایل شما به پلن پایه بازمی‌گردد و هیچ هزینهٔ اضافه‌ای دریافت نمی‌شود.",
  },
];

export default async function PlansPage() {
  const t = await getT();

  // منبع: دیتابیس (مدیریت پلن‌ها در پنل ادمین) با fallback کاتالوگ تحریریه
  const plans = await getMembershipPlans();

  /* دادهٔ ساخت‌یافتهٔ FAQ برای موتورهای جستجو و دستیارهای هوشمند */
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: t(f.q),
      acceptedAnswer: { "@type": "Answer", text: t(f.a) },
    })),
  };

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-pricing.png"
        badge={t("ارتفاع بگیرید؛ دیده شوید")}
        title={t("پلن‌های عضویت وکلا")}
        desc={t(
          "پروفایل خود را به یک ویترین حرفه‌ای تبدیل کنید؛ در نتایج جستجو بالاتر دیده شوید و درخواست‌های بیشتری از موکلان دریافت کنید.",
        )}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پلن‌های عضویت وکلا") }]}
        chips={[
          { icon: "badge", label: t("نشان تأیید ویژه روی پروفایل") },
          { icon: "search", label: t("نمایش برتر در نتایج جستجو") },
          { icon: "bolt", label: t("آمار بازدید و عملکرد پروفایل") },
        ]}
      />

      {/* کارت‌های پلن */}
      <Container className="py-12">
        <Reveal className="text-center">
          <Badge tone="primary" icon="briefcase">{t("اشتراک وکلا")}</Badge>
          <h2 className="mt-3 text-2xl font-bold text-foreground">{t("پلن خود را انتخاب کنید")}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
            {t("همهٔ پلن‌ها شامل پروفایل حرفه‌ای، درگاه پرداخت امن و پشتیبانی دادورزان است.")}
          </p>
        </Reveal>

        <Reveal delay={80} className="mt-4 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3.5 py-1.5 text-xs font-bold text-accent-text">
            <Icon name="sparkles" className="h-3.5 w-3.5" />
            {t("با اشتراک سالانه ۲ ماه رایگان")}
          </span>
        </Reveal>

        {/* چیدمان تطبیقی — با هر تعداد پلن (۱، ۲، ۳، ۴ و…) مرکزچین و مرتب می‌ماند */}
        <div className="mt-10 flex flex-wrap items-stretch justify-center gap-5">
          {plans.map((p, i) => (
            <Reveal
              key={p.key}
              delay={i * 120}
              className={`w-full max-w-[440px] sm:w-[340px] sm:max-w-none ${p.highlight ? "lg:-translate-y-3" : ""}`}
            >
              <div
                className={`relative flex h-full flex-col overflow-hidden rounded-3xl border p-6 card-shadow transition-transform duration-300 hover:-translate-y-1 ${
                  p.highlight ? "border-accent bg-accent-soft/30" : "border-border bg-surface"
                }`}
                data-testid={`plan-card-${p.key}`}
              >
                {/* پرتو گردندهٔ طلایی روی کارت پیشنهاد ویژه */}
                {p.highlight && (
                  <BorderBeam size={60} duration={7} colorFrom="#e6b94e" colorTo="#f3d78c" borderWidth={2} />
                )}

                <div className="flex items-start justify-between">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${
                      p.highlight ? "bg-accent text-accent-foreground" : "bg-primary-soft text-primary"
                    }`}
                  >
                    <Icon name={p.icon} className="h-5 w-5" />
                  </span>
                  {p.highlight && <Badge tone="accent" icon="star">{t("پیشنهاد ویژه")}</Badge>}
                </div>

                <h3 className="mt-4 text-lg font-bold text-foreground">{t(p.name)}</h3>
                <p className="mt-1 text-xs text-muted">{t(p.desc)}</p>

                <div className="mt-4 flex items-baseline gap-1.5">
                  {p.price > 0 ? (
                    <>
                      <span className="text-2xl font-extrabold text-foreground">{faPrice(p.price)}</span>
                      <span className="text-xs text-muted">/ {t("ماهانه")}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-extrabold text-foreground">{t("رایگان")}</span>
                  )}
                </div>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground-soft">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {t(f)}
                    </li>
                  ))}
                </ul>

                <Button href={p.href} variant={p.highlight ? "accent" : "outline"} className="mt-6 w-full">
                  {t(p.cta)}
                </Button>
              </div>
            </Reveal>
          ))}

          {/* حالت خالی — وقتی ادمین همهٔ پلن‌ها را حذف/غیرفعال کرده */}
          {plans.length === 0 && (
            <div className="w-full max-w-xl rounded-3xl border border-border bg-surface p-10 text-center" data-testid="plans-empty">
              <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Icon name="briefcase" className="h-6 w-6" />
              </span>
              <p className="mt-4 text-base font-bold text-foreground">{t("در حال حاضر پلن فعالی ثبت نشده است")}</p>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted">
                {t("برای اطلاع از پلن‌های عضویت و فعال‌سازی اختصاصی با ما در تماس باشید.")}
              </p>
              <Button href="/contact" icon="phone" className="mt-5">{t("تماس با دادورزان")}</Button>
            </div>
          )}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-[11px] leading-6 text-muted">
          {t("قیمت‌ها بدون احتساب مالیات بر ارزش افزوده است؛ پس از انتخاب پلن، کارشناسان دادورزان فعال‌سازی را انجام می‌دهند.")}
        </p>
      </Container>

      {/* پرسش‌های متداول */}
      <Container className="py-8">
        <Reveal>
          <h2 className="text-center text-xl font-bold text-foreground">{t("پرسش‌های متداول")}</h2>
        </Reveal>
        <div className="mx-auto mt-6 max-w-3xl space-y-3">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={i * 90}>
              <div className="rounded-2xl border border-border bg-surface p-5">
                <p className="flex items-start gap-2 text-sm font-bold text-foreground">
                  <Icon name="chat" className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" /> {t(f.q)}
                </p>
                <p className="mt-2 pr-6 text-sm leading-7 text-foreground-soft">{t(f.a)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>

      {/* CTA پایانی */}
      <Container className="pb-14 pt-4">
        <Reveal>
          <div className="rounded-3xl border border-border bg-surface p-8 text-center card-shadow">
            <h2 className="text-xl font-bold text-foreground">{t("برای انتخاب پلن مناسب راهنمایی می‌خواهید؟")}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              {t("کارشناسان دادورزان بر اساس حوزهٔ تخصص و اهداف شما، بهترین پلن را پیشنهاد می‌دهند.")}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button href="/contact" icon="phone">{t("مشاوره خرید پلن")}</Button>
              <Button href="/lawyers" variant="outline" icon="user">{t("بازگشت به فهرست وکلا")}</Button>
            </div>
          </div>
        </Reveal>
      </Container>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />
    </>
  );
}
