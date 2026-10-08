"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container, Button, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LEGAL_TOPICS, ALL_CITIES, faNum } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import Link from "next/link";

const STAGES = [
  "ثبت اولیه",
  "بررسی مدارک",
  "تنظیم دادخواست",
  "ثبت در دادگاه",
  "تعیین شعبه",
  "جلسه اول",
  "صدور رأی",
  "تجدیدنظر",
];

/** مرحله فانل → مرحله فرم پرونده */
const FUNNEL_STAGE_MAP: Record<string, string> = {
  "هنوز اقدامی نکرده‌ام": "ثبت اولیه",
  "اظهارنامه/اخطار داده‌ام": "تنظیم دادخواست",
  "در دادگاه/دادسراست": "ثبت در دادگاه",
  "رأی صادر شده": "صدور رأی",
  "مرحله اجرا": "مرحله اجرا",
};

interface FunnelCtx {
  topic: string;
  stage: string;
  province: string;
}

function NewCaseContent() {
  const search = useSearchParams();
  const router = useRouter();
  const t = useT();

  const [form, setForm] = useState({
    subject: search.get("subject") ?? search.get("topic") ?? "",
    description: "",
    city: search.get("province") ?? "",
    stage: "ثبت اولیه", // مقدار اولیه برای API — نمایش با t() ترجمه می‌شود
    name: "",
    phone: "",
  });
  /** زمینه‌ی فانل که فرم با آن خودکار پر شده — برای نمایش جعبه‌ی «انتخاب‌های قبلی شما» */
  const [prefilled, setPrefilled] = useState(false);
  /** کاربر با حساب خود وارد شده — پرونده به «پرونده‌های من» پنل موکل متصل می‌شود */
  const [accountLinked, setAccountLinked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // prefill از انتخاب‌های فانل (localStorage) — یک‌بار در اولین اجرای مرورگر
  useEffect(() => {
    queueMicrotask(() => {
      let ctx: FunnelCtx | null = null;
      try {
        const raw = window.localStorage.getItem("dadban_funnel");
        if (raw) ctx = JSON.parse(raw) as FunnelCtx;
      } catch {
        /* حافظه محلی در دسترس نیست */
      }
      if (!ctx) return;
      setForm((f) => ({
        ...f,
        subject: f.subject || (ctx ? ctx.topic : ""),
        city: f.city || (ctx ? ctx.province : ""),
        stage: ctx && FUNNEL_STAGE_MAP[ctx.stage] ? FUNNEL_STAGE_MAP[ctx.stage] : f.stage,
      }));
      setPrefilled(true);
    });
  }, []);

  // prefill نام و موبایل از حساب کاربری — تضمین می‌کند پرونده با شماره‌ی همان
  // حساب ثبت شود و در «پرونده‌های من» پنل موکل ظاهر گردد
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d.user) {
          setForm((f) => ({
            ...f,
            name: f.name || d.user.name || "",
            phone: f.phone || d.user.phone || "",
          }));
          setAccountLinked(true);
        }
      })
      .catch(() => {
        /* مهمان — بدون اتصال حساب */
      });
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(null);
    if (!form.subject || !form.city || !form.name || !form.phone) {
      setError(t("لطفاً فیلدهای ضروری (موضوع، شهر، نام و موبایل) را پر کنید."));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      // زمینه پرداخت برای صفحه بعد — نمایش خلاصه پرونده و کد رهگیری
      try {
        window.sessionStorage.setItem(
          "dadban_pay_ctx",
          JSON.stringify({
            caseNumber: data.caseNumber,
            trackingToken: data.trackingToken,
            subject: form.subject,
            city: form.city,
            stage: form.stage,
          }),
        );
        // فانل مصرف شد — برای ثبت بعدی پاک می‌شود
        window.localStorage.removeItem("dadban_funnel");
      } catch {
        /* حافظه در دسترس نیست */
      }
      router.push(`/case/pay?cn=${encodeURIComponent(data.caseNumber)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("خطا در ثبت پرونده"));
      setLoading(false);
    }
  };

  const fieldCls =
    "h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";
  const textareaCls = fieldCls + " h-auto min-h-[110px] resize-y py-2.5";

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-surface-2/60 to-background py-8">
        <Container>
          <nav className="flex items-center gap-1.5 text-xs text-muted">
            <Link href="/" className="hover:text-primary">{t("خانه")}</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <span className="text-foreground-soft">{t("ثبت پرونده")}</span>
          </nav>
          <h1 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">{t("پرونده خود را ثبت کنید")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            {t("انتخاب‌های قبلی شما از مسیر سریع، خودکار در این فرم قرار گرفته است.")}
            {" "}
            {t("اگر موردی را می‌خواهید تغییر دهید، همین‌جا امکانش هست — فقط توضیحات تکمیلی و راه تماس با شما باقی مانده است.")}
          </p>
        </Container>
      </section>

      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {prefilled && (
            <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/5 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                <Icon name="check" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">{t("انتخاب‌های قبلی شما بازسازی شد")}</p>
                <p className="mt-0.5 text-xs leading-6 text-muted">
                  {t("موضوع، مرحله و استان از پاسخ‌های قبلی شما پر شده است — هر کدام را خواستید، همین فرم تغییر دهید.")}
                </p>
              </div>
            </div>
          )}

          <Card hover={false} className="space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-foreground">{t("موضوع پرونده *")}</span>
              <div className="flex flex-wrap gap-2">
                {LEGAL_TOPICS.map((topic) => (
                  <button
                    key={topic.label}
                    type="button"
                    onClick={() => set("subject", topic.label)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                      form.subject === topic.label ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground-soft hover:bg-primary-soft"
                    }`}
                  >
                    <Icon name={topic.icon} className="h-3.5 w-3.5" /> {t(topic.label)}
                  </button>
                ))}
              </div>
              <input
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
                placeholder={t("یا موضوع را تایپ کنید…")}
                className={fieldCls + " mt-2"}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-foreground">
                {t("توضیحات تکمیلی")} <span className="text-xs font-normal text-muted">({t("اختیاری")})</span>
              </span>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder={t("اگر جزئیاتی هست که کمک می‌کند — طرف مقابل، خواسته شما، تاریخ‌ها و مدارک مهم — اینجا بنویسید…")}
                className={textareaCls}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-foreground">{t("شهر *")}</span>
                <select value={form.city} onChange={(e) => set("city", e.target.value)} className={fieldCls}>
                  <option value="">{t("انتخاب شهر")}</option>
                  {ALL_CITIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-foreground">{t("مرحله پرونده")}</span>
                <select value={form.stage} onChange={(e) => set("stage", e.target.value)} className={fieldCls}>
                  {STAGES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                </select>
              </label>
            </div>

            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-foreground">{t("نام و نام خانوادگی *")}</span>
                <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t("نام شما")} className={fieldCls} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-foreground">{t("شماره موبایل *")}</span>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className={fieldCls + " text-right"} placeholder="09123456789" />
              </label>
            </div>

            {accountLinked && (
              <p className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary-soft/50 px-3 py-2.5 text-xs leading-6 text-foreground-soft">
                <Icon name="user" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("با حساب خود وارد شده‌اید؛ این پرونده با همین شماره به «پرونده‌های من» در پنل موکل متصل می‌شود و روند آن را همان‌جا مرحله‌به‌مرحله می‌بینید.")}
              </p>
            )}

            {error && <div className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</div>}

            <Button onClick={submit} disabled={loading} icon="folder" className="w-full">
              {loading ? t("در حال ثبت…") : t("ثبت پرونده و ادامه به پرداخت")}
            </Button>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card hover={false}>
            <h3 className="flex items-center gap-2 font-bold text-foreground"><Icon name="bolt" className="h-4 w-4 text-accent-text" /> {t("بعد از ثبت چه می‌شود؟")}</h3>
            <ol className="mt-3 space-y-2.5 text-sm text-foreground-soft">
              {[
                t("پرونده با شماره پیگیری ثبت می‌شود"),
                t("درگاه پرداخت را انتخاب می‌کنید"),
                t("کارشناسان هزینه نهایی را تعیین و پرونده را به وکلای متخصص معرفی می‌کنند"),
                t("روند پرونده در پنل موکل قابل پیگیری است"),
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">{faNum(i + 1)}</span>
                  {step}
                </li>
              ))}
            </ol>
          </Card>
          <Card hover={false} className="bg-primary-soft/50">
            <p className="flex items-start gap-2 text-xs leading-6 text-foreground-soft">
              <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              {t("اطلاعات پرونده شما کاملاً محرمانه است و تنها در اختیار وکلای موردنظر قرار می‌گیرد.")}
            </p>
          </Card>
        </aside>
      </Container>
    </>
  );
}

export default function NewCasePage() {
  const t = useT();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">
          {t("در حال بارگذاری…")}
        </div>
      }
    >
      <NewCaseContent />
    </Suspense>
  );
}
