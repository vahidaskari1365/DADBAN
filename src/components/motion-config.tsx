"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * MotionConfig سراسری — قانون reduced-motion اسکیل‌های a11y:
 * reducedMotion="user" یعنی همهٔ انیمیشن‌های framer-motion (transform/scale/x/y)
 * وقتی کاربر «کاهش حرکت» را در OS فعال کرده است غیرفعال می‌شوند؛
 * فقط opacity باقی می‌ماند (الگوی توصیه‌شدهٔ WCAG 2.2.2).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
