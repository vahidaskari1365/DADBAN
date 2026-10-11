"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { toFa, formatToman } from "@/lib/money";
import { formatJalaliLong } from "@/lib/jalali";

type SettingsMap = Record<string, string>;

export type LegalReviewDTO = {
  id: number;
  pageSlug: string;
  reviewerName: string;
  reviewerTitle: string;
  summary: string;
  reviewedAt: string;
};

const PAGE_FA: Record<string, string> = {
  terms: "قوانین و مقررات (/terms)",
  privacy: "حریم خصوصی (/privacy)",
};

const FIELDS: {
  key: string;
  label: string;
  hint: string;
  type: "number" | "text";
  suffix?: string;
}[] = [
  {
    key: "commission_rate",
    label: "نرخ کمیسیون پلتفرم",
    hint: "درصدی که دادپیو از هر پرداخت موکل به‌عنوان کارمزد برمی‌دارد (۰ تا ۱۰۰).",
    type: "number",
    suffix: "درصد",
  },
  {
    key: "payout_min",
    label: "حداقل مبلغ برداشت وکیل",
    hint: "کمترین مبلغی که وکیل می‌تواند درخواست تسویه ثبت کند (تومان).",
    type: "number",
    suffix: "تومان",
  },
  {
    key: "min_lawyer_score",
    label: "حداقل امتیاز تطبیق وکیل",
    hint: "وکلایی که امتیاز تطبیق آن‌ها کمتر از این عدد باشد به موکل پیشنهاد نمی‌شوند.",
    type: "number",
    suffix: "از ۱۰۰",
  },
  {
    key: "credit_providers",
    label: "تأمین‌کنندگان اعتبار فعال",
    hint: "شناسهٔ تأمین‌کنندگان جدا‌شده با ویرگول: azki ، partner_bank",
    type: "text",
  },
  {
    key: "matching_model",
    label: "مدل موتور تطبیق",
    hint: "شناسهٔ مدل/نسخهٔ موتور تطبیق هوشمند — برای پایش و بازگشت نسخه.",
    type: "text",
  },
];

export default function SettingsClient({ settings, legalReviews }: { settings: SettingsMap; legalReviews: LegalReviewDTO[] }) {
  const router = useRouter();
  const [values, setValues] = useState<SettingsMap>(settings);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  /* نشان «بازبینی حقوقی صفحات» — فرم ثبت + فهرست */
  const [lrList, setLrList] = useState<LegalReviewDTO[]>(legalReviews);
  const [lrSlug, setLrSlug] = useState("terms");
  const [lrName, setLrName] = useState("");
  const [lrTitle, setLrTitle] = useState("وکیل دادگستری");
  const [lrSummary, setLrSummary] = useState("");
  const [lrBusy, setLrBusy] = useState(false);

  function flash(ok: boolean, text: string) {
    setToast({ ok, text });
    window.setTimeout(() => setToast(null), 4000);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/marketplace/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: FIELDS.map((f) => ({ key: f.key, value: values[f.key] ?? "" })) }),
      });
      if (res.ok) {
        flash(true, "تنظیمات با موفقیت ذخیره شد.");
        router.refresh();
      } else if (res.status === 401) {
        flash(false, "نشست ادمین منقضی شده؛ دوباره وارد شوید.");
      } else if (res.status === 422) {
        flash(false, "مقادیر ارسالی نامعتبر است.");
      } else {
        flash(false, "ذخیرهٔ تنظیمات ناموفق بود؛ دوباره تلاش کنید.");
      }
    } catch {
      flash(false, "خطای شبکه؛ اتصال خود را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  async function saveLegalReview(e: React.FormEvent) {
    e.preventDefault();
    setLrBusy(true);
    try {
      const res = await fetch("/api/admin/legal-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageSlug: lrSlug, reviewerName: lrName.trim(), reviewerTitle: lrTitle.trim(), summary: lrSummary.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && data.review) {
        setLrList((prev) => [data.review as LegalReviewDTO, ...prev.filter((r) => r.pageSlug !== (data.review as LegalReviewDTO).pageSlug)]);
        setLrName("");
        setLrSummary("");
        setLrTitle("وکیل دادگستری");
        flash(true, "بازبینی حقوقی ثبت شد.");
        router.refresh();
      } else if (res.status === 401) {
        flash(false, "نشست ادمین منقضی شده؛ دوباره وارد شوید.");
      } else {
        flash(false, data?.error ?? "ثبت بازبینی ناموفق بود.");
      }
    } catch {
      flash(false, "خطای شبکه؛ اتصال خود را بررسی کنید.");
    } finally {
      setLrBusy(false);
    }
  }

  async function removeLegalReview(id: number) {
    if (!window.confirm("این بازبینی حذف شود؟")) return;
    setLrBusy(true);
    try {
      const res = await fetch(`/api/admin/legal-review?id=${encodeURIComponent(String(id))}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setLrList((prev) => prev.filter((r) => r.id !== id));
        flash(true, "بازبینی حذف شد.");
        router.refresh();
      } else if (res.status === 401) {
        flash(false, "نشست ادمین منقضی شده؛ دوباره وارد شوید.");
      } else {
        flash(false, data?.error ?? "حذف بازبینی ناموفق بود.");
      }
    } catch {
      flash(false, "خطای شبکه؛ اتصال خود را بررسی کنید.");
    } finally {
      setLrBusy(false);
    }
  }

  return (
    <>
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-2" aria-label="تنظیمات پلتفرم">
      {FIELDS.map((f) => (
        <Card key={f.key} hover={false}>
          <label htmlFor={`set-${f.key}`} className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <Icon name="lock" className="h-4 w-4 text-accent" />
            {f.label}
          </label>
          <p className="mt-1.5 text-xs leading-6 text-muted">{f.hint}</p>
          <div className="mt-3 flex items-center gap-2">
            <input
              id={`set-${f.key}`}
              type={f.type}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              dir={f.type === "number" ? "ltr" : "ltr"}
              className="h-11 w-full max-w-[220px] rounded-xl border border-border bg-background px-3.5 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent"
              min={f.type === "number" ? 0 : undefined}
              required
            />
            {f.suffix && <span className="text-xs font-bold text-muted">{f.suffix}</span>}
          </div>
          {f.key === "payout_min" && Number(values[f.key] || 0) > 0 && (
            <p className="mt-2 text-[11px] text-accent">معادل {formatToman(values[f.key])}</p>
          )}
        </Card>
      ))}

      <div className="lg:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="btn-gold inline-flex min-h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold transition-all disabled:opacity-50"
        >
          <Icon name="check" className="h-4 w-4" />
          {busy ? "در حال ذخیره…" : "ذخیرهٔ تنظیمات"}
        </button>
        <p className="mt-3 text-[11px] leading-6 text-muted">
          نرخ فعلی کمیسیون: {toFa(values.commission_rate || "0")}٪ — تغییرات بلافاصله روی محاسبات کمیسیون پرداخت‌های جدید اعمال می‌شود.
        </p>
      </div>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-xs rounded-xl px-4 py-3 text-sm font-bold shadow-lg ${
            toast.ok ? "bg-success text-white" : "bg-danger text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </form>

    {/* بازبینی حقوقی صفحات — نشان اعتماد /terms و /privacy */}
    <section aria-label="بازبینی حقوقی صفحات" className="mt-6">
      <Card hover={false}>
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
          <Icon name="shield" className="h-4 w-4 text-success" />
          بازبینی حقوقی صفحات
        </h2>
        <p className="mt-1.5 text-xs leading-6 text-muted">
          نشان «بازبینی حقوقی» دقیقاً زیر تیتر صفحات انتخاب‌شده نمایش داده می‌شود؛ نام بازبین، عنوان و جمع‌بندی را ثبت کنید. ثبتِ دوباره برای همان صفحه، بازبینی قبلی را به‌روزرسانی می‌کند.
        </p>

        <form data-testid="legal-review-form" onSubmit={saveLegalReview} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lr-slug" className="text-xs font-bold text-foreground">صفحه</label>
            <select
              id="lr-slug"
              value={lrSlug}
              onChange={(e) => setLrSlug(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent"
            >
              <option value="terms">قوانین و مقررات (/terms)</option>
              <option value="privacy">حریم خصوصی (/privacy)</option>
            </select>
          </div>
          <div>
            <label htmlFor="lr-name" className="text-xs font-bold text-foreground">نام بازبین</label>
            <input
              id="lr-name"
              value={lrName}
              onChange={(e) => setLrName(e.target.value)}
              required
              maxLength={120}
              placeholder="مثلاً سرکار خانم موسوی"
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="lr-title" className="text-xs font-bold text-foreground">عنوان بازبین</label>
            <input
              id="lr-title"
              value={lrTitle}
              onChange={(e) => setLrTitle(e.target.value)}
              maxLength={120}
              placeholder="وکیل دادگستری"
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="lr-summary" className="text-xs font-bold text-foreground">جمع‌بندی بازبینی</label>
            <textarea
              id="lr-summary"
              value={lrSummary}
              onChange={(e) => setLrSummary(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="جمع‌بندی کوتاهی از آخرین بازبینی محتوای صفحه…"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-7 text-foreground outline-none transition-colors focus:border-accent"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={lrBusy}
              className="btn-gold inline-flex min-h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold transition-all disabled:opacity-50"
            >
              <Icon name="check" className="h-4 w-4" />
              {lrBusy ? "در حال ثبت…" : "ثبت بازبینی"}
            </button>
          </div>
        </form>

        <div className="mt-5" data-testid="legal-review-list">
          <h3 className="text-xs font-bold text-muted">بازبینی‌های ثبت‌شده</h3>
          {lrList.length ? (
            <ul className="mt-3 space-y-3">
              {lrList.map((r) => (
                <li key={r.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">
                        {PAGE_FA[r.pageSlug] ?? r.pageSlug} — {r.reviewerName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {r.reviewerTitle} • {formatJalaliLong(r.reviewedAt)}
                      </p>
                      {r.summary && <p className="mt-1 text-xs leading-6 text-muted">{r.summary}</p>}
                    </div>
                    <button
                      type="button"
                      disabled={lrBusy}
                      onClick={() => void removeLegalReview(r.id)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-danger/10 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
                      aria-label={`حذف بازبینی ${PAGE_FA[r.pageSlug] ?? r.pageSlug}`}
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                      حذف
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-center text-xs leading-6 text-muted">
              هنوز بازبینی‌ای ثبت نشده است؛ تا آن موقع نشان «بازبینی حقوقی» در صفحات نمایش داده نمی‌شود (غيبت صادقانه).
            </p>
          )}
        </div>
      </Card>
    </section>
    </>
  );
}
