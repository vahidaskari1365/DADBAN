"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ElementType,
} from "react";

export type RevealVariant = "up" | "blur" | "start" | "zoom" | "fade";

/**
 * Lightweight scroll-reveal using IntersectionObserver.
 * No external deps → keeps the bundle small and the site fast.
 *
 * variantهای سینمایی:
 *  - up    (پیش‌فرض): ورود از پایین
 *  - blur  : محو سینمایی (blur + scale + translateY)
 *  - start : ورود از سمت راست (ابتدای محور در RTL)
 *  - zoom  : بزرگ‌نمایی ملایم
 *  - fade  : فقط محو
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
  variant = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
  variant?: RevealVariant;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Component = Tag as ElementType;
  return (
    <Component
      ref={ref}
      className={`reveal ${variant !== "up" ? `reveal-${variant}` : ""} ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  );
}
