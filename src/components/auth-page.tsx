import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AuthPanel } from "@/components/auth-panel";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/brand";

const FEATURES = [
  {
    icon: "badge" as const,
    title: "وکلای احراز هویت‌شده",
    desc: "هویت و پروانه پایه یک همه وکلا توسط کارشناسان راستی‌آزمایی می‌شود.",
  },
  {
    icon: "folder" as const,
    title: "پیگیری شفاف پرونده",
    desc: "مراحل پرونده، اسناد و جلسات؛ همه‌چیز در پنل شخصی شما.",
  },
  {
    icon: "sparkles" as const,
    title: "دستیار حقوقی هوشمند",
    desc: "پاسخ سریع ۲۴ ساعته با استناد به قوانین و مقررات.",
  },
];

/**
 * قالب مشترک صفحات ورود / ثبت‌نام — سراسرصفحه، با لوگو و پنل تب‌دار
 */
export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const heading =
    mode === "login"
      ? { title: "به خانواده دادبان خوش آمدید", sub: "حساب خود را وارد کنید تا مسیر حقوقی‌تان را با خیال آسوده ادامه دهید." }
      : { title: "حقوق شما، مسیر روشن", sub: "ثبت‌نام رایگان در دقیقه‌ای کوتاه؛ پرونده‌تان را هوشمند پیش ببرید." };

  return (
    <main className="relative overflow-hidden">
      {/* ── پس‌زمینه امبیِنت: هاله‌های رنگی + شبکه نقطه‌ای ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-[8%] h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/4 -left-28 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-[-6rem] right-[38%] h-96 w-96 rounded-full bg-accent-soft/70 blur-3xl" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, var(--border-strong, var(--border)) 1px, transparent 0)",
            backgroundSize: "26px 26px",
            maskImage: "radial-gradient(ellipse 90% 70% at 50% 0%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 0%, black, transparent)",
          }}
        />
      </div>

      <Container className="relative grid items-center gap-10 py-12 lg:min-h-[calc(100svh-4.5rem)] lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-14">
        {/* ── سمت برند: لوگو + ارزش‌ها ── */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-right">
          <div className="relative">
            <div aria-hidden className="absolute -inset-7 rounded-[3rem] bg-accent/15 blur-2xl" />
            <div className="relative w-36 rounded-[2rem] bg-white p-3 shadow-2xl ring-1 ring-black/5 animate-scale-in sm:w-44 lg:w-48">
              <Image
                src="/logo1.png"
                alt={`لوگوی ${SITE_NAME}`}
                width={512}
                height={512}
                priority
                sizes="(min-width: 1024px) 192px, (min-width: 640px) 176px, 144px"
                className="h-auto w-full rounded-[1.5rem]"
              />
            </div>
            {/* بج‌های شناور */}
            <div className="absolute -right-4 top-5 hidden items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[10px] font-extrabold text-primary shadow-lg ring-1 ring-border animate-fade-in sm:flex [animation-delay:.2s]">
              <Icon name="badge" className="h-3.5 w-3.5 text-accent" />
              احراز هویت‌شده
            </div>
            <div className="absolute -left-5 bottom-7 hidden items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[10px] font-extrabold text-primary shadow-lg ring-1 ring-border animate-fade-in sm:flex [animation-delay:.35s]">
              <Icon name="clock" className="h-3.5 w-3.5 text-accent" />
              پشتیبانی ۲۴/۷
            </div>
          </div>

          <h1 className="mt-8 max-w-lg text-2xl font-black leading-[1.5] text-foreground sm:text-3xl sm:leading-[1.5]">
            {heading.title.includes("دادبان") ? (
              <>
                {heading.title.split("دادبان")[0]}
                <span className="text-accent">دادبان</span>
                {heading.title.split("دادبان")[1]}
              </>
            ) : (
              heading.title
            )}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-7 text-muted">{heading.sub}</p>
          <p className="sr-only">{SITE_TAGLINE}</p>

          <ul className="mt-8 hidden w-full max-w-md flex-col gap-3 lg:flex">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface/70 px-4 py-3 backdrop-blur-sm transition-colors hover:border-primary/30"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <span className="flex flex-col text-right">
                  <span className="text-sm font-bold text-foreground">{f.title}</span>
                  <span className="mt-0.5 text-xs leading-6 text-muted">{f.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── سمت فرم: کارت شیشه‌ای ── */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div aria-hidden className="absolute -inset-3 rounded-[2.5rem] bg-gradient-to-b from-primary/10 via-transparent to-accent/10 blur-xl" />
          <div className="relative rounded-3xl border border-border bg-surface/85 p-6 shadow-[var(--shadow-lift)] backdrop-blur-xl sm:p-8">
            <AuthPanel initialMode={mode} />
            <p className="mt-5 rounded-xl bg-surface-2/60 p-3 text-center text-[10px] leading-5 text-muted">
              با ورود یا ثبت‌نام، <Link href="/legal/terms" className="font-bold text-primary hover:underline">قوانین و مقررات</Link> و{" "}
              <Link href="/legal/privacy" className="font-bold text-primary hover:underline">حریم خصوصی</Link> دادبان را می‌پذیرید.
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}
