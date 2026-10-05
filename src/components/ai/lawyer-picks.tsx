"use client";

import { Fragment, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { LawyerPhoto } from "@/components/lawyer-photo";
import { faNum, faPrice, LOCATIONS } from "@/lib/data";
import type { MatchedLawyer } from "@/lib/lawyer-match";

/**
 * فلو تعاملی «پیشنهاد وکیل» در گفتگو با هوش مصنوعی:
 *  ۱) پیام: «بر اساس مشکلی که داری من این ۱۰ نفر رو بهت پیشنهاد میدم» + لیست ۱۰ وکیل با عکس و نام
 *  ۲) سؤال زیر پیام: «می‌خوای از بین این وکلا ۳ نفر برتر رو بگم؟»
 *     با دو گزینه: «بله، بگو» / «نه، خودم انتخاب می‌کنم»
 *  ۳) با «بله» → نمایش ۳ وکیل برتر با عکس، نام‌وفامیل، امتیاز و راه‌های ارتباط
 *     (متنی / صوتی / تصویری)
 *  ۴) کلیک روی هر وکیل → صفحه‌ی مشخصات کامل همان وکیل
 *
 * با دیتای واقعی وکلای پلتفرم پر می‌شود (سرویس‌سمت سرور: src/lib/lawyer-match.ts).
 */

const CONTACT_TYPES = [
  { key: "chat", label: "متنی", icon: "chat" as const },
  { key: "voice", label: "صوتی", icon: "phone" as const },
  { key: "video", label: "تصویری", icon: "video" as const },
];

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
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const top3Ref = useRef<HTMLDivElement>(null);
  const top3 = lawyers.slice(0, 3);
  // مرز بین وکلای استان کاربر و تکمیل‌کننده‌های سایر استان‌ها (برای شفافیت ترتیب)
  const provCities = province ? new Set(LOCATIONS.find((l) => l.province === province)?.cities ?? []) : null;
  const firstOutIdx = provCities ? lawyers.findIndex((l) => !provCities.has(l.city)) : -1;

  const pick = (c: "yes" | "no") => {
    setChoice(c);
    if (c === "yes") {
      // اسکرول نرم به کارت‌های ۳ وکیل برتر بعد از رندر
      setTimeout(() => top3Ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
    }
  };

  if (lawyers.length === 0) return null;

  return (
    <div className="w-full space-y-3" role="region" aria-label="پیشنهاد وکیل توسط هوش مصنوعی">
      {/* پیام پیشنهاد — سبک پیام دستیار */}
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
          <Icon name="sparkles" className="h-4 w-4" />
        </span>
        <p className="text-sm leading-6 text-foreground">
          بر اساس مشکلی که گفتی{province ? ` و استانت (${province})` : ""}، من این {faNum(lawyers.length)} وکیل رو بهت پیشنهاد می‌دم 👇
          {(topic || province || (specialties && specialties.length > 0)) && (
            <span className="mt-1 flex flex-wrap gap-1.5">
              {topic && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <Icon name="scale" className="h-3 w-3" /> موضوع: {topic}
                </span>
              )}
              {!topic && specialties && specialties.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <Icon name="scale" className="h-3 w-3" /> تخصص: {specialties.join("، ")}
                </span>
              )}
              {province && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-text">
                  <Icon name="location" className="h-3 w-3" /> استان شما: {province}
                </span>
              )}
            </span>
          )}
        </p>
      </div>

      {/* لیست ۱۰ وکیل با عکس پروفایل و نام‌وفامیل — کلیک → پروفایل وکیل */}
      <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-2xl border border-border bg-surface p-2 nice-scroll">
        {lawyers.map((l, i) => (
          <Fragment key={l.id}>
            {i === firstOutIdx && i > 0 && (
              <p className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[10px] font-semibold text-muted">
                <Icon name="location" className="h-3 w-3" />
                برترین وکلای سایر استان‌ها برای تکمیل انتخاب:
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
                      هم‌استان
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

      {/* سؤال: می‌خوای ۳ نفر برتر رو بگم؟ */}
      {choice === null && (
        <div className="rounded-2xl border border-primary/25 bg-primary-soft/50 p-3">
          <p className="text-sm font-bold text-foreground">
            می‌خوای از بین این وکلا {faNum(3)} نفر برتر رو بهت بگم؟
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => pick("yes")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary-hover active:scale-95"
            >
              <Icon name="check" className="h-4 w-4" />
              بله، بگو
            </button>
            <button
              type="button"
              onClick={() => pick("no")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-foreground-soft transition-colors hover:bg-surface-2 active:scale-95"
            >
              نه، خودم انتخاب می‌کنم
            </button>
          </div>
        </div>
      )}

      {choice === "no" && (
        <div className="rounded-2xl border border-border bg-surface-2 p-3 text-sm leading-6 text-foreground-soft">
          خیلی خب! از بین لیست بالا هر کدوم رو خواستی انتخاب کن 👆
          <br />
          برای دیدن همه‌ی وکلا با فیلتر تخصص و شهر،{" "}
          <Link href="/lawyers" className="font-bold text-primary hover:underline">
            صفحه‌ی وکیل‌یابی
          </Link>{" "}
          رو ببین.
        </div>
      )}

      {/* ۳ وکیل برتر */}
      {choice === "yes" && (
        <div ref={top3Ref} className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon name="star" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-foreground">{faNum(3)} وکیل برتر برای مشکل تو</p>
              <p className="text-[11px] text-muted">بر اساس امتیاز و نظرات واقعی کاربران دادبان</p>
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
                        وکیل برتر
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{l.title}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1 font-bold text-foreground">
                      <Icon name="star" className="h-3.5 w-3.5 text-accent-text" />
                      {faNum(l.rating.toFixed(1))}
                      <span className="font-normal text-muted">({faNum(l.reviewCount)} نظر)</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="location" className="h-3 w-3" /> {l.city}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="briefcase" className="h-3 w-3" /> {faNum(l.experienceYears)} سال سابقه
                    </span>
                  </span>
                </span>
              </Link>

              {/* راه‌های ارتباط گرفتن با وکیل: متنی / صوتی / تصویری */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-2.5">
                <span className="text-[11px] text-muted">ارتباط:</span>
                {CONTACT_TYPES.map((c) => (
                  <Link
                    key={c.key}
                    href={`/consultation?lawyer=${l.slug}&type=${c.key}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Icon name={c.icon} className="h-3 w-3" />
                    مشاوره {c.label}
                    <span className="font-medium opacity-80">از {faPrice(c.key === "chat" ? l.priceChat : c.key === "voice" ? l.priceVoice : l.priceVideo)}</span>
                  </Link>
                ))}
                <Link
                  href={`/lawyers/${l.slug}`}
                  className="mr-auto inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                >
                  مشخصات کامل
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
