import React from "react";
import { cn } from "@/lib/utils";

/**
 * Magic UI — BorderBeam (نسخهٔ CSS خالص دادورزان)
 * پرتو نوری که با offset-path دور قاب کارت می‌چرخد.
 *
 * نکتهٔ فنی مهم: نسخهٔ رسمی Magic UI این افکت را با framer-motion و
 * انیمیشن بی‌نهایت می‌سازد؛ در آزمون A/B مشخص شد که انیمیشن بی‌نهایتِ
 * framer داخل یک section، اجرای whileInView اجزای هم‌سایه را قفل می‌کند
 * (h2 با opacity=0 می‌ماند). این نسخه با keyframes خالص CSS همان جلوه را
 * می‌دهد: سبک‌تر است، سرور-سیف است و هیچ تداخلی با framer-motion ندارد.
 *
 * reduced-motion: پرتو با «کاهش حرکت» کلاً پنهان می‌شود (قانون در globals.css).
 */
export interface BorderBeamProps {
  /** اندازهٔ پرتو (px) */
  size?: number;
  /** مدت یک دور کامل (ثانیه) */
  duration?: number;
  /** تأخیر شروع (ثانیه) */
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
  style?: React.CSSProperties;
  /** جهت برعکس */
  reverse?: boolean;
  /** نقطهٔ شروع روی قاب (۰ تا ۱۰۰) */
  initialOffset?: number;
  /** ضخامت خط قاب */
  borderWidth?: number;
}

export const BorderBeam = ({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1,
}: BorderBeamProps) => {
  return (
    <div
      aria-hidden
      className="mui-beam-mask pointer-events-none absolute inset-0 rounded-[inherit] border-transparent [border-width:var(--border-beam-width)] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)] [mask-composite:intersect] [-webkit-mask-composite:xor] [mask-clip:padding-box,border-box]"
      style={
        {
          "--border-beam-width": `${borderWidth}px`,
        } as React.CSSProperties
      }
    >
      <div
        className={cn(
          "mui-border-beam absolute aspect-square",
          "bg-gradient-to-l from-(--color-from) via-(--color-to) to-transparent",
          className,
        )}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            offsetDistance: `${initialOffset}%`,
            "--color-from": colorFrom,
            "--color-to": colorTo,
            "--beam-duration": `${duration}s`,
            "--beam-delay": `${-delay}s`,
            "--beam-from": reverse ? `${100 - initialOffset}%` : `${initialOffset}%`,
            "--beam-to": reverse ? `${-initialOffset}%` : `${100 + initialOffset}%`,
            animationDirection: reverse ? "reverse" : "normal",
            ...style,
          } as React.CSSProperties
        }
      />
    </div>
  );
};
