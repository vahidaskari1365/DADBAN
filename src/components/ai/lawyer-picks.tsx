"use client";

import { Fragment, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { LawyerPhoto } from "@/components/lawyer-photo";
import { useT } from "@/lib/i18n/provider";
import { faNum, faPrice, LOCATIONS } from "@/lib/data";
import type { MatchedLawyer } from "@/lib/lawyer-match";

/**
 * فلو تعاملی «پیشنهاد وکیل» در گفتگو با هوش مصنوعی — سه‌مرحله‌ای گیت‌شده:
 *  ۱) پرسش گزینه‌ای: «می‌خوای ۱۰ وکیل برترِ موضوعت رو معرفی کنم؟» → [بله، معرفی کن] [نه، فعلاً کافیه]
 *  ۲) با «بله»: پیام معرفی + لیست ۱۰ وکیل با عکس و نام (کلیک → پروفایل)
 *     و پرسش بعدی: «می‌خوای از بین این وکلا ۳ نفرِ مناسبِ کارت رو بهت بگم؟»
 *  ۳) با «بله»: نمایش ۳ وکیل برتر با عکس، امتیاز و راه‌های ارتباط (متنی/صوتی/تصویری)
 *
 * دیتای واقعی وکلا از سرور می‌آید (src/lib/lawyer-match.ts) و کل فلو سمت کلاینت است.
 */

const CONTACT_TYPES = [
  { key: "chat", label: "متنی", icon: "chat" as const },
  { key: "voice", label: "صوتی", icon: "phone" as const },
  { key: "video", label: "تصویری", icon: "video" as const },
];

type PicksStage = "ask10" | "declined" | "show10" | "show3";

export function LawyerPicksFlow({
  lawyers,
  topic,
  specialties,
  province,
}: {
  lawyers: MatchedLawyer[];
  topic?: string | null;
  specialties?: string[];
  /** استان کاربر — برای نشان دادن تطابق جغرافیایی پیشنهادها */
  province?: string | null;
}) {
  const t = useT();
  const [stage, setStage] = useState<PicksStage>("ask10");
  const top3Ref = useRef<HTMLDivElement>(null);
  const top3 = lawyers.slice(0, 3);
  // مرز بین وکلای استان کاربر و تکمیل‌کننده‌های سایر استان‌ها (برای شفافیت ترتیب)
  const provCities = province ? new Set(LOCATIONS.find((l) => l.province === province)?.cities ?? []) : null;
  const firstOutIdx = provCities ? lawyers.findIndex((l) => !provCities.has(l.city)) : -1;

  const goTop3 = () => {
    setStage("show3");
    setTimeout(() => top3Ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
  };

  if (lawyers.length === 0) return null;

  const badges = (topic || province || (specialties && specialties.length > 0)) && (
    <span className="mt-1 flex flex-wrap gap-1.5">
      {topic && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
          <Icon name="scale" className="h-3 w-3" /> {topic}
        </span>
      )}
      {!topic && specialties && specialties.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
          <Icon name="scale" className="h-3 w-3" /> {specialties.join("، ")}
        </span>
      )}
      {province && (
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-text">
          <Icon name="location" className="h-3 w-3" /> {province}
        </span>
      )}
    </span>
  );

  return (
    <div className="w-full space-y-3" role="region" aria-label={t("پیشنهاد وکیل توسط هوش مصنوعی")}>
      {/* مرحله ۱ — پرسش گزینه‌ای: معرفی ۱۰ وکیل برتر؟ */}
      {stage === "ask10" && (
        <>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
              <Icon name="sparkles" className="h-4 w-4" />
            </span>
            <p className="text-sm leading-6 text-foreground">
              {t("بر اساس مشکلی که گفتی")}{province ? ` (${province})` : ""} {t("می‌تونم وکیل‌های مناسب بهت معرفی کنم")}
              {badges}
            </p>
          </div>
          <div className="rounded-2xl border border-primary/25 bg-primary-soft/50 p-3">
            <p className="text-sm font-bold text-foreground">{t("می‌خوای ۱۰ وکیل برترِ موضوعت رو معرفی کنم؟")}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStage("show10")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary-hover active:scale-95"
              >
                <Icon name="check" className="h-4 w-4" />
                {t("بله، معرفی کن")}
              </button>
              <button
                type="button"
                onClick={() => setStage("declined")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-foreground-soft transition-colors hover:bg-surface-2 active:scale-95"
              >
                {t("نه، فعلاً کافیه")}
              </button>
            </div>
          </div>
        </>
      )}

      {stage === "declined" && (
        <div className="rounded-2xl border border-border bg-surface-2 p-3 text-sm leading-6 text-foreground-soft">
          {t("خیلی خب! هر وقت خواستی وکیل‌های متناسب با موضوعت رو ببین")}{" "}
          <Link href="/lawyers" className="font-bold text-primary hover:underline">
            {t("دایرکتوری وکلا")}
          </Link>{" "}
          <span dir="auto">👇</span>
        </div>
      )}

      {/* مرحله ۲ — لیست ۱۰ وکیل + پرسش ۳ نفر مناسب */}
      {stage !== "ask10" && stage !== "declined" && (
        <>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
              <Icon name="sparkles" className="h-4 w-4" />
            </span>
            <p className="text-sm leading-6 text-foreground">
              {t("بر اساس مشکلی که گفتی")}{province ? ` (${province})` : ""}، {t("این وکلا رو بهت پیشنهاد می‌دم 👇")}
              {badges}
            </p>
          </div>

          <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-2xl border border-border bg-surface p-2 nice-scroll">
            {lawyers.map((l, i) => (
              <Fragment key={l.id}>
                {i === firstOutIdx && i > 0 && (
                  <p className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[10px] font-semibold text-muted">
                    <Icon name="location" className="h-3 w-3" />
                    {t("برترین وکلای سایر استان‌ها برای تکمیل انتخاب:")}
                  </p>
                )}
                <Link
                  href={`/lawyers/${l.slug}`}
                  className={`flex items-center gap-3 rounded-xl border p-2 transition-colors hover:border-primary/30 hover:bg-primary-soft/40 ${
                    provCities?.has(l.city) ? "border-transparent" : "opacity-90"
                  }`}
                >
                  <span className="w-5 shrink-0 text-center text-xs font-bold text-muted">{faNum(i + 1)}</span>
                  <LawyerPhoto name={l.name} color={l.avatarColor} photoUrl={l.photoUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      <span className="truncate text-sm font-bold text-foreground">{l.name}</span>
                      {l.verified && <Icon name="badge" className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      {provCities?.has(l.city) && (
                        <span className="shrink-0 rounded-full bg-success/12 px-1.5 py-0.5 text-[9px] font-bold text-success">
                          {t("هم‌استان")}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[11px] text-muted">
                      {l.specialties.slice(0, 2).join(" • ")} — {l.city}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-foreground">
                    <Icon name="star" className="h-3.5 w-3.5 text-accent-text" />
                    {faNum(l.rating.toFixed(1))}
                  </span>
                  <Icon name="chevron" className="h-4 w-4 shrink-0 rotate-180 text-muted" />
                </Link>
              </Fragment>
            ))}
          </div>

          {/* پرسش مرحله ۳ — فقط وقتی هنوز ۳ نفر نمایش داده نشده */}
          {stage === "show10" && (
            <div className="rounded-2xl border border-primary/25 bg-primary-soft/50 p-3">
              <p className="text-sm font-bold text-foreground">{t("می‌خوای از بین این وکلا ۳ نفرِ مناسبِ کارت رو بهت بگم؟")}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={goTop3}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary-hover active:scale-95"
                >
                  <Icon name="check" className="h-4 w-4" />
                  {t("بله، بگو")}
                </button>
                <button
                  type="button"
                  onClick={() => setStage("declined")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-foreground-soft transition-colors hover:bg-surface-2 active:scale-95"
                >
                  {t("نه، خودم انتخاب می‌کنم")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* مرحله ۳ — ۳ وکیل برتر با راه‌های ارتباط */}
      {stage === "show3" && (
        <div ref={top3Ref} className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon name="star" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-foreground">{t("۳ وکیل برتر برای مشکل تو")}</p>
              <p className="text-[11px] text-muted">{t("بر اساس امتیاز و نظرات واقعی کاربران دادبان")}</p>
            </div>
          </div>

          {top3.map((l) => (
            <div
              key={l.id}
              className="rounded-2xl border border-border bg-surface p-3.5 card-shadow transition-all hover:border-primary/30"
            >
              <Link href={`/lawyers/${l.slug}`} className="flex items-start gap-3">
                <LawyerPhoto name={l.name} color={l.avatarColor} photoUrl={l.photoUrl} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-extrabold text-foreground">{l.name}</span>
                    {l.verified && <Icon name="badge" className="h-4 w-4 text-primary" />}
                    {l.topRated && (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent-text">
                        {t("وکیل برتر")}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{l.title}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1 font-bold text-foreground">
                      <Icon name="star" className="h-3.5 w-3.5 text-accent-text" />
                      {faNum(l.rating.toFixed(1))}
                      <span className="font-normal text-muted">({faNum(l.reviewCount)} {t("نظر")})</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="location" className="h-3 w-3" /> {l.city}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="briefcase" className="h-3 w-3" /> {faNum(l.experienceYears)} {t("سال سابقه")}
                    </span>
                  </span>
                </span>
              </Link>

              {/* راه‌های ارتباط گرفتن با وکیل: متنی / صوتی / تصویری */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-2.5">
                <span className="text-[11px] text-muted">{t("ارتباط:")}</span>
                {CONTACT_TYPES.map((c) => (
                  <Link
                    key={c.key}
                    href={`/consultation/book?lawyer=${l.slug}&type=${c.key}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Icon name={c.icon} className="h-3 w-3" />
                    {t("مشاوره")} {t(c.label)}
                    <span className="font-medium opacity-80">{t("از")} {faPrice(c.key === "chat" ? l.priceChat : c.key === "voice" ? l.priceVoice : l.priceVideo)}</span>
                  </Link>
                ))}
                <Link
                  href={`/lawyers/${l.slug}`}
                  className="mr-auto inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                >
                  {t("مشخصات کامل")}
                  <Icon name="chevron" className="h-3 w-3 rotate-180" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
