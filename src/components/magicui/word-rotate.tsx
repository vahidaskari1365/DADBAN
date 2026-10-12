"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, type MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Magic UI — WordRotate
 * چرخش کلمات با انیمیشن عمودی.
 * تطبیق دادورزان:
 * - به‌جای h1 با span اینلاین رندر می‌شود تا داخل تیترهای چندجزئی قابل استفاده باشد.
 * - کانتینر inline-grid است؛ علاوه بر کلمهٔ فعلی، یک «سایزِر» نامرئی با
 *   پهن‌ترین کلمه در همان سلول نشسته تا عرض همیشه ثابت بماند و h1 هنگام
 *   تعویض کلمه پرش چیدمان (layout shift) نداشته باشد.
 * - initial=false → اولین کلمه بدون فلش، hydration-safe.
 */
export interface WordRotateProps {
  words: string[];
  duration?: number;
  motionProps?: MotionProps;
  className?: string;
}

export function WordRotate({
  words,
  duration = 2500,
  motionProps = {
    initial: { opacity: 0, y: "60%" },
    animate: { opacity: 1, y: "0%" },
    exit: { opacity: 0, y: "-60%" },
    transition: { duration: 0.28, ease: "easeOut" },
  },
  className,
}: WordRotateProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, duration);
    return () => clearInterval(interval);
  }, [words, duration]);

  return (
    <span className="inline-grid overflow-hidden align-bottom [grid-template-areas:'stack']">
      {/* سایزِر نامرئی — عرض کانتینر را برابر پهن‌ترین کلمه نگه می‌دارد */}
      <span aria-hidden className="invisible [grid-area:stack] whitespace-nowrap">
        {words.reduce((a, b) => (b.length > a.length ? b : a), words[0] ?? "")}
      </span>
      <AnimatePresence initial={false}>
        <motion.span
          key={words[index]}
          className={cn("inline-block [grid-area:stack] whitespace-nowrap", className)}
          {...motionProps}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
