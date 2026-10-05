import { Reveal } from "@/components/reveal";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";

/**
 * «خدمات حقوقی دادبان» — نشان می‌دهد دادبان یک Legal Services Platform است،
 * نه فقط دایرکتوری وکیل. شش دستهٔ واقعی با مسیرهای واقعی سایت.
 */

const SERVICES: { title: string; desc: string; href: string; icon: IconKey }[] = [
  { title: "مشاوره حقوقی", desc: "متنی، صوتی یا تصویری با وکیل متخصص", href: "/consultation", icon: "chat" },
  { title: "قراردادها", desc: "تنظیم، بررسی ریسک و قراردادساز گام‌به‌گام", href: "/contracts", icon: "document" },
  { title: "دادخواست و شکواییه", desc: "تنظیم تخصصی اسناد قانونی توسط وکیل", href: "/legal-forms", icon: "gavel" },
  { title: "خدمات ثبتی", desc: "ثبت شرکت، برند و علامت تجاری", href: "/pricing", icon: "stamp" },
  { title: "خدمات حقوقی کسب‌وکار", desc: "قراردادهای تجاری و مشاورهٔ B2B", href: "/business", icon: "building" },
  { title: "امور اداری و حضوری", desc: "نمایندهٔ دادبان با وکالت‌نامهٔ رسمی", href: "/services", icon: "landmark" },
];

export function LegalServices() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {SERVICES.map((s, i) => (
        <Reveal key={s.href + s.title} delay={i * 55} variant="start">
          <a
            href={s.href}
            className="group flex h-full items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
              <Icon name={s.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-foreground">{s.title}</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted">{s.desc}</span>
            </span>
            <Icon name="arrow" className="h-4 w-4 shrink-0 text-muted transition-all duration-300 group-hover:-translate-x-1 group-hover:text-accent-text" />
          </a>
        </Reveal>
      ))}
    </div>
  );
}
