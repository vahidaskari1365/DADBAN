import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Magic UI — Marquee
 * نوار بی‌نهایت افقی/عمودی — فقط CSS (animate-marquee در globals.css).
 * سرور-سیف؛ در RTL چون کانتینر dir=rtl است، جهت انیمیشن طبیعی دیده می‌شود.
 */
export interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  /** برعکس‌کردن جهت انیمیشن */
  reverse?: boolean;
  /** توقف موقت هنگام هاور */
  pauseOnHover?: boolean;
  children: React.ReactNode;
  /** انیمیشن عمودی */
  vertical?: boolean;
  /** تعداد تکرار محتوا */
  repeat?: number;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        "group flex gap-(--gap) overflow-hidden p-2 [--duration:40s] [--gap:1rem]",
        {
          "flex-row": !vertical,
          "flex-col": vertical,
        },
        className,
      )}
    >
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={cn("flex shrink-0 justify-around gap-(--gap)", {
              "animate-marquee flex-row": !vertical,
              "animate-marquee-vertical flex-col": vertical,
              "group-hover:[animation-play-state:paused]": pauseOnHover,
              "[animation-direction:reverse]": reverse,
            })}
          >
            {children}
          </div>
        ))}
    </div>
  );
}
