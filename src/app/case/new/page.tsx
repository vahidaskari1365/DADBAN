"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Container, Button, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LEGAL_TOPICS, ALL_CITIES, faNum } from "@/lib/data";
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

const BUDGETS = ["زیر ۵ میلیون", "۵ تا ۲۰ میلیون", "۲۰ تا ۵۰ میلیون", "بالای ۵۰ میلیون", "هنوز مشخص نیست"];

function NewCaseContent() {
  const search = useSearchParams();
  const [form, setForm] = useState({
    subject: search.get("subject") ?? "",
    description: "",
    city: "",
    stage: "ثبت اولیه",
    budget: "",
    name: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ caseNumber: string; trackingToken: string; stageIndex: number } | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(null);
    if (!form.subject || !form.description || !form.city || !form.name || !form.phone) {
      setError("لطفاً همه فیلدهای ضروری را پر کنید.");
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
      setResult({ caseNumber: data.caseNumber, trackingToken: data.trackingToken, stageIndex: data.stageIndex });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت پرونده");
    } finally {
      setLoading(false);
    }
  };

  const fieldCls =
    "h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";
  const textareaCls = fieldCls + " h-auto min-h-[110px] resize-y py-2.5";

  if (result) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success">
              <Icon name="check" className="h-8 w-8" />
            </span>
            <h1 className="mt-5 text-2xl font-extrabold text-foreground">پرونده شما ثبت شد</h1>
            <p className="mt-2 text-sm leading-7 text-muted">
              پرونده‌ای با شماره <span className="font-bold text-primary" dir="ltr">{result.caseNumber}</span> ایجاد شد.
              کارشناسان دادبان آن را بررسی و وکلای مرتبط را معرفی می‌کنند.
              <br />کد پیگیری محرمانه: <span className="font-mono font-bold text-primary" dir="ltr">{result.trackingToken}</span>
            </p>
          </div>

          <Card hover={false} className="mt-8">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Icon name="folder" className="h-4 w-4 text-primary" /> مراحل پرونده
            </h2>
            <ol className="mt-4 space-y-0">
              {STAGES.map((s, i) => {
                const done = i <= result.stageIndex;
                const current = i === result.stageIndex;
                return (
                  <li key={s} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted"}`}>
                        {done ? <Icon name="check" className="h-3.5 w-3.5" /> : faNum(i + 1)}
                      </span>
                      {i < STAGES.length - 1 && <span className={`my-1 w-0.5 flex-1 ${done ? "bg-primary" : "bg-border"}`} style={{ minHeight: 18 }} />}
                    </div>
                    <div className="pb-4">
                      <p className={`text-sm font-semibold ${current ? "text-primary" : done ? "text-foreground" : "text-muted"}`}>
                        {s} {current && "• مرحله فعلی"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/dashboard/client">مشاهده در پنل موکل</Button>
            <Button href="/consultation" variant="outline" icon="chat">رزرو مشاوره فوری</Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-surface-2/60 to-background py-8">
        <Container>
          <nav className="flex items-center gap-1.5 text-xs text-muted">
            <Link href="/" className="hover:text-primary">خانه</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <span className="text-foreground-soft">ثبت پرونده</span>
          </nav>
          <h1 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">پرونده خود را ثبت کنید</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            اطلاعات پرونده را وارد کنید تا توسط کارشناسان بررسی و به وکلای متخصص مرتبط معرفی شود.
            شما هم می‌توانید خودتان وکیل انتخاب کنید.
          </p>
        </Container>
      </section>

      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_300px]">
        <Card hover={false} className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-foreground">موضوع پرونده *</span>
            <div className="flex flex-wrap gap-2">
              {LEGAL_TOPICS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => set("subject", t.label)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    form.subject === t.label ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground-soft hover:bg-primary-soft"
                  }`}
                >
                  <Icon name={t.icon} className="h-3.5 w-3.5" /> {t.label}
                </button>
              ))}
            </div>
            <input
              value={form.subject}
              onChange={(e) => set("subject", e.target.value)}
              placeholder="یا موضوع را تایپ کنید…"
              className={fieldCls + " mt-2"}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-foreground">شرح ماجرا *</span>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="اتفاقی که افتاده، طرف مقابل، خواسته شما و هر جزئیات مهم را بنویسید…"
              className={textareaCls}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-foreground">شهر *</span>
              <select value={form.city} onChange={(e) => set("city", e.target.value)} className={fieldCls}>
                <option value="">انتخاب شهر</option>
                {ALL_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-foreground">مرحله پرونده</span>
              <select value={form.stage} onChange={(e) => set("stage", e.target.value)} className={fieldCls}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-foreground">بودجه تقریبی (اختیاری)</span>
            <div className="flex flex-wrap gap-2">
              {BUDGETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => set("budget", b)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    form.budget === b ? "border-accent bg-accent-soft text-accent" : "border-border text-foreground-soft hover:bg-surface-2"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </label>

          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-foreground">نام و نام خانوادگی *</span>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="نام شما" className={fieldCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-foreground">شماره موبایل *</span>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="09123456789" dir="ltr" className={fieldCls + " text-right"} />
            </label>
          </div>

          {error && <div className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</div>}

          <Button onClick={submit} disabled={loading} icon="folder" className="w-full">
            {loading ? "در حال ثبت…" : "ثبت پرونده و معرفی وکیل"}
          </Button>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card hover={false}>
            <h3 className="flex items-center gap-2 font-bold text-foreground"><Icon name="bolt" className="h-4 w-4 text-accent" /> چرا پرونده ثبت کنم؟</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-foreground-soft">
              {["ارزیابی اولیه رایگان توسط کارشناسان", "معرفی به وکلای متخصص مرتبط", "پیگیری شفاف مرحله‌به‌مرحله", "امکان انتخاب وکیل دلخواه"].map((t) => (
                <li key={t} className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {t}</li>
              ))}
            </ul>
          </Card>
          <Card hover={false} className="bg-primary-soft/50">
            <p className="flex items-start gap-2 text-xs leading-6 text-foreground-soft">
              <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              اطلاعات پرونده شما کاملاً محرمانه است و تنها در اختیار وکلای موردنظر قرار می‌گیرد.
            </p>
          </Card>
        </aside>
      </Container>
    </>
  );
}

export default function NewCasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">
          در حال بارگذاری…
        </div>
      }
    >
      <NewCaseContent />
    </Suspense>
  );
}
