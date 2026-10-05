"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Container, Button, Badge, StarRating, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum, faPrice } from "@/lib/data";

/**
 * فهرست وکلای قابل گفتگو در صفحه مشاوره:
 *  - وضعیت واقعی آنلاین/آفلاین (poll هر ۲۰ ثانیه از /api/lawyers/presence)
 *  - فیلتر بر اساس نوع کار (تخصص) + سوییچ «فقط آنلاین‌ها»
 *  - شروع گفتگوی متنی همان‌جا یا «رزرو مشاوره» (انتقال به صفحهٔ رزرو با پیش‌پر کردن وکیل)
 *  - وکلای آنلاین بالای فهرست، سپس بر اساس امتیاز
 */

interface DirectoryLawyer {
  slug: string;
  name: string;
  title?: string;
  city: string;
  specialties: string[];
  rating: number;
  reviewCount?: number;
  caseCount?: number;
  priceChat?: number;
  responseTime?: string;
  photoUrl: string | null;
  avatarColor: string;
  verified: boolean;
  experienceYears: number;
}

export function ConsultLawyerDirectory({
  onChat,
  onBook,
  onPresence,
}: {
  onChat: (lawyer: DirectoryLawyer) => void;
  onBook: (lawyer: DirectoryLawyer) => void;
  /** حضور زنده به بالا کشیده می‌شود تا نوار «وکیل منتخب» فرم هم همان وضعیت را نشان دهد */
  onPresence?: (online: string[]) => void;
}) {
  const [lawyers, setLawyers] = useState<DirectoryLawyer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [online, setOnline] = useState<string[]>([]);
  const [sp, setSp] = useState<string>("");
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  /* وکلا — یک‌بار */
  useEffect(() => {
    fetch("/api/lawyers")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setLawyers(d.lawyers);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  /* حضور آنلاین — poll هر ۲۰ ثانیه + هنگام بازگشت به تب */
  const onPresenceRef = useRef(onPresence);
  useEffect(() => {
    onPresenceRef.current = onPresence;
  }, [onPresence]);
  useEffect(() => {
    let alive = true;
    const check = () => {
      fetch("/api/lawyers/presence")
        .then((r) => r.json())
        .then((d) => {
          if (alive && d.ok) {
            setOnline(d.online as string[]);
            onPresenceRef.current?.(d.online as string[]);
          }
        })
        .catch(() => {});
    };
    check();
    const t = setInterval(check, 20_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  /* همه تخصص‌های واقعی وکلا — برچسب فیلتر از دل دیتا، نه لیست ثابت */
  const specialtyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of lawyers) for (const s of l.specialties ?? []) set.add(s);
    return [...set].slice(0, 14);
  }, [lawyers]);

  const isOnline = (slug: string) => online.includes(slug);

  const filtered = useMemo(() => {
    let list = lawyers;
    if (sp) list = list.filter((l) => (l.specialties ?? []).includes(sp));
    if (onlyOnline) list = list.filter((l) => isOnline(l.slug));
    return [...list].sort((a, b) => {
      const oa = isOnline(a.slug) ? 1 : 0;
      const ob = isOnline(b.slug) ? 1 : 0;
      if (oa !== ob) return ob - oa;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lawyers, sp, onlyOnline, online]);

  const onlineCount = lawyers.filter((l) => isOnline(l.slug)).length;

  return (
    <section id="lawyer-directory" aria-labelledby="directory-title" className="scroll-mt-20 lg:scroll-mt-22">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="directory-title" className="text-pretty text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              وکیل خود را انتخاب کنید و همین‌جا گفتگو کنید
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted">
              وضعیت آنلاین بودن وکلا واقعی است؛ روی «شروع گفتگو» بزنید و سؤال‌تان را بنویسید —
              اگر وکیل آفلاین باشد، پیام شما ذخیره می‌شود و در پنل وکیل پاسخ می‌گیرید.
            </p>
          </div>
          <Badge tone={onlineCount > 0 ? "success" : "neutral"} icon="bolt">
            {loaded ? `${faNum(onlineCount)} وکیل آنلاین` : "در حال بررسی وضعیت…"}
          </Badge>
        </div>

        {/* فیلترها */}
        <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="فیلتر وکلا">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Icon name="filter" className="h-4 w-4" /> نوع کار:
          </span>
          <button
            onClick={() => setSp("")}
            aria-pressed={sp === ""}
            className={`h-9 cursor-pointer rounded-full border px-3.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              sp === ""
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground-soft hover:border-primary/40 hover:text-primary"
            }`}
          >
            همه
          </button>
          {specialtyOptions.map((s) => (
            <button
              key={s}
              onClick={() => setSp((cur) => (cur === s ? "" : s))}
              aria-pressed={sp === s}
              className={`h-9 cursor-pointer rounded-full border px-3.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                sp === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground-soft hover:border-primary/40 hover:text-primary"
              }`}
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => setOnlyOnline((v) => !v)}
            aria-pressed={onlyOnline}
            className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              onlyOnline
                ? "border-success bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-success"
                : "border-border bg-surface text-foreground-soft hover:border-success/40"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${onlyOnline ? "bg-success" : "bg-border-strong"}`} />
            فقط آنلاین‌ها
          </button>
        </div>

        {/* فهرست */}
        {!loaded ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl border border-border bg-surface-2/60" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon="search"
              title="وکیلی با این فیلتر پیدا نشد"
              desc="فیلتر تخصص یا «فقط آنلاین‌ها» را بردارید، یا درخواست رزرو بدهید تا کارشناسان دادبان بهترین وکیل را معرفی کنند."
              action={{ href: "/consultation/book", label: "ثبت درخواست مشاوره" }}
            />
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="lawyer-directory-list">
            {filtered.slice(0, 24).map((l) => {
              const initials = l.name.trim().split(" ").slice(-2).map((w) => w[0]).join("");
              const hasPhoto = !!l.photoUrl && !failed[l.slug];
              const on = isOnline(l.slug);
              return (
                <li
                  key={l.slug}
                  className={`relative flex flex-col rounded-2xl border bg-surface p-4 card-shadow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] ${
                    on ? "border-[color-mix(in_oklab,var(--success)_35%,transparent)]" : "border-border"
                  }`}
                  data-testid="lawyer-card"
                >
                  <div className="flex items-start gap-3">
                    <span className="relative shrink-0">
                      {hasPhoto ? (
                        <Image
                          src={l.photoUrl as string}
                          alt={`عکس ${l.name}`}
                          width={56}
                          height={56}
                          className="h-14 w-14 rounded-2xl object-cover"
                          onError={() => setFailed((f) => ({ ...f, [l.slug]: true }))}
                        />
                      ) : (
                        <span
                          className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white"
                          style={{ background: `linear-gradient(135deg, ${l.avatarColor}, color-mix(in oklab, ${l.avatarColor} 55%, #000))` }}
                          aria-hidden
                        >
                          {initials}
                        </span>
                      )}
                      <span
                        title={on ? "آنلاین" : "آفلاین"}
                        className={`absolute -bottom-0.5 -start-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface ${on ? "bg-success" : "bg-border-strong"}`}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/lawyers/${l.slug}`}
                          className="truncate text-sm font-bold text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          {l.name}
                        </Link>
                        {l.verified && (
                          <Icon name="badge" className="h-4 w-4 shrink-0 text-primary" aria-label="احراز هویت‌شده" />
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted">{l.title ?? "وکیل پایه یک دادگستری"}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Icon name="location" className="h-3 w-3" /> {l.city}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Icon name="briefcase" className="h-3 w-3" /> {faNum(l.experienceYears)} سال سابقه
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {(l.specialties ?? []).slice(0, 3).map((s) => (
                      <Badge key={s} tone="primary">{s}</Badge>
                    ))}
                    {(l.specialties?.length ?? 0) > 3 && (
                      <Badge tone="neutral">+{faNum(l.specialties.length - 3)}</Badge>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <StarRating rating={l.rating ?? 0} count={l.reviewCount} />
                    {on ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--success)_14%,transparent)] px-2.5 py-1 text-[11px] font-bold text-success">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> آنلاین
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted">
                        <span className="h-2 w-2 rounded-full bg-border-strong" /> آفلاین
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                    <div>
                      <p className="text-[10px] text-muted">مشاوره متنی از</p>
                      <p className="text-xs font-bold text-foreground tnum">{faPrice(l.priceChat ?? 0)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => onBook(l)} data-testid={`book-${l.slug}`}>
                        رزرو مشاوره
                      </Button>
                      <Button
                        size="sm"
                        variant={on ? "primary" : "soft"}
                        icon="chat"
                        onClick={() => onChat(l)}
                        data-testid={`chat-${l.slug}`}
                      >
                        شروع گفتگو
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </section>
  );
}
