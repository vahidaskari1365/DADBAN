import Link from "next/link";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getT } from "@/lib/i18n/server";

/**
 * FeeBanner — بنر برجستهٔ «حق‌الوکاله و پرداخت قسطی» در صفحهٔ اول.
 * عمداً Server Component و بدون هیچ انیمیشن JS (فقط استایل ایستا + هاور CSS)
 * تا رندر سروری امن باشد؛ گرادیان سرمه‌ای → طلاییِ ظریف با توکن‌های برند.
 */
export async function FeeBanner() {
  const t = await getT();
  return (
    <section aria-label={t("حق‌الوکاله و پرداخت قسطی")}>
      <div
        className="relative overflow-hidden rounded-3xl border border-border card-shadow"
        style={{
          background:
            "linear-gradient(105deg, var(--primary) 55%, color-mix(in oklab, var(--accent) 26%, var(--primary)) 100%)",
        }}
      >
        {/* نقش پس‌زمینهٔ ترازو — تزئینی */}
        <Icon
          name="balance"
          aria-hidden
          className="pointer-events-none absolute -left-8 -top-8 h-44 w-44 rotate-[-8deg] text-primary-foreground opacity-10"
        />
        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-4 p-6 sm:p-8">
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-primary-foreground ring-1 ring-white/25">
              <Icon name="balance" className="h-3.5 w-3.5" />
              {t("ویژهٔ موکلان دادبان")}
            </p>
            <h2 className="mt-2 text-xl font-black text-primary-foreground sm:text-2xl">
              {t("نگران هزینهٔ حق‌الوکاله نیستید؟")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-primary-foreground/85">
              {t(
                "اگر پرداخت حق‌الوکاله برایتان دشوار است، دیگر نگران نباشید — دادبان پرداخت قسطی و مرحله‌ای را ممکن کرده است تا پرونده‌تان همین امروز شروع شود.",
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-center">
            <Button href="/fee-payment" variant="accent" size="lg" icon="balance">
              {t("شرایط پرداخت قسطی")}
            </Button>
            <Link
              href="/fee-payment#how"
              className="inline-flex min-h-11 items-center gap-1 px-1 text-xs font-semibold text-primary-foreground/75 transition-colors hover:text-primary-foreground"
            >
              {t("پرداخت قسطی چطور کار می‌کند؟")}
              <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        {/* نوار طلایی پایین — لهجهٔ برند */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1"
          style={{
            background:
              "linear-gradient(to left, var(--accent), color-mix(in oklab, var(--accent) 40%, transparent))",
          }}
        />
      </div>
    </section>
  );
}
