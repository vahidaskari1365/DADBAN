import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AuthPanel } from "@/components/auth-panel";
import { SpotlightCard } from "@/components/spotlight-card";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/brand";
import { SPECIALTIES } from "@/lib/data";

const TRUST = [
  { icon: "badge" as const, label: "وکلای احراز هویت‌شده" },
  { icon: "chat" as const, label: "پشتیبانی ۲۴/۷" },
  { icon: "sparkles" as const, label: "دستیار حقوقی هوشمند" },
];

/**
 * قالب مشترک صفحات ورود / ثبت‌نام — سبک مدرن ۲۰۲۵:
 * اورورای متحرک، حاشیه گرادیانی چرخان، مارکی تخصص‌ها و اسپات‌لایت موس
 */
export function AuthPage({ mode }: { mode: "login" | "register" }) {
  return (
    <main className="relative overflow-hidden">
      {/* ── پس‌زمینه: عکس هیرو (کم‌رنگ) + اورورا + نویز + شبکه نقطه‌ای ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* عکس هیروی سایت — هماهنگ با تم، با شفافیت کم */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 dark:hidden"
          style={{ backgroundImage: "url('/hero-bg-light.jpg')" }}
        />
        <div
          className="absolute inset-0 hidden bg-cover bg-center opacity-15 dark:block"
          style={{ backgroundImage: "url('/hero-bg-dark.jpg')" }}
        />
        {/* واش همرنگ صفحه برای محو بیشتر و خوانایی فرم */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, var(--background) 0%, color-mix(in oklab, var(--background) 55%, transparent) 45%, color-mix(in oklab, var(--background) 35%, transparent) 100%)",
          }}
        />
        <div className="auth-aurora-a absolute -top-32 right-[4%] h-[30rem] w-[30rem]" />
        <div className="auth-aurora-b absolute top-1/3 -left-36 h-[27rem] w-[27rem]" />
        <div className="auth-aurora-a absolute bottom-[-9rem] right-[40%] h-[23rem] w-[23rem] [animation-delay:-6s]" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--border-strong, var(--border)) 1px, transparent 0)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse 85% 65% at 50% 0%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 85% 65% at 50% 0%, black, transparent)",
          }}
        />
        <div className="auth-noise absolute inset-0" />
      </div>

      <Container className="relative grid items-center gap-10 py-10 pb-32 lg:min-h-[calc(100svh-4.5rem)] lg:gap-14 auth-grid lg:py-14">
        {/* ── سمت برند: لوگوی شناور + تایپوگرافی درشت + اعتماد + مارکی ── */}
        <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-right">
          <div className="auth-float relative">
            <div aria-hidden className="auth-aurora-b absolute -inset-12" />
            <div className="relative rounded-[2.5rem] bg-gradient-to-b from-border-strong to-border p-px shadow-[var(--shadow-lift)]">
              <div className="rounded-[calc(2.5rem-1px)] bg-white p-3.5 ring-1 ring-black/10">
                <Image
                  src="/logo1.png"
                  alt={`لوگوی ${SITE_NAME}`}
                  width={512}
                  height={512}
                  priority
                  sizes="(min-width: 1024px) 256px, (min-width: 640px) 224px, 176px"
                  className="h-auto w-full rounded-[1.75rem]"
                />
              </div>
            </div>
          </div>

          <h1 className="mt-9 max-w-xl text-[1.7rem] font-black leading-[1.45] tracking-tight text-foreground sm:text-4xl sm:leading-[1.4] lg:text-[2.5rem] lg:leading-[1.35]">
            حقوق شما،{" "}
            <span className="bg-gradient-to-l from-primary via-accent to-accent bg-clip-text text-transparent">
              مسیر روشنی
            </span>{" "}
            دارد
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted sm:text-base sm:leading-8">
            با یک حساب دادبان؛ وکیل متخصص، پیگیری شفاف پرونده و دستیار حقوقی هوشمند — همه در یک‌جا.
          </p>
          <p className="sr-only">{SITE_TAGLINE}</p>

          {/* چیپ‌های اعتماد */}
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
            {TRUST.map((t, i) => (
              <li
                key={t.label}
                className="animate-fade-up flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2.5 text-xs font-extrabold text-foreground-soft shadow-sm backdrop-blur transition-colors hover:border-accent/40"
                style={{ animationDelay: `${0.15 + i * 0.1}s` }}
              >
                <Icon name={t.icon} className="h-4 w-4 text-accent" />
                {t.label}
              </li>
            ))}
          </ul>

          {/* مارکی بی‌نهایت تخصص‌ها */}
          <div className="mt-8 w-full max-w-md lg:max-w-none">
            <p className="mb-3 text-[11px] font-bold text-muted-soft">
              وکیل متخصص، در هر حوزه‌ای که فکرش را بکنید
            </p>
            <div className="auth-marquee-mask overflow-hidden" dir="ltr">
              <div className="auth-marquee flex w-max items-center gap-2.5 py-1">
                {[...SPECIALTIES, ...SPECIALTIES].map((s, i) => (
                  <span
                    key={`${s}-${i}`}
                    aria-hidden={i >= SPECIALTIES.length}
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface/60 px-3.5 py-1.5 text-[11px] font-bold text-muted backdrop-blur transition-colors hover:border-accent/40 hover:text-foreground"
                  >
                    <Icon name="gavel" className="h-3 w-3 text-accent/70" />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── سمت فرم: کارت شیشه‌ای با حاشیه گرادیانی چرخان + اسپات‌لایت ── */}
        <SpotlightCard className="auth-spotlight relative mx-auto min-w-0 w-full max-w-md rounded-[28px] lg:max-w-none">
          <div className="relative overflow-hidden rounded-[28px] p-px">
            {/* حاشیه استاتیک پایه + لایه کنیک چرخان روی آن */}
            <div aria-hidden className="absolute inset-0 bg-border" />
            <div aria-hidden className="absolute inset-0 grid place-items-center">
              <div className="auth-spin-layer aspect-square w-[280%]" />
            </div>

            {/* بدنه شیشه‌ای کارت */}
            <div className="relative rounded-[27px] bg-surface/85 p-6 shadow-[var(--shadow-lift)] backdrop-blur-2xl sm:p-8">
              <AuthPanel initialMode={mode} />
              <p className="mt-5 rounded-2xl border border-border bg-surface-2/50 p-3 text-center text-[10px] leading-5 text-muted">
                با ورود یا ثبت‌نام،{" "}
                <Link href="/legal/terms" className="font-bold text-primary hover:underline">
                  قوانین و مقررات
                </Link>{" "}
                و{" "}
                <Link href="/legal/privacy" className="font-bold text-primary hover:underline">
                  حریم خصوصی
                </Link>{" "}
                دادبان را می‌پذیرید.
              </p>
            </div>
          </div>
        </SpotlightCard>
      </Container>
    </main>
  );
}
