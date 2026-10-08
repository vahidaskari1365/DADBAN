import Link from "next/link";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getT } from "@/lib/i18n/server";

/**
 * FeeBanner — بنر برجستهٔ «حق‌الوکاله و پرداخت قسطی» در صفحهٔ اول.
 * Server Component و بدون هیچ JS — همهٔ موشن سینمایی با CSS خالص انجام می‌شود:
 * گرادیان متحرک پس‌زمینه، نورِ لغزان (light sweep)، ذرات طلایی معلق،
 * تاب‌خوردن ظریف ترازو و ورود پله‌ای متن‌ها (staggered entrance).
 * با prefers-reduced-motion همهٔ حرکت‌ها غیرفعال می‌شوند (globals.css).
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
        {/* لایهٔ ۱ — تنفس گرادیان پس‌زمینه (سینمایی، بسیار آهسته) */}
        <div
          aria-hidden
          className="fee-cine-bg pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, transparent 30%, color-mix(in oklab, var(--accent) 18%, transparent) 50%, transparent 72%)",
            backgroundSize: "220% 220%",
          }}
        />
        {/* لایهٔ ۲ — نورِ لغزان قطری (هر چند ثانیه یک‌بار از روی بنر می‌گذرد) */}
        <span aria-hidden className="fee-cine-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3" />
        {/* لایهٔ ۳ — ذرات طلایی معلق (نماد سکه‌ها) */}
        <span aria-hidden className="fee-cine-p fee-cine-p1" />
        <span aria-hidden className="fee-cine-p fee-cine-p2" />
        <span aria-hidden className="fee-cine-p fee-cine-p3" />
        <span aria-hidden className="fee-cine-p fee-cine-p4" />
        <span aria-hidden className="fee-cine-p fee-cine-p5" />
        <span aria-hidden className="fee-cine-p fee-cine-p6" />

        {/* نقش پس‌زمینهٔ ترازو — تزئینی، با تاب‌خوردن ظریف مثل ترازوی واقعی */}
        <Icon
          name="balance"
          aria-hidden
          className="fee-cine-swing pointer-events-none absolute -left-6 -top-6 h-28 w-28 text-primary-foreground opacity-[0.09] sm:-left-8 sm:-top-8 sm:h-44 sm:w-44"
        />

        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <div className="min-w-0 flex-1">
            <p className="fee-cine-in fee-cine-d1 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-primary-foreground ring-1 ring-white/25 sm:text-[11px]">
              <Icon name="balance" className="h-3.5 w-3.5" />
              {t("ویژهٔ موکلان دادبان")}
            </p>
            <h2 className="fee-cine-in fee-cine-d2 mt-2 text-balance text-lg font-black leading-7 text-primary-foreground sm:text-2xl sm:leading-9">
              {t("نگران هزینهٔ حق‌الوکاله نباشید")}
            </h2>
            <p className="fee-cine-in fee-cine-d3 mt-2 max-w-2xl text-pretty text-[13px] leading-6 text-primary-foreground/85 sm:text-sm sm:leading-7">
              {t(
                "اگر پرداخت حق‌الوکاله برایتان دشوار است، دیگر نگران نباشید — دادبان پرداخت قسطی و مرحله‌ای را ممکن کرده است تا پرونده‌تان همین امروز شروع شود.",
              )}
            </p>
          </div>
          {/* CTA — موبایل: تمام‌عرض و وسط‌چین؛ دسکتاپ: جمع‌وجور */}
          <div className="fee-cine-in fee-cine-d4 flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:shrink-0 sm:items-center">
            <span className="fee-cine-glow inline-flex rounded-xl">
              <Button href="/fee-payment" variant="accent" size="lg" icon="balance" className="w-full justify-center sm:w-auto">
                {t("شرایط پرداخت قسطی")}
              </Button>
            </span>
            <Link
              href="/fee-payment#how"
              className="inline-flex min-h-11 items-center justify-center gap-1 px-1 text-xs font-semibold text-primary-foreground/75 transition-colors hover:text-primary-foreground sm:justify-start"
            >
              {t("پرداخت قسطی چطور کار می‌کند؟")}
              <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* نوار طلایی پایین — لهجهٔ برند با درخشش متحرک */}
        <span
          aria-hidden
          className="fee-cine-shimmer pointer-events-none absolute inset-x-0 bottom-0 h-1"
          style={{
            background:
              "linear-gradient(to left, var(--accent), color-mix(in oklab, var(--accent) 40%, transparent))",
            backgroundSize: "200% 100%",
          }}
        />
      </div>
    </section>
  );
}
