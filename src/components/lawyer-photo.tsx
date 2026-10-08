"use client";

import { useState } from "react";
import Image from "next/image";
import { useT } from "@/lib/i18n/provider";

/**
 * عکس پروفایل وکیل — اگر عکس موجود باشد نمایش داده می‌شود،
 * وگرنه fallback به آواتار حروف اول نام (هماهنگ با استایل فعلی سایت).
 */
export function LawyerPhoto({
  name,
  color,
  photoUrl,
  size = "md",
  className = "",
}: {
  name: string;
  color: string;
  photoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const t = useT();
  const showPhoto = !!photoUrl && !failed;

  const sizes: Record<string, string> = {
    xs: "h-8 w-8 text-[10px]",
    sm: "h-10 w-10 text-sm",
    md: "h-14 w-14 text-base",
    lg: "h-20 w-20 text-xl",
    xl: "h-24 w-24 text-2xl",
  };
  const px: Record<string, number> = { xs: 32, sm: 40, md: 56, lg: 80, xl: 96 };

  if (!showPhoto) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-2xl font-bold text-white shadow-sm ${sizes[size]} ${className}`}
        style={{ background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 55%, #000))` }}
        aria-hidden
      >
        {name.trim().split(" ").slice(-2).map((w) => w[0]).join("")}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-2xl shadow-sm ${sizes[size]} ${className}`}
      style={{ background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 55%, #000))` }}
    >
      <Image
        src={photoUrl as string}
        alt={`${t("عکس")} ${name}`}
        width={px[size]}
        height={px[size]}
        sizes="(min-width: 640px) 96px, 56px"
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
