import { Reveal } from "@/components/reveal";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";
import { getT } from "@/lib/i18n/server";

/**
 * «می‌خواهید از کجا شروع کنید؟» — سه مسیر اصلی کاربر:
 * فهمیدن مسئله (UNDERSTAND) ← مشاوره/وکیل (CONSULT) ← انجام کار (EXECUTE)
 * کارت‌های متوسط و بدون تزئین اضافه — هر کارت یک تصمیم.
 */

const PATHS: { title: string; desc: string; cta: string; href: string; icon: IconKey }[] = [
  {
    title: "اول می‌خواهم بدانم چه کار کنم",
    desc: "مسئله‌تان را توضیح دهید و مسیر اولیه را پیدا کنید.",
    cta: "بررسی مسئله",
    href: "/ai-assistant",
    icon: "chat",
  },
  {
    title: "می‌خواهم با وکیل صحبت کنم",
    desc: "وکیل مناسب موضوع و نیازتان را پیدا کنید.",
    cta: "جستجوی وکیل",
    href: "/lawyers",
    icon: "search",
  },
  {
    title: "می‌خواهم کار حقوقی‌ام انجام شود",
    desc: "از قرارداد و دادخواست تا خدمات حقوقی موردنیازتان.",
    cta: "مشاهده خدمات",
    href: "/services",
    icon: "signature",
  },
];

export async function MainPaths() {
  const t = await getT();
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PATHS.map((p, i) => (
        <Reveal key={p.href} delay={i * 80} variant="start">
          <a
            href={p.href}
            className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-110">
              <Icon name={p.icon} className="h-5.5 w-5.5" />
            </span>
            <h3 className="mt-4 text-base font-black leading-7 text-foreground">{t(p.title)}</h3>
            <p className="mt-1.5 flex-1 text-sm leading-7 text-muted">{t(p.desc)}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-all duration-300 group-hover:gap-2.5">
              {t(p.cta)}
              <Icon name="arrow" className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            </span>
          </a>
        </Reveal>
      ))}
    </div>
  );
}
