"use client";

/**
 * صفحه «وکیل کارمندان» — تجربه اختصاصی:
 * ۱) جست‌وجو فقط با انتخاب استان  ۲) باکس هوشمند «مشکلتو بگو…»
 * ۳) فقط وکلایی که در ثبت‌نام «وکیل کارمندان» (تخصص کار) را انتخاب کرده‌اند
 * ۴) انتخاب وکیل → رزرو وقت مشاوره (روند پرداخت در صفحه رزرو ادامه دارد)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LOCATIONS, faNum } from "@/lib/data";
import { trackEvent } from "@/lib/analytics";

interface LawyerOpt {
  slug: string;
  name: string;
  city: string;
  specialties?: string[] | null;
  rating?: number | null;
  photoUrl?: string | null;
  avatarColor?: string | null;
  verified?: boolean | null;
  experienceYears?: number | null;
}

interface MatchItem {
  slug: string;
  reason: string;
}

const CASE_TYPE = "کار و تأمین اجتماعی";

function LawyerRow({ l, reason }: { l: LawyerOpt; reason?: string }) {
  const [failed, setFailed] = useState(false);
  const hasPhoto = !!l.photoUrl && !failed;
  const initials = l.name
    .trim()
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("");

  return (
    <Link
      href={`/consultation?lawyer=${encodeURIComponent(l.slug)}&caseType=${encodeURIComponent(CASE_TYPE)}`}
      onClick={() => trackEvent("employee_lawyer_select")}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 card-shadow transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-lift)] sm:gap-4 sm:p-4"
    >
      <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl sm:h-24 sm:w-24">
        {hasPhoto ? (
          <Image
            src={l.photoUrl as string}
            alt={`عکس ${l.name}`}
            fill
            sizes="96px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setFailed(true)}
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-2xl font-bold text-white"
            style={{
              background: `linear-gradient(160deg, ${l.avatarColor || "#6b7f5e"}, color-mix(in oklab, ${l.avatarColor || "#6b7f5e"} 45%, #000))`,
            }}
          >
            {initials}
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-foreground sm:text-base">{l.name}</span>
          {l.verified && <Icon name="badge" className="h-4 w-4 shrink-0 text-primary" />}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="location" className="h-3.5 w-3.5" />
            {l.city}
          </span>
          {!!l.rating && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-1.5 py-0.5 font-bold text-primary">
              ★ {faNum(l.rating.toFixed(1))}
            </span>
          )}
          {!!l.experienceYears && <span>{faNum(l.experienceYears)} سال سابقه</span>}
        </span>
        {reason && (
          <span className="mt-1.5 flex items-start gap-1 rounded-xl bg-accent-soft px-2 py-1 text-[11px] font-semibold leading-5 text-accent-text">
            <Icon name="sparkles" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            پیشنهاد برای مشکل شما: {reason}
          </span>
        )}
      </span>

      <span className="flex shrink-0 flex-col items-center gap-1">
        <span className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-colors group-hover:bg-primary/90">
          رزرو مشاوره
        </span>
        <span className="hidden text-[10px] text-muted sm:block">پرداخت پس از تأیید نوبت</span>
      </span>
    </Link>
  );
}

export function EmployeeLawyerFinder() {
  const [lawyers, setLawyers] = useState<LawyerOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [province, setProvince] = useState("");
  const [problem, setProblem] = useState("");
  const [matching, setMatching] = useState(false);
  const [matchErr, setMatchErr] = useState("");
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [matched, setMatched] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/lawyers?sp=کار");
        const d = await res.json();
        if (!alive) return;
        if (!res.ok || !d.ok) throw new Error("load failed");
        setLawyers(Array.isArray(d.lawyers) ? d.lawyers : []);
      } catch {
        if (alive) setLoadFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const provinceCities = useMemo(
    () => (province ? LOCATIONS.find((l) => l.province === province)?.cities ?? [] : []),
    [province],
  );

  const filtered = useMemo(
    () =>
      provinceCities.length
        ? lawyers.filter((l) => provinceCities.includes(l.city))
        : lawyers,
    [lawyers, provinceCities],
  );

  const ordered = useMemo(() => {
    if (!matched || matches.length === 0) return filtered;
    const rank = new Map(matches.map((m, i) => [m.slug, i]));
    return [...filtered].sort(
      (a, b) => (rank.has(a.slug) ? rank.get(a.slug)! : 99) - (rank.has(b.slug) ? rank.get(b.slug)! : 99),
    );
  }, [filtered, matches, matched]);

  const reasonOf = (slug: string) => matches.find((m) => m.slug === slug)?.reason;

  async function suggest() {
    if (problem.trim().length < 5) {
      setMatchErr("لطفاً مشکل خود را کمی دقیق‌تر بنویسید.");
      return;
    }
    setMatching(true);
    setMatchErr("");
    try {
      const res = await fetch("/api/employee-lawyer-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem, province: province || undefined }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "match failed");
      setMatches(Array.isArray(d.matches) ? d.matches : []);
      setMatched(true);
      trackEvent("employee_match_success");
      setTimeout(() => {
        if (listRef.current)
          window.scrollTo({ top: listRef.current.offsetTop - 88, behavior: "smooth" });
      }, 120);
    } catch {
      setMatchErr("پیشنهاد هوشمند الان در دسترس نیست؛ از فهرست پایین وکیل را انتخاب کنید.");
    } finally {
      setMatching(false);
    }
  }

  return (
    <div>
      {/* جست‌وجو — فقط انتخاب استان */}
      <Card hover={false} className="p-4 sm:p-5">
        <label className="flex flex-col gap-1.5 sm:max-w-xs">
          <span className="text-xs font-semibold text-muted">انتخاب استان</span>
          <span className="relative">
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full appearance-none rounded-xl border border-border bg-background py-2.5 ps-9 pe-8 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary"
            >
              <option value="">همه استان‌ها</option>
              {LOCATIONS.map((l) => (
                <option key={l.province} value={l.province}>
                  {l.province}
                </option>
              ))}
            </select>
            <Icon name="location" className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted" />
          </span>
        </label>
      </Card>

      {/* باکس هوشمند — مشکلتو بگو */}
      <div className="relative mt-4 overflow-hidden rounded-3xl border border-primary/25 bg-primary-soft/50 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Icon name="sparkles" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-foreground sm:text-base">
              مشکلتو بگو تا بر اساس مشکلت بهترین وکیل رو پیشنهاد بدم
            </h2>
            <p className="mt-1 text-xs leading-6 text-muted">
              مثلاً: «۸ ماه اخراج شدم و سنوات و بیمه‌ام پرداخت نشده» — هرچه دقیق‌تر بنویسی، پیشنهاد دقیق‌تر است.
            </p>
          </div>
        </div>
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          rows={3}
          maxLength={800}
          placeholder="مشکل کاری‌ات را همین‌جا بنویس…"
          className="mt-3 w-full resize-none rounded-2xl border border-border bg-background p-3 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-soft focus:border-primary"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={suggest} disabled={matching} icon={matching ? undefined : "sparkles"}>
            {matching ? "در حال تحلیل مشکل شما…" : "پیشنهاد بهترین وکیل"}
          </Button>
          {matchErr && <p className="text-xs font-semibold text-danger">{matchErr}</p>}
        </div>
      </div>

      {/* فهرست وکلا */}
      <div ref={listRef} className="mt-6 scroll-mt-24">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-foreground sm:text-base">
            {matched && matches.length > 0 ? "پیشنهاد هوشمند و سایر وکلای کارمندان" : "وکلای کارمندان"}
          </h2>
          <span className="text-xs text-muted">
            {loading ? "" : `${faNum(ordered.length)} وکیل`}
          </span>
        </div>

        {loading ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-border bg-surface-2/60" />
            ))}
          </div>
        ) : loadFailed ? (
          <Card hover={false} className="mt-3 p-6 text-center">
            <p className="text-sm font-semibold text-foreground">دریافت فهرست وکلا ناموفق بود.</p>
            <p className="mt-1 text-xs text-muted">اتصال اینترنت را بررسی کنید و صفحه را دوباره باز کنید.</p>
          </Card>
        ) : ordered.length === 0 ? (
          <Card hover={false} className="mt-3 p-6 text-center">
            <p className="text-sm font-semibold text-foreground">
              {province ? `هنوز وکیل کارمندی در استان ${province} ثبت‌نام نکرده است.` : "هنوز وکیلی برای این حوزه ثبت‌نام نکرده است."}
            </p>
            <p className="mt-1 text-xs leading-6 text-muted">
              استان دیگری را امتحان کنید یا از فهرست همه وکلا استفاده کنید.
            </p>
            <Link href="/lawyers" className="mt-3 inline-block text-xs font-bold text-primary hover:underline">
              مشاهده همه وکلا ←
            </Link>
          </Card>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {ordered.map((l) => (
              <LawyerRow key={l.slug} l={l} reason={reasonOf(l.slug)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
