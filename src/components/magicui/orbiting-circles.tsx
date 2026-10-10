"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Magic UI — OrbitingCircles
 * آیکون‌هایی که مدار دور مرکز می‌زنند (فقط CSS — keyframes orbit در globals.css).
 * سرور-سیف؛ path حلقهٔ مدار را می‌کشد.
 */
export interface OrbitingCirclesProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  reverse?: boolean;
  /** مدت یک دور (ثانیه) */
  duration?: number;
  delay?: number;
  /** شعاع مدار (px) */
  radius?: number;
  /** نمایش خط مدار */
  path?: boolean;
  iconSize?: number;
  speed?: number;
}

export function OrbitingCircles({
  className,
  children,
  reverse,
  duration = 20,
  radius = 160,
  path = true,
  iconSize = 30,
  speed = 1,
  ...props
}: OrbitingCirclesProps) {
  const calculatedDuration = duration / speed;
  return (
    <>
      {path && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden
        >
          <circle
            className="stroke-black/10 stroke-1 dark:stroke-white/10"
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
          />
        </svg>
      )}
      {React.Children.map(children, (child, index) => {
        const angle = (360 / (React.Children.count(children) || 1)) * index;
        return (
          <div
            style={
              {
                "--duration": calculatedDuration,
                "--radius": radius,
                "--angle": angle,
                "--icon-size": `${iconSize}px`,
              } as React.CSSProperties
            }
            className={cn(
              "animate-orbit absolute flex size-(--icon-size) transform-gpu items-center justify-center rounded-full",
              { "[animation-direction:reverse]": reverse },
              className,
            )}
            {...props}
          >
            {child}
          </div>
        );
      })}
    </>
  );
}
