import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { TrustLine } from "./trust-line";

/**
 * HowItWorks — «چطور کار می‌کند؟» سه‌مرحله‌ای به سبک آمازون.
 * هدف: کاهش ابهام مسیر (بفهمه سایت). کاربر در ۵ ثانیه باید بفهمد از کجا شروع کند.
 */
const STEPS = [
  {
    n: "۱",
    icon: "chat" as const,
    title: "نیازت را بنویس",
    desc: "در چند سؤال ساده بگو چه کمکی می‌خواهی؛ کمتر از ۲ دقیقه طول می‌کشد.",
  },
  {
    n: "۲",
    icon: "search" as const,
    title: "بهترین گزینه را مقایسه کن",
    desc: "وکلای راستی‌آزمایی‌شده با امتیاز واقعی، سابقه و تعرفه شفاف به تو معرفی می‌شوند.",
  },
  {
    n: "۳",
    icon: "shield" as const,
    title: "با اطمینان شروع کن",
    desc: "پرداخت امن داخل سایت، پیگیری آنلاین روند کار و ضمانت بازگشت وجه.",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-title" className="rounded-3xl border border-border bg-surface p-6 card-shadow sm:p-10">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-bold text-accent-text">
          <Icon name="bolt" className="h-3.5 w-3.5" />
          ساده مثل ۱، ۲، ۳
        </span>
        <h2 id="how-it-works-title" className="mt-3 text-2xl font-black text-foreground sm:text-3xl">
          چطور کار می‌کند؟
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted">
          از ثبت درخواست تا شروع کار، همه‌چیز آنلاین و شفاف است.
        </p>
      </div>

      <ol className="relative mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
        {/* خط اتصال دسکتاپ */}
        <span aria-hidden className="absolute inset-x-16 top-7 hidden border-t-2 border-dashed border-border sm:block" />
        {STEPS.map((s) => (
          <li key={s.n} className="relative flex flex-col items-center text-center">
            <span className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-black text-primary-foreground shadow-[var(--shadow-lift)]">
              {s.n}
            </span>
            <Icon name={s.icon} className="mt-4 h-6 w-6 text-primary" />
            <h3 className="mt-2 text-base font-bold text-foreground">{s.title}</h3>
            <p className="mt-1.5 max-w-xs text-xs leading-6 text-muted">{s.desc}</p>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button href="/lawyers" icon="search">پیدا کردن وکیل</Button>
        <Button href="/case/new" variant="outline" icon="folder">ثبت پرونده</Button>
      </div>
      <TrustLine className="mt-5" compact />
    </section>
  );
}
