import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Magic UI — ShineBorder
 * قاب درخشان radial-gradient که background-position آن می‌چرخد (CSS خالص).
 * انیمیشن فقط با prefers-reduced-motion: no-preference اجرا می‌شود
 * (کلاس mui-shine-border در globals.css).
 */
export interface ShineBorderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** ضخامت قاب (px) */
  borderWidth?: number;
  /** مدت یک دور انیمیشن (ثانیه) */
  duration?: number;
  /** رنگ درخشش — تک‌رنگ یا آرایه */
  shineColor?: string | string[];
}

export function ShineBorder({
  borderWidth = 1,
  duration = 14,
  shineColor = "#000000",
  className,
  style,
  ...props
}: ShineBorderProps) {
  return (
    <div
      aria-hidden
      style={
        {
          "--border-width": `${borderWidth}px`,
          "--duration": `${duration}s`,
          backgroundImage: `radial-gradient(transparent,transparent, ${
            Array.isArray(shineColor) ? shineColor.join(",") : shineColor
          },transparent,transparent)`,
          backgroundSize: "300% 300%",
          mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "var(--border-width)",
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        "mui-shine-border pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position]",
        className,
      )}
      {...props}
    />
  );
}
