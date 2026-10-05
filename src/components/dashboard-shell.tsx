import type { ReactNode } from "react";
import Link from "next/link";
import { Container, Button, Avatar } from "./ui";
import { Icon } from "./icons";
import { BackButton } from "./back-button";
import { TodayChip } from "./today-chip";
import type { IconKey } from "@/lib/data";

/**
 * پوستهٔ گرافیکی پنل‌ها (وکیل / موکل):
 *  - بنر گرادیانی با آواتار، تاریخ شمسی امروز، دکمهٔ بازگشت و خروج
 *  - منوی کناری گرافیکی با آیتم فعال گرادیانی و چیپ آیکونی
 */
export function DashboardShell({
  role,
  title,
  nav,
  children,
  name,
  back,
}: {
  role: "موکل" | "وکیل";
  title: string;
  /** href-when-present = real link; otherwise a plain label (لا Buttons مرده) */
  nav: { label: string; icon: IconKey; active?: boolean; badge?: string; href?: string }[];
  children: ReactNode;
  /** نام کاربر برای سلام اختصاصی + آواتار */
  name?: string;
  /** دکمهٔ بازگشت — برای زیرصفحه‌ها (fallback مقصدی که اگر تاریخچه نبود می‌رود) */
  back?: { fallback?: string; label?: string };
}) {
  const isLawyer = role === "وکیل";

  return (
    <Container className="py-6 sm:py-8">
      {/* ───── بنر گرافیکی پنل ───── */}
      <section
        data-testid="panel-hero"
        className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-bl from-primary-hover via-primary to-primary-hover p-5 text-primary-foreground card-shadow sm:p-7"
      >
        {/* تزیینات — هالهٔ طلایی، دایرهٔ محو و شبکهٔ نقطه‌ای */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--accent), transparent)" }}
        />
        <span aria-hidden className="pointer-events-none absolute -right-10 bottom-[-80px] h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {back && <BackButton fallback={back.fallback} label={back.label ?? "بازگشت"} />}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
                <Icon name={isLawyer ? "badge" : "user"} className="h-3.5 w-3.5" aria-hidden />
                پنل {role}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TodayChip className="hidden text-xs text-white/75 sm:inline-flex" />
              <Button
                href="/api/auth/logout"
                variant="ghost"
                size="sm"
                icon="x"
                className="!text-white/90 hover:!bg-white/15 hover:!text-white"
                data-testid="logout-button"
              >
                خروج
              </Button>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4">
            {name && (
              <span className="rounded-2xl ring-2 ring-white/35" aria-hidden>
                <Avatar name={name} color={isLawyer ? "#b07d12" : "#3f5f8a"} size="lg" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm text-white/80">{name ? `سلام، ${name}` : "خوش آمدید"}</p>
              <h1 className="mt-0.5 truncate text-xl font-extrabold sm:text-2xl">{title}</h1>
            </div>
          </div>
        </div>
      </section>

      {/* ───── بدنه: منوی کناری + محتوا ───── */}
      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <nav
            aria-label={`منوی پنل ${role}`}
            className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-surface p-2 card-shadow lg:flex-col"
          >
            {nav.map((n) => {
              const cls = `group flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                n.active
                  ? "bg-gradient-to-l from-primary to-primary-hover text-primary-foreground shadow-[0_8px_20px_-8px_rgb(var(--shadow-color)/0.55)]"
                  : "text-foreground-soft hover:bg-surface-2"
              }`;
              const inner = (
                <>
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      n.active ? "bg-white/20 text-current" : "bg-surface-2 text-foreground-soft group-hover:bg-primary-soft group-hover:text-primary"
                    }`}
                  >
                    <Icon name={n.icon} className="h-4 w-4" />
                  </span>
                  {n.label}
                  {n.badge && (
                    <span
                      className={`mr-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        n.active ? "bg-white/25 text-white" : "bg-accent-soft text-accent-text"
                      }`}
                    >
                      {n.badge}
                    </span>
                  )}
                </>
              );
              return n.href ? (
                <Link key={n.label} href={n.href} className={cls} aria-current={n.active ? "page" : undefined}>
                  {inner}
                </Link>
              ) : (
                <button key={n.label} type="button" className={`${cls} cursor-default opacity-70`} aria-disabled>
                  {inner}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </Container>
  );
}
