"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Icon } from "@/components/icons";
import { Button, EmptyState, StarRating } from "@/components/ui";
import { LawyerPhoto } from "@/components/lawyer-photo";
import { faNum, faPrice } from "@/lib/data";

type FavLawyer = {
  id: number;
  slug: string;
  name: string;
  title: string;
  city: string;
  province: string;
  rating: number;
  reviewCount: number;
  experienceYears: number;
  specialties: string[];
  avatarColor: string;
  photoUrl: string | null;
  priceChat: number;
  verified: boolean;
};

/** وکلای نشان‌شده موکل — GET/DELETE /api/favorites */
export function FavoritesPanel() {
  const [items, setItems] = useState<FavLawyer[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/favorites", { cache: "no-store" });
        const data = (await res.json()) as { ok: boolean; favorites?: FavLawyer[] };
        if (!cancelled) setItems(data.ok ? (data.favorites ?? []) : []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(id: number) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/favorites?lawyerId=${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setItems((prev) => prev?.filter((x) => x.id !== id) ?? []);
        toast.success("از فهرست نشان‌شده‌ها حذف شد.");
      } else {
        toast.error(data.error ?? "حذف ناموفق بود.");
      }
    } catch {
      toast.error("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusyId(null);
    }
  }

  if (items === null) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface-2/60" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon="star"
          title="هنوز وکیلی نشان نکرده‌اید"
          desc="با زدن نشان در پروفایل هر وکیل، آن را برای مراجعه بعدی اینجا ذخیره کنید."
        />
        <div className="text-center">
          <Button href="/lawyers" variant="soft" icon="search">مرور وکلای پلتفرم</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid max-h-[32rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
      {items.map((l) => (
        <div key={l.id} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
          <LawyerPhoto name={l.name} color={l.avatarColor} photoUrl={l.photoUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Link href={`/lawyers/${l.slug}`} className="truncate text-sm font-bold text-foreground hover:text-primary">
                {l.name}
              </Link>
              {l.verified && <Icon name="badge" className="h-4 w-4 shrink-0 text-primary" />}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">
              {l.city} • {faNum(l.experienceYears)} سال سابقه
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <StarRating rating={l.rating} count={l.reviewCount} />
            </div>
            <p className="mt-1.5 text-xs font-medium text-foreground-soft">
              مشاوره متنی از {faPrice(l.priceChat)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            <Button href={`/consultation?lawyer=${l.slug}`} size="sm" variant="soft" icon="calendar">
              رزرو
            </Button>
            <button
              type="button"
              onClick={() => void remove(l.id)}
              disabled={busyId === l.id}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted transition-colors hover:bg-accent-soft hover:text-accent-text disabled:opacity-50"
            >
              <Icon name="x" className="h-3.5 w-3.5" /> حذف
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * دکمه نشان‌گذاری وکیل (در پروفایل عمومی) — POST /api/favorites (toggle)
 * کاربر واردنشده به /login هدایت می‌شود.
 */
export function FavoriteButton({ lawyerId, lawyerName }: { lawyerId: number; lawyerName: string }) {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const me = (await res.json()) as { ok: boolean };
        if (!me.ok || !alive) {
          setSaved(false);
          return;
        }
        const fres = await fetch("/api/favorites", { cache: "no-store" });
        const data = (await fres.json()) as { ok: boolean; favorites?: { id: number }[] };
        if (alive) setSaved(data.ok ? (data.favorites ?? []).some((f) => f.id === lawyerId) : false);
      } catch {
        if (alive) setSaved(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [lawyerId]);

  async function toggle() {
    if (saved === null || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lawyerId }),
      });
      if (res.status === 401) {
        toast.info("برای نشان‌کردن وکیل ابتدا وارد حساب شوید.");
        window.location.href = "/login";
        return;
      }
      const data = (await res.json()) as { ok: boolean; saved?: boolean; error?: string };
      if (data.ok) {
        setSaved(!!data.saved);
        toast.success(data.saved ? `«${lawyerName}» به نشان‌شده‌ها اضافه شد.` : `«${lawyerName}» از نشان‌شده‌ها حذف شد.`);
      } else {
        toast.error(data.error ?? "عملیات ناموفق بود.");
      }
    } catch {
      toast.error("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }

  const label = saved === null ? "…" : saved ? "نشان‌شده" : "نشان‌کردن";

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={saved === null || busy}
      aria-pressed={saved === true}
      aria-label={saved ? `حذف ${lawyerName} از نشان‌شده‌ها` : `افزودن ${lawyerName} به نشان‌شده‌ها`}
      className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-all disabled:opacity-60 ${
        saved
          ? "border-accent/40 bg-accent-soft text-accent-text"
          : "border-border-strong bg-surface text-foreground hover:bg-surface-2"
      }`}
    >
      <Icon name="star" className={`h-4 w-4 ${saved ? "" : "text-muted"}`} />
      {busy ? "…" : label}
    </button>
  );
}
