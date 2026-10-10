import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Container } from "./ui";
import { Icon } from "./icons";
import type { IconKey } from "@/lib/data";

/**
 * هیروی مشترک صفحات داخلی.
 * variant «market»: پنل سرمه‌ای تیره با بافت نقطه‌ای، هالهٔ طلایی و چیپ‌های
 * شناور پیشنهاد — مخصوص «بازار پروژه‌ها» (/case-board). در هر دو تم تیره است
 * تا متن سفید همیشه کنتراست بالا داشته باشد.
 */
export function PageHero({
  title,
  desc,
  breadcrumb,
  children,
  badge,
  variant = "default",
  chips,
}: {
  title: string;
  desc?: string;
  breadcrumb?: { label: string; href?: string }[];
  children?: ReactNode;
  badge?: string;
  variant?: "default" | "market";
  chips?: { icon: IconKey; label: string }[];
}) {
  if (variant === "market") {
    return (
      <section className="relative py-8 sm:py-10">
        <Container className="relative">
          <div className="hero-market relative overflow-hidden rounded-3xl px-5 py-10 sm:px-10 sm:py-14">
            {/* بافت نقطه‌ای محو — فقط تزئینی (عکس پس‌زمینه: تالار مزایده با ترازو و چکش) */}
            <div aria-hidden className="hero-market-dots pointer-events-none absolute inset-0" />
            {/* پردهٔ تکمیلی فقط موبایل — چون متن در عرض کم تقریباً کل پنل را می‌پوشاند */}
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[rgb(13_34_62/0.38)] sm:bg-transparent" />
            {/* چیپ‌های شناور نمونهٔ پیشنهاد — فقط دسکتاپ، صرفاً تزئینی */}
            {chips?.map((c, i) => (
              <MarketChip key={i} icon={c.icon} label={c.label} index={i} />
            ))}
            <div className="relative">
              {breadcrumb && (
                <nav className="flex flex-wrap items-center gap-1.5 text-xs text-white/65">
                  {breadcrumb.map((b, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      {i > 0 && <Icon name="chevron" className="h-3 w-3 rotate-180 text-white/40" />}
                      {b.href ? (
                        <Link href={b.href} className="transition-colors hover:text-white">{b.label}</Link>
                      ) : (
                        <span className="text-white/90">{b.label}</span>
                      )}
                    </span>
                  ))}
                </nav>
              )}
              {badge && (
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[rgb(230_185_78/0.35)] bg-[rgb(230_185_78/0.14)] px-3 py-1 text-xs font-semibold text-[#eec97b]">
                  <Icon name="sparkles" className="h-3.5 w-3.5" /> {badge}
                </span>
              )}
              <h1 className="mt-3 max-w-3xl text-balance text-2xl font-extrabold leading-snug text-white sm:text-3xl md:text-4xl md:leading-[1.35]">
                {title}
              </h1>
              {desc && <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">{desc}</p>}
              {children && <div className="mt-6">{children}</div>}
            </div>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-surface-2/70 to-background py-10">
      <div
        className="pointer-events-none absolute -top-20 right-[10%] h-56 w-56 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--accent), transparent)" }}
      />
      <Container className="relative">
        {breadcrumb && (
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <Icon name="chevron" className="h-3 w-3 rotate-180" />}
                {b.href ? (
                  <Link href={b.href} className="hover:text-primary">{b.label}</Link>
                ) : (
                  <span className="text-foreground-soft">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {badge && (
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">
            <Icon name="sparkles" className="h-3.5 w-3.5" /> {badge}
          </span>
        )}
        <h1 className="mt-3 max-w-3xl text-balance text-2xl font-extrabold text-foreground sm:text-3xl md:text-4xl">
          {title}
        </h1>
        {desc && <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">{desc}</p>}
        {children && <div className="mt-6">{children}</div>}
      </Container>
    </section>
  );
}

/** چیپ شناور نمونهٔ پیشنهاد در هیروی بازار — سه موقعیت ثابت با چرخش و تأخیر متفاوت */
const MARKET_CHIP_STYLES = [
  { pos: "top-12 end-4 sm:end-8", rot: "-5deg", cls: "" },
  { pos: "top-[45%] end-8 sm:end-40", rot: "2.5deg", cls: "hero-chip-2" },
  { pos: "bottom-10 end-16 sm:end-20", rot: "-2deg", cls: "hero-chip-3" },
] as const;

function MarketChip({ icon, label, index }: { icon: IconKey; label: string; index: number }) {
  const s = MARKET_CHIP_STYLES[index % MARKET_CHIP_STYLES.length];
  return (
    <span
      aria-hidden
      className={`hero-chip pointer-events-none absolute hidden items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white/90 backdrop-blur-sm lg:flex ${s.pos} ${s.cls}`}
      style={{ "--chip-rot": s.rot } as CSSProperties}
    >
      <Icon name={icon} className="h-4 w-4 shrink-0 text-[#eec97b]" />
      {label}
    </span>
  );
}
