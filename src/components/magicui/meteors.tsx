import React from "react";
import { cn } from "@/lib/utils";

/**
 * Magic UI — Meteors
 * بارش شهاب — فقط CSS (keyframes meteor در globals.css).
 * تطبیق دادورزان:
 * - پشتیبانی از رنگ دلخواه با ‎--meteor-color (پیش‌فرض muted).
 * - به‌جای Math.random در رندر، پراکندگیِ deterministic از شاخص ساخته می‌شود
 *   (قانون purity ری‌اکت + hydration-safe + رندر سرور).
 * - با prefers-reduced-motion انیمیشن خاموش می‌شود (قانون در globals.css).
 */
export interface MeteorsProps {
  number?: number;
  minDelay?: number;
  maxDelay?: number;
  minDuration?: number;
  maxDuration?: number;
  /** زاویهٔ سقوط (درجه) */
  angle?: number;
  /** رنگ سر و دنبالهٔ شهاب (هر مقدار CSS) */
  color?: string;
  className?: string;
}

/** شبه‌تصادف deterministic از شاخص — خروجی پایدار بین سرور و کلاینت */
function pseudoRandom(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function Meteors({
  number = 20,
  minDelay = 0.2,
  maxDelay = 1.2,
  minDuration = 2,
  maxDuration = 10,
  angle = 215,
  color = "var(--muted-soft, #71717a)",
  className,
}: MeteorsProps) {
  return (
    <>
      {Array.from({ length: number }, (_, i) => {
        const delay = minDelay + pseudoRandom(i, 1) * (maxDelay - minDelay);
        const duration = minDuration + pseudoRandom(i, 2) * (maxDuration - minDuration);
        const left = pseudoRandom(i, 3) * 100;
        return (
          // سر شهاب
          <span
            key={i}
            aria-hidden
            style={
              {
                "--angle": `${-angle}deg`,
                "--meteor-color": color,
                top: "-5%",
                left: `${left}%`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
              } as React.CSSProperties
            }
            className={cn(
              "animate-meteor pointer-events-none absolute size-0.5 rotate-(--angle) rounded-full bg-(--meteor-color) shadow-[0_0_0_1px_#ffffff10]",
              className,
            )}
          >
            {/* دنبالهٔ شهاب */}
            <div className="pointer-events-none absolute top-1/2 -z-10 h-px w-12.5 -translate-y-1/2 bg-gradient-to-r from-(--meteor-color) to-transparent" />
          </span>
        );
      })}
    </>
  );
}
