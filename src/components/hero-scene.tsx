"use client";

import { Icon } from "./icons";

/**
 * صحنهٔ هیروی سرمه‌ای دادپیو — گرادیان سرمه‌ای + الگوی ظریف + هاله‌های طلایی/فیروزه‌ای.
 * مطابق مکاپ: پس‌زمینه تیرهٔ تمام‌عرض با کارت‌های شیشه‌ای اعتماد.
 */
export function HeroScene() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {/* پایهٔ سرمه‌ای گرادیانی */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, #101b35 0%, #17264a 52%, #0b1328 100%)",
        }}
      />

      {/* الگوی ظریف شبکه‌ای (خطوط سفید کم‌رنگ) */}
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 75% 65% at 50% 0%, #000 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 0%, #000 30%, transparent 100%)",
        }}
      />

      {/* هاله‌های طلایی و فیروزه‌ای */}
      <div className="absolute -top-28 right-[10%] h-80 w-80 opacity-30">
        <div
          className="h-full w-full rounded-full blur-[90px]"
          style={{ background: "radial-gradient(closest-side, #d5a84c, transparent)" }}
        />
      </div>
      <div className="absolute top-24 left-[6%] h-72 w-72 opacity-20">
        <div
          className="h-full w-full rounded-full blur-[90px]"
          style={{ background: "radial-gradient(closest-side, #7fd8ee, transparent)" }}
        />
      </div>
      <div className="absolute bottom-0 left-1/3 h-56 w-72 opacity-15">
        <div
          className="h-full w-full rounded-full blur-[100px]"
          style={{ background: "radial-gradient(closest-side, #d5a84c, transparent)" }}
        />
      </div>

      {/* محوشدگی ملایم به رنگ پس‌زمینهٔ صفحه در لبهٔ پایین */}
      <div
        className="absolute inset-x-0 bottom-0 h-20"
        style={{ background: "linear-gradient(to top, var(--background), transparent)" }}
      />

      {/* کارت‌های شیشه‌ای اعتماد */}
      <FloatCard className="right-[4%] top-[22%] hidden xl:flex" icon="badge" title="وکلای تأییدشده" sub="پروانه راستی‌آزمایی‌شده" />
      <FloatCard className="left-[4%] top-[30%] hidden lg:flex" icon="lock" title="محرمانگی اطلاعات" sub="رمزنگاری‌شده" />
      <FloatCard className="right-[8%] bottom-[14%] hidden lg:flex" icon="bolt" title="پاسخ‌گویی سریع" sub="در کمتر از یک ساعت" />
      <FloatCard className="left-[7%] bottom-[18%] hidden xl:flex" icon="document" title="قرارداد الکترونیکی" sub="امضای برخط" />

      {/* نشانگر اسکرول */}
      <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 md:flex">
        <span className="text-[10px] font-medium text-white/50">برای کشف، اسکرول کنید</span>
        <span className="flex h-9 w-5 items-start justify-center rounded-full border-2 border-white/30 p-1">
          <span className="h-2 w-1 rounded-full bg-white/60 animate-scroll-cue" />
        </span>
      </div>
    </div>
  );
}

function FloatCard({
  className,
  icon,
  title,
  sub,
}: {
  className?: string;
  icon: "badge" | "star" | "bolt" | "lock" | "document";
  title: string;
  sub: string;
}) {
  return (
    <div className={`absolute ${className}`}>
      <div className="flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/[0.08] px-3.5 py-2.5 shadow-[0_12px_35px_rgba(6,12,27,.45)] backdrop-blur-md">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(213,168,76,.16)] text-[color:var(--gold)]">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-xs font-bold text-white">{title}</p>
          <p className="text-[10px] text-white/55">{sub}</p>
        </div>
      </div>
    </div>
  );
}
