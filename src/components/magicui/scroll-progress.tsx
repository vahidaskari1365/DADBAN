"use client";

import { motion, useScroll, type MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Magic UI — ScrollProgress
 * نوار پیشرفت اسکرول در بالای صفحه. تطبیق دادورزان:
 * - در RTL نوار از سمت راست پر می‌شود (origin-right) و گرادیان به‌سمت چپ.
 * - رنگ‌ها از توکن‌های سایت (طلایی/سرمه‌ای) گرفته شده‌اند.
 */
export interface ScrollProgressProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, keyof MotionProps> {
  ref?: React.Ref<HTMLDivElement>;
}

export function ScrollProgress({ className, ref, ...props }: ScrollProgressProps) {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      ref={ref}
      className={cn(
        "fixed inset-x-0 top-0 z-[70] h-0.5 origin-right bg-gradient-to-l from-accent via-accent-text to-primary",
        className,
      )}
      style={{ scaleX: scrollYProgress }}
      {...props}
    />
  );
}
