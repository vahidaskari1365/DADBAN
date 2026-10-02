"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { shortToman, toFa, toEn } from "@/lib/money";
import type { MarketItem } from "./portal-server";

const SPECIALTIES = ["همه تخصص‌ها", "ملکی", "کیفری", "خانواده", "چک و اسناد", "قراردادها", "تجاری", "حقوقی"];
const CITIES = ["همه شهرها", "تهران", "کرج", "شیراز", "مشهد", "اصفهان", "تبریز"];

type Props = { initialItems: MarketItem[]; canOffer: boolean };

/** بازار پرونده‌های جدید — فیلترها + کارت‌ها + مودال ارسال پیشنهاد قیمت */
export function MarketBrowser({ initialItems, canOffer }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<MarketItem[]>(initialItems);
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [city, setCity] = useState("all");
  const [loading, setLoading] = useState(false);
  const [offerFor, setOfferFor] = useState<MarketItem | null>(null);
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const hasFilters = useMemo(() => q.trim() !== "" || specialty !== "all" || city !== "all", [q, specialty, city]);

  async function applyFilters(next?: { q?: string; specialty?: string; city?: string }) {
    const nq = next?.q ?? q;
    const ns = next?.specialty ?? specialty;
    const nc = next?.city ?? city;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nq.trim()) params.set("q", nq.trim());
      if (ns !== "all") params.set("specialty", ns);
      if (nc !== "all") params.set("city", nc);
      const res = await fetch(`/api/portal/cases/market?${params.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; items?: MarketItem[]; error?: string };
      if (data.ok && data.items) {
        setItems(data.items);
        setHint(null);
      } else {
        setHint(data.error ?? "دریافت فهرست پرونده‌ها ناموفق بود.");
      }
    } catch {
      setHint("ارتباط با سرور برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  function openOffer(item: MarketItem) {
    setOfferFor(item);
    setAmount("");
    setDuration("");
    setNote("");
  }

  async function submitOffer() {
    if (!offerFor) return;
    const digits = toEn(amount).replace(/[^\d]/g, "");
    if (!digits || Number(digits) < 1_000_000) {
      toast.error("مبلغ پیشنهادی باید حداقل ۱ میلیون تومان باشد.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/portal/cases/${offerFor.id}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(digits),
          note: note.trim(),
          durationMonths: Number(toEn(duration).replace(/[^\d]/g, "")) || 0,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; updated?: boolean };
      if (data.ok) {
        toast.success(data.updated ? "پیشنهاد قبلی شما با مقادیر جدید به‌روزرسانی شد." : "پیشنهاد شما با موفقیت برای موکل ارسال شد.");
        setOfferFor(null);
        router.refresh();
      } else {
        toast.error(data.error ?? "ارسال پیشنهاد ناموفق بود.");
      }
    } catch {
      toast.error("ارتباط با سرور برقرار نشد.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {/* فیلترها */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:min-w-56">
          <Icon name="search" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters({ q })}
            placeholder="جستجو در موضوع پرونده..."
            aria-label="جستجو در موضوع پرونده"
            className="h-11 w-full rounded-xl border border-border bg-surface pr-9 pl-3 text-sm outline-none transition-colors focus:border-primary/40"
          />
        </div>
        <select
          value={specialty}
          onChange={(e) => {
            setSpecialty(e.target.value);
            void applyFilters({ specialty: e.target.value });
          }}
          aria-label="فیلتر تخصص"
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
        >
          <option value="all">همه تخصص‌ها</option>
          {SPECIALTIES.slice(1).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            void applyFilters({ city: e.target.value });
          }}
          aria-label="فیلتر شهر"
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
        >
          <option value="all">همه شهرها</option>
          {CITIES.slice(1).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <Button variant="primary" size="md" onClick={() => void applyFilters()} disabled={loading} className="shrink-0">
          <Icon name="filter" className="h-4 w-4" />
          {loading ? "در حال جستجو..." : "اعمال فیلتر"}
        </Button>
      </div>

      {hint && <p className="mb-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{hint}</p>}
      {hasFilters && (
        <p className="mb-3 text-xs text-muted">
          {toFa(items.length)} پرونده مطابق فیلترها
          {loading ? " · در حال به‌روزرسانی..." : ""}
        </p>
      )}

      {/* کارت‌ها */}
      <div className="max-h-[860px] space-y-3 overflow-y-auto pl-1">
        {items.length === 0 && !loading && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            پروندهٔ بازی مطابق فیلترهای شما یافت نشد؛ بعداً دوباره بررسی کنید.
          </p>
        )}
        {items.map((c) => (
          <article key={c.id} className="rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-[15px] font-bold text-foreground">{c.subject}</h4>
                <p className="mt-1 text-xs text-muted">
                  پرونده {toFa(c.caseNumber)} · {c.city} · تطبیق هوشمند {toFa(c.matchScore)}٪
                </p>
              </div>
              <b className="dp-money whitespace-nowrap text-sm">{c.budget || (c.aiEstimate ? "تخمین AI" : "—")}</b>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-cyan/15 px-2.5 py-1 text-[11px] font-semibold text-[#1d7a8c]">{c.specialty}</span>
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">AI Match</span>
              {c.urgency === "high" && (
                <span className="rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-semibold text-danger">فوری</span>
              )}
              {c.proposalsCount > 0 && (
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-muted">
                  {toFa(c.proposalsCount)} پیشنهاد ثبت‌شده
                </span>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-muted">{c.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => (canOffer ? openOffer(c) : toast.error("ارسال پیشنهاد فقط با حساب وکیل امکان‌پذیر است."))}
              >
                <Icon name="send" className="h-4 w-4" />
                ارسال پیشنهاد قیمت
              </Button>
              <Link
                href={`/lawyers`}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground-soft transition-colors hover:bg-surface-2"
              >
                مشاهده جزئیات
              </Link>
            </div>
          </article>
        ))}
      </div>

      {/* مودال پیشنهاد */}
      {offerFor && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(6,12,27,.58)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ارسال پیشنهاد قیمت"
          onClick={(e) => e.target === e.currentTarget && setOfferFor(null)}
        >
          <div className="animate-scale-in w-full max-w-lg overflow-hidden rounded-2xl bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <b className="text-[15px] text-foreground">جزئیات پرونده و ارسال پیشنهاد</b>
              <button
                type="button"
                onClick={() => setOfferFor(null)}
                aria-label="بستن"
                className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-foreground-soft hover:bg-surface-3"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-border bg-surface-2/50 p-3">
                <b className="text-sm text-foreground">{offerFor.subject}</b>
                <p className="mt-1 text-xs text-muted">
                  شماره پرونده: {toFa(offerFor.caseNumber)} · {offerFor.city} · بودجه اعلامی: {offerFor.budget ?? "—"}
                </p>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">حق‌الوکاله پیشنهادی (تومان)</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="numeric"
                  placeholder="مثلاً ۱۲۰۰۰۰۰۰۰"
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
                />
                {amount && <span className="mt-1 block text-[11px] text-accent">{shortToman(toEn(amount).replace(/[^\d]/g, ""))} تومان</span>}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">مدت انجام (ماه — اختیاری)</span>
                <input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  inputMode="numeric"
                  placeholder="مثلاً ۶"
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">توضیحات پیشنهاد (دامنه خدمات، اقساط و...)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  placeholder="دامنه خدمات، مراحل پرونده و شرایط پرداخت را بنویسید..."
                  className="min-h-24 w-full resize-y rounded-xl border border-border bg-surface p-3 text-sm outline-none focus:border-primary/40"
                />
              </label>
              <Button variant="primary" size="lg" className="w-full" onClick={() => void submitOffer()} disabled={sending}>
                <Icon name="send" className="h-4 w-4" />
                {sending ? "در حال ارسال..." : "ارسال پیشنهاد به موکل"}
              </Button>
              <p className="text-center text-[11px] text-muted">پیشنهاد شما به‌همراه امتیاز تطبیق هوشمند برای موکل ارسال می‌شود.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
