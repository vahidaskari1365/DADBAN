"use client";

import { useState, type ReactNode } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { faNum } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";

/* ————— داده‌های پیش‌فرض (همه قابل ویرایش توسط کاربر) ————— */

/** سال‌های محاسبهٔ شاخص مهریه */
const MAHR_YEARS: number[] = Array.from({ length: 15 }, (_, i) => 1390 + i); // ۱۳۹۰..۱۴۰۴

/** شاخص بهای کالا و خدمات مصرفی (تقریبی، پایهٔ ۱۳۹۰) — صرفاً پیش‌فرض آموزشی و قابل ویرایش */
const SHAKHES_PER_YEAR: Record<number, number> = {
  1390: 100, 1391: 120, 1392: 150, 1393: 178, 1394: 200,
  1395: 227, 1396: 258, 1397: 295, 1398: 345, 1399: 440,
  1400: 585, 1401: 755, 1402: 955, 1403: 1170, 1404: 1400,
};

/** سال‌های دیه با مبالغ پیش‌فرض */
const DIYA_YEARS: number[] = [1398, 1399, 1400, 1401, 1402, 1403, 1404];

/** دیهٔ کامل به ریال — تقریبی مطابق اعلام قوهٔ قضاییه؛ قابل ویرایش */
const DIYA_FULL_RIAL: Record<number, number> = {
  1398: 3_300_000_000,
  1399: 4_500_000_000,
  1400: 5_000_000_000,
  1401: 6_000_000_000,
  1402: 7_200_000_000,
  1403: 9_000_000_000,
  1404: 11_250_000_000,
};

/** مرز پله‌های تعرفهٔ حق‌الوکالهٔ دعاوی مالی (تومان) */
const FEE_B1 = 10_000_000;
const FEE_B2 = 100_000_000;
const FEE_B3 = 1_000_000_000;

/* ————— helperها ————— */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** تبدیل ارقام فارسی/عربی به لاتین برای پارس ورودی */
function toEnDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (d) => {
    const i = FA_DIGITS.indexOf(d);
    return String(i >= 0 ? i : AR_DIGITS.indexOf(d));
  });
}

/** خواندن عدد از رشتهٔ ورودی (ارقام فارسی/عربی/لاتین) */
function numFrom(s: string): number {
  const v = Number(toEnDigits(String(s)).replace(/[^\d.-]/g, ""));
  return Number.isFinite(v) ? v : 0;
}

/** عدد با جداکنندهٔ هزارگان + ارقام فارسی */
function formatToman(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return faNum("0");
  return faNum(Math.round(n).toLocaleString("en-US"));
}

const fieldCls =
  "h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-foreground-soft">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] leading-5 text-muted">{hint}</span> : null}
    </label>
  );
}

function CalcHead({
  icon,
  title,
  desc,
  resetLabel,
  onReset,
}: {
  icon: IconKey;
  title: string;
  desc: string;
  resetLabel: string;
  onReset: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs leading-5 text-muted">{desc}</p>
        </div>
      </div>
      <Button variant="outline" icon="x" onClick={onReset} className="shrink-0">
        {resetLabel}
      </Button>
    </div>
  );
}

function ApproxBadge({ label }: { label: string }) {
  return <Badge tone="accent">{label}</Badge>;
}

/* ————— ① محاسبه‌گر مهریه ————— */

function MahrCalc() {
  const t = useT();
  const [amount, setAmount] = useState("1000000000");
  const [contractYear, setContractYear] = useState(1395);
  const [payYear, setPayYear] = useState(1404);
  const [idxFrom, setIdxFrom] = useState(String(SHAKHES_PER_YEAR[1395]));
  const [idxTo, setIdxTo] = useState(String(SHAKHES_PER_YEAR[1404]));

  const reset = () => {
    setAmount("1000000000");
    setContractYear(1395);
    setPayYear(1404);
    setIdxFrom(String(SHAKHES_PER_YEAR[1395]));
    setIdxTo(String(SHAKHES_PER_YEAR[1404]));
  };

  const a = numFrom(amount);
  const f = numFrom(idxFrom);
  const to = numFrom(idxTo);
  const ok = f > 0;
  const result = ok ? a * (to / f) : 0;
  const ratio = ok ? to / f : 0;

  return (
    <Card hover={false} data-testid="calc-mahr">
      <CalcHead
        icon="balance"
        title={t("محاسبه‌گر مهریه")}
        desc={t("مهریهٔ روز بر پایهٔ شاخص بهای کالا و خدمات مصرفی (مادهٔ ۱۰۹۱ قانون مدنی)")}
        resetLabel={t("بازنشانی")}
        onReset={reset}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t("مبلغ مهریه (تومان)")} hint={t("نتیجه با هر تغییر، زنده به‌روز می‌شود")}>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("مثلاً ۱۰۰۰۰۰۰۰۰۰")}
              className={fieldCls}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:col-span-2">
          <Field label={t("سال عقد")}>
            <select
              value={contractYear}
              onChange={(e) => {
                const y = Number(e.target.value);
                setContractYear(y);
                setIdxFrom(String(SHAKHES_PER_YEAR[y] ?? ""));
              }}
              className={`${fieldCls} cursor-pointer`}
            >
              {MAHR_YEARS.map((y) => (
                <option key={y} value={y}>
                  {t("سال")} {faNum(y)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("سال پرداخت")}>
            <select
              value={payYear}
              onChange={(e) => {
                const y = Number(e.target.value);
                setPayYear(y);
                setIdxTo(String(SHAKHES_PER_YEAR[y] ?? ""));
              }}
              className={`${fieldCls} cursor-pointer`}
            >
              {MAHR_YEARS.map((y) => (
                <option key={y} value={y}>
                  {t("سال")} {faNum(y)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t("شاخص سال عقد")} hint={t("از آرایهٔ پیش‌فرض پُر می‌شود — قابل ویرایش")}>
          <input type="number" min={0} value={idxFrom} onChange={(e) => setIdxFrom(e.target.value)} className={fieldCls} />
        </Field>
        <Field label={t("شاخص سال پرداخت")} hint={t("از آرایهٔ پیش‌فرض پُر می‌شود — قابل ویرایش")}>
          <input type="number" min={0} value={idxTo} onChange={(e) => setIdxTo(e.target.value)} className={fieldCls} />
        </Field>
      </div>

      <div data-testid="calc-mahr-result" className="mt-5 rounded-2xl border border-primary/20 bg-primary-soft/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground-soft">{t("مهریهٔ روز")}</span>
          <ApproxBadge label={t("تقریبی")} />
        </div>
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {formatToman(result)} <span className="text-sm font-semibold text-muted">{t("تومان")}</span>
        </p>
        <p className="mt-1 text-[11px] leading-5 text-muted">
          {t("فرمول: مبلغ مهریه × (شاخص سال پرداخت ÷ شاخص سال عقد)")}
          {ok ? (
            <>
              {" — "}
              {t("ضریب")}: {faNum(ratio.toFixed(2))} {t("برابر")}
            </>
          ) : null}
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-muted">
        {t("شاخص پیش‌فرض تقریبی است؛ برای استناد رسمی، شاخص اعلامی بانک مرکزی/مرکز آمار را وارد کنید.")}
      </p>
    </Card>
  );
}

/* ————— ② محاسبه‌گر دیه ————— */

function DiyaCalc() {
  const t = useT();
  const [year, setYear] = useState(1404);
  const [amount, setAmount] = useState(String(DIYA_FULL_RIAL[1404]));
  const [percent, setPercent] = useState("100");
  const [haram, setHaram] = useState(false);

  const reset = () => {
    setYear(1404);
    setAmount(String(DIYA_FULL_RIAL[1404]));
    setPercent("100");
    setHaram(false);
  };

  const p = Math.min(100, Math.max(0, numFrom(percent)));
  const full = numFrom(amount);
  const rial = full * (p / 100) * (haram ? 4 / 3 : 1);
  const toman = rial / 10;

  return (
    <Card hover={false} data-testid="calc-diya">
      <CalcHead
        icon="scale"
        title={t("محاسبه‌گر دیه")}
        desc={t("دیهٔ کامل سال، درصد جنایت و ضریب ماه حرام")}
        resetLabel={t("بازنشانی")}
        onReset={reset}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label={t("سال دیه")} hint={t("مبالغ پیش‌فرض طبق اعلام قوهٔ قضاییه — قابل ویرایش")}>
          <select
            value={year}
            onChange={(e) => {
              const y = Number(e.target.value);
              setYear(y);
              setAmount(String(DIYA_FULL_RIAL[y] ?? ""));
            }}
            className={`${fieldCls} cursor-pointer`}
          >
            {DIYA_YEARS.map((y) => (
              <option key={y} value={y}>
                {t("سال")} {faNum(y)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("دیهٔ کامل (ریال)")} hint={t("مبلغ پیش‌فرض بر اساس سال انتخابی — قابل ویرایش")}>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={fieldCls}
          />
        </Field>
        <Field label={t("درصد دیه (۰ تا ۱۰۰)")}>
          <input type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} className={fieldCls} />
        </Field>
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-foreground-soft">{t("درصدهای سریع")}</span>
          <div className="flex flex-wrap gap-2">
            {[100, 75, 50, 25].map((q) => (
              <button
                key={q}
                type="button"
                aria-pressed={p === q}
                onClick={() => setPercent(String(q))}
                className={`inline-flex h-11 min-w-[52px] cursor-pointer items-center justify-center rounded-xl px-3 text-sm font-bold transition-all ${
                  p === q
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-surface text-foreground-soft hover:bg-surface-2"
                }`}
              >
                {faNum(q)}٪
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-surface-2/50 px-4 py-3">
        <input
          type="checkbox"
          checked={haram}
          onChange={(e) => setHaram(e.target.checked)}
          className="h-5 w-5 shrink-0 accent-[var(--primary)]"
          data-testid="diya-haram"
        />
        <span className="text-sm font-medium text-foreground">{t("جنایت در ماه حرام (افزودن یک‌سوم — ×۴/۳)")}</span>
      </label>

      <div data-testid="calc-diya-result" className="mt-5 rounded-2xl border border-primary/20 bg-primary-soft/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground-soft">{t("دیهٔ محاسبه‌شده")}</span>
          <ApproxBadge label={t("تقریبی")} />
        </div>
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {formatToman(rial)} <span className="text-sm font-semibold text-muted">{t("ریال")}</span>
        </p>
        <p className="mt-1 text-[11px] leading-5 text-muted">
          {t("معادل")}: {formatToman(toman)} {t("تومان")} — {t("فرمول: دیهٔ کامل × (درصد ÷ ۱۰۰)")}{haram ? ` ${t("× ۴/۳ (ماه حرام)")}` : ""}
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-muted">
        {t("مبالغ دیه از منابع رسمی (اعلام قوهٔ قضاییه) الگو گرفته‌اند اما صرفاً پیش‌فرضند؛ برای استناد رسمی، مبلغ اعلامی سال جاری را وارد کنید.")}
      </p>
    </Card>
  );
}

/* ————— ③ خسارت تأخیر تأدیهٔ دیه ————— */

function DelayCalc() {
  const t = useT();
  const [amount, setAmount] = useState(String(DIYA_FULL_RIAL[1404]));
  const [years, setYears] = useState("1");
  const [months, setMonths] = useState("0");
  const [days, setDays] = useState("0");
  const [rate, setRate] = useState("10");

  const reset = () => {
    setAmount(String(DIYA_FULL_RIAL[1404]));
    setYears("1");
    setMonths("0");
    setDays("0");
    setRate("10");
  };

  const y = numFrom(years);
  const m = numFrom(months);
  const d = numFrom(days);
  const r = numFrom(rate);
  const factor = y + m / 12 + d / 365;
  const result = numFrom(amount) * (r / 100) * factor;
  const toman = result / 10;

  return (
    <Card hover={false} data-testid="calc-delay">
      <CalcHead
        icon="clock"
        title={t("خسارت تأخیر تأدیهٔ دیه")}
        desc={t("محاسبهٔ خسارت تأخیر بر مبنای مبلغ دیه و مدت تأخیر")}
        resetLabel={t("بازنشانی")}
        onReset={reset}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t("مبلغ دیه (ریال)")}>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={fieldCls}
            />
          </Field>
        </div>
        <Field label={t("نرخ سالانه (درصد)")} hint={t("پیش‌فرض ۱۰٪ طبق قانون — قابل ویرایش")}>
          <input type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} className={fieldCls} />
        </Field>
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-foreground-soft">{t("مدت تأخیر")}</span>
          <div className="grid grid-cols-3 gap-2">
            <Field label={t("سال")}>
              <input type="number" min={0} value={years} onChange={(e) => setYears(e.target.value)} className={fieldCls} />
            </Field>
            <Field label={t("ماه")}>
              <input type="number" min={0} max={11} value={months} onChange={(e) => setMonths(e.target.value)} className={fieldCls} />
            </Field>
            <Field label={t("روز")}>
              <input type="number" min={0} max={365} value={days} onChange={(e) => setDays(e.target.value)} className={fieldCls} />
            </Field>
          </div>
        </div>
      </div>

      <div data-testid="calc-delay-result" className="mt-5 rounded-2xl border border-primary/20 bg-primary-soft/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground-soft">{t("خسارت تأخیر")}</span>
          <ApproxBadge label={t("تقریبی")} />
        </div>
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {formatToman(result)} <span className="text-sm font-semibold text-muted">{t("ریال")}</span>
        </p>
        <p className="mt-1 text-[11px] leading-5 text-muted">
          {t("معادل")}: {formatToman(toman)} {t("تومان")} — {t("فرمول: مبلغ دیه × نرخ × (سال + ماه/۱۲ + روز/۳۶۵)")}
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-muted">
        {t("نرخ سالانهٔ پیش‌فرض ۱۰٪ طبق «قانون نحوهٔ محاسبهٔ خسارت تأخیر تأدیهٔ دیه» است و قابل ویرایش؛ خسارت تا سقف دیهٔ کامل محاسبه می‌شود.")}
      </p>
    </Card>
  );
}

/* ————— ④ هزینهٔ دادرسی ————— */

function CourtFeeCalc() {
  const t = useT();
  const [kind, setKind] = useState<"mali" | "ghayr">("mali");
  const [claim, setClaim] = useState("100000000");
  const [stage, setStage] = useState<"badavi" | "tajdid" | "fargham">("badavi");
  const [rBadavi, setRBadavi] = useState("3");
  const [rTajdid, setRTajdid] = useState("2");
  const [rFargham, setRFargham] = useState("1");
  const [fixed, setFixed] = useState("500000");

  const reset = () => {
    setKind("mali");
    setClaim("100000000");
    setStage("badavi");
    setRBadavi("3");
    setRTajdid("2");
    setRFargham("1");
    setFixed("500000");
  };

  const rateNow =
    stage === "badavi" ? numFrom(rBadavi) : stage === "tajdid" ? numFrom(rTajdid) : numFrom(rFargham);
  const result = kind === "mali" ? numFrom(claim) * (rateNow / 100) : numFrom(fixed);

  const kinds: { id: "mali" | "ghayr"; label: string }[] = [
    { id: "mali", label: t("دعوای مالی") },
    { id: "ghayr", label: t("دعوای غیرمالی") },
  ];

  return (
    <Card hover={false} data-testid="calc-court-fee">
      <CalcHead
        icon="landmark"
        title={t("محاسبه‌گر هزینهٔ دادرسی")}
        desc={t("هزینهٔ دادرسی دعاوی مالی و غیرمالی در مراحل مختلف")}
        resetLabel={t("بازنشانی")}
        onReset={reset}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold text-foreground-soft">{t("نوع دعوی")}</span>
          <div className="flex flex-wrap gap-2">
            {kinds.map((k) => (
              <button
                key={k.id}
                type="button"
                aria-pressed={kind === k.id}
                onClick={() => setKind(k.id)}
                className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-xl px-5 text-sm font-bold transition-all ${
                  kind === k.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-surface text-foreground-soft hover:bg-surface-2"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        {kind === "mali" ? (
          <>
            <Field label={t("مبلغ خواسته (تومان)")}>
              <input
                type="text"
                inputMode="numeric"
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                className={fieldCls}
              />
            </Field>
            <Field label={t("مرحلهٔ دادرسی")}>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as "badavi" | "tajdid" | "fargham")}
                className={`${fieldCls} cursor-pointer`}
              >
                <option value="badavi">
                  {t("بدوی")} ({faNum(numFrom(rBadavi))}٪)
                </option>
                <option value="tajdid">
                  {t("تجدیدنظر")} ({faNum(numFrom(rTajdid))}٪)
                </option>
                <option value="fargham">
                  {t("فرجام")} ({faNum(numFrom(rFargham))}٪)
                </option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-foreground-soft">{t("نرخ هر مرحله (درصد) — قابل ویرایش")}</span>
              <div className="grid grid-cols-3 gap-2">
                <Field label={t("بدوی")}>
                  <input type="number" min={0} value={rBadavi} onChange={(e) => setRBadavi(e.target.value)} className={fieldCls} />
                </Field>
                <Field label={t("تجدیدنظر")}>
                  <input type="number" min={0} value={rTajdid} onChange={(e) => setRTajdid(e.target.value)} className={fieldCls} />
                </Field>
                <Field label={t("فرجام")}>
                  <input type="number" min={0} value={rFargham} onChange={(e) => setRFargham(e.target.value)} className={fieldCls} />
                </Field>
              </div>
            </div>
          </>
        ) : (
          <div className="sm:col-span-2">
            <Field
              label={t("هزینهٔ ثابت دعوای غیرمالی (تومان)")}
              hint={t("قابل ویرایش بر اساس مصوبهٔ سال جاری")}
            >
              <input
                type="text"
                inputMode="numeric"
                value={fixed}
                onChange={(e) => setFixed(e.target.value)}
                className={fieldCls}
              />
            </Field>
          </div>
        )}
      </div>

      <div data-testid="calc-court-fee-result" className="mt-5 rounded-2xl border border-primary/20 bg-primary-soft/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground-soft">{t("هزینهٔ دادرسی")}</span>
          <ApproxBadge label={t("تقریبی")} />
        </div>
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {formatToman(result)} <span className="text-sm font-semibold text-muted">{t("تومان")}</span>
        </p>
        <p className="mt-1 text-[11px] leading-5 text-muted">
          {kind === "mali"
            ? `${t("فرمول: مبلغ خواسته × نرخ مرحلهٔ دادرسی")} (${t(stage === "badavi" ? "بدوی" : stage === "tajdid" ? "تجدیدنظر" : "فرجام")}: ${faNum(rateNow)}٪)`
            : t("مبلغ ثابت ورودی — به‌جای محاسبهٔ درصدی")}
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-muted">
        {kind === "mali"
          ? t("نرخ پیش‌فرض طبق قانون وصول برخی از درآمدهای دولت: ۳٪ خواسته در بدوی، ۲٪ در تجدیدنظر و ۱٪ در فرجام — نرخ‌ها قابل ویرایش است.")
          : t("مبلغ پیش‌فرض صرفاً تقریبی است؛ مصوبهٔ رسمی هزینهٔ دادرسی غیرمالی هر سال متفاوت اعلام می‌شود.")}
      </p>
    </Card>
  );
}

/* ————— ⑤ حق‌الوکالهٔ دعاوی مالی ————— */

function LawyerFeeCalc() {
  const t = useT();
  const [capital, setCapital] = useState("50000000");
  const [fixed1, setFixed1] = useState("300000");
  const [r2, setR2] = useState("6");
  const [r3, setR3] = useState("5");
  const [r4, setR4] = useState("4");
  const [appeal, setAppeal] = useState("60");
  const [withAppeal, setWithAppeal] = useState(false);

  const reset = () => {
    setCapital("50000000");
    setFixed1("300000");
    setR2("6");
    setR3("5");
    setR4("4");
    setAppeal("60");
    setWithAppeal(false);
  };

  const cap = numFrom(capital);
  const f1 = numFrom(fixed1);
  const n2 = numFrom(r2) / 100;
  const n3 = numFrom(r3) / 100;
  const n4 = numFrom(r4) / 100;
  const ap = numFrom(appeal) / 100;

  const share1 = cap > 0 ? f1 : 0;
  const share2 = Math.max(0, Math.min(cap, FEE_B2) - FEE_B1) * n2;
  const share3 = Math.max(0, Math.min(cap, FEE_B3) - FEE_B2) * n3;
  const share4 = Math.max(0, cap - FEE_B3) * n4;
  const badavi = share1 + share2 + share3 + share4;
  const total = withAppeal ? badavi * (1 + ap) : badavi;

  return (
    <Card hover={false} data-testid="calc-fee-lawyer">
      <CalcHead
        icon="coins"
        title={t("محاسبه‌گر حق‌الوکاله (دعاوی مالی)")}
        desc={t("محاسبهٔ پله‌ای تعرفهٔ حق‌الوکاله بر اساس سرمایهٔ دعوی")}
        resetLabel={t("بازنشانی")}
        onReset={reset}
      />

      <div className="mt-5">
        <Field label={t("سرمایهٔ دعوی (تومان)")}>
          <input
            type="text"
            inputMode="numeric"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
            className={fieldCls}
          />
        </Field>
      </div>

      {/* جدول زندهٔ پله‌ها */}
      <div className="mt-5 overflow-x-auto nice-scroll">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="pb-2 text-start font-semibold">{t("پله")}</th>
              <th className="pb-2 text-start font-semibold">{t("بازهٔ سرمایهٔ دعوی")}</th>
              <th className="pb-2 text-start font-semibold">{t("نرخ (قابل ویرایش)")}</th>
              <th className="pb-2 text-end font-semibold">{t("سهم این پله (تومان)")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="py-2 font-semibold text-foreground">{t("پلهٔ اول")}</td>
              <td className="py-2 text-muted">{t("تا")} {formatToman(FEE_B1)}</td>
              <td className="py-2">
                <input
                  aria-label={t("مبلغ ثابت پلهٔ اول (تومان)")}
                  type="text"
                  inputMode="numeric"
                  value={fixed1}
                  onChange={(e) => setFixed1(e.target.value)}
                  className={`${fieldCls} w-28`}
                />
              </td>
              <td className="py-2 text-end font-semibold text-foreground">{formatToman(share1)}</td>
            </tr>
            <tr className="border-t border-border">
              <td className="py-2 font-semibold text-foreground">{t("پلهٔ دوم")}</td>
              <td className="py-2 text-muted">{t("مازاد تا")} {formatToman(FEE_B2)}</td>
              <td className="py-2">
                <span className="flex items-center gap-1">
                  <input
                    aria-label={t("نرخ پلهٔ دوم (درصد)")}
                    type="number"
                    min={0}
                    value={r2}
                    onChange={(e) => setR2(e.target.value)}
                    className={`${fieldCls} w-20`}
                  />
                  <span className="text-xs text-muted">٪</span>
                </span>
              </td>
              <td className="py-2 text-end font-semibold text-foreground">{formatToman(share2)}</td>
            </tr>
            <tr className="border-t border-border">
              <td className="py-2 font-semibold text-foreground">{t("پلهٔ سوم")}</td>
              <td className="py-2 text-muted">{t("مازاد تا")} {formatToman(FEE_B3)}</td>
              <td className="py-2">
                <span className="flex items-center gap-1">
                  <input
                    aria-label={t("نرخ پلهٔ سوم (درصد)")}
                    type="number"
                    min={0}
                    value={r3}
                    onChange={(e) => setR3(e.target.value)}
                    className={`${fieldCls} w-20`}
                  />
                  <span className="text-xs text-muted">٪</span>
                </span>
              </td>
              <td className="py-2 text-end font-semibold text-foreground">{formatToman(share3)}</td>
            </tr>
            <tr className="border-t border-border">
              <td className="py-2 font-semibold text-foreground">{t("پلهٔ چهارم")}</td>
              <td className="py-2 text-muted">{t("مازاد بیشتر")}</td>
              <td className="py-2">
                <span className="flex items-center gap-1">
                  <input
                    aria-label={t("نرخ پلهٔ چهارم (درصد)")}
                    type="number"
                    min={0}
                    value={r4}
                    onChange={(e) => setR4(e.target.value)}
                    className={`${fieldCls} w-20`}
                  />
                  <span className="text-xs text-muted">٪</span>
                </span>
              </td>
              <td className="py-2 text-end font-semibold text-foreground">{formatToman(share4)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <label className="mt-4 flex min-h-11 cursor-pointer flex-wrap items-center gap-2.5 rounded-xl border border-border bg-surface-2/50 px-4 py-3">
        <input
          type="checkbox"
          checked={withAppeal}
          onChange={(e) => setWithAppeal(e.target.checked)}
          className="h-5 w-5 shrink-0 accent-[var(--primary)]"
          data-testid="fee-appeal"
        />
        <span className="text-sm font-medium text-foreground">{t("با مرحلهٔ تجدیدنظر (افزودن درصد زیر به حق‌الوکالهٔ بدوی)")}</span>
        <span className="ms-auto flex items-center gap-1">
          <input
            aria-label={t("درصد تجدیدنظر")}
            type="number"
            min={0}
            value={appeal}
            onChange={(e) => setAppeal(e.target.value)}
            disabled={!withAppeal}
            className={`${fieldCls} w-20`}
          />
          <span className="text-xs text-muted">٪</span>
        </span>
      </label>

      <div data-testid="calc-fee-lawyer-result" className="mt-5 rounded-2xl border border-primary/20 bg-primary-soft/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground-soft">{t("حق‌الوکالهٔ وکیل")}</span>
          <ApproxBadge label={t("تقریبی")} />
        </div>
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {formatToman(total)} <span className="text-sm font-semibold text-muted">{t("تومان")}</span>
        </p>
        <p className="mt-1 text-[11px] leading-5 text-muted">
          {t("بدوی")}: {formatToman(badavi)} {t("تومان")}
          {withAppeal ? (
            <>
              {" — "}
              {t("با احتساب تجدیدنظر")} (+{faNum(numFrom(appeal))}٪)
            </>
          ) : null}
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-muted">
        {t("پله‌های پیش‌فرض بر مبنای آیین‌نامهٔ تعرفهٔ حق‌الوکاله است: پلهٔ اول مبلغ ثابت، سپس ۶٪، ۵٪ و ۴٪ بر مازاد — همهٔ مقادیر قابل ویرایش‌اند.")}
      </p>
    </Card>
  );
}

/* ————— پوستهٔ صفحه با تب‌های سگمنتال ————— */

type CalcId = "mahr" | "diya" | "delay" | "court-fee" | "fee-lawyer";

export function CalculatorsClient() {
  const t = useT();
  const [active, setActive] = useState<CalcId>("mahr");

  const TABS: { id: CalcId; label: string; icon: IconKey }[] = [
    { id: "mahr", label: "مهریه", icon: "balance" },
    { id: "diya", label: "دیه", icon: "scale" },
    { id: "delay", label: "تأخیر دیه", icon: "clock" },
    { id: "court-fee", label: "هزینهٔ دادرسی", icon: "landmark" },
    { id: "fee-lawyer", label: "حق‌الوکاله", icon: "coins" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <p className="mb-5 text-center text-sm leading-6 text-muted">
        {t("مبلغ‌ها و نرخ‌های پیش‌فرض قابل ویرایش‌اند و نتیجه با هر تغییر، زنده محاسبه می‌شود.")}
      </p>

      <div
        role="tablist"
        aria-label={t("محاسبه‌گرهای حقوقی")}
        data-testid="calc-tabs"
        className="flex gap-2 overflow-x-auto pb-1 nice-scroll"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-bold transition-all ${
              active === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-surface text-foreground-soft hover:bg-surface-2"
            }`}
          >
            <Icon name={tab.icon} className="h-4 w-4" />
            {t(tab.label)}
          </button>
        ))}
      </div>

      {/* همهٔ محاسبه‌گرها mount می‌مانند تا state با جابه‌جایی تب از دست نرود */}
      <div className="mt-5" hidden={active !== "mahr"}>
        <MahrCalc />
      </div>
      <div className="mt-5" hidden={active !== "diya"}>
        <DiyaCalc />
      </div>
      <div className="mt-5" hidden={active !== "delay"}>
        <DelayCalc />
      </div>
      <div className="mt-5" hidden={active !== "court-fee"}>
        <CourtFeeCalc />
      </div>
      <div className="mt-5" hidden={active !== "fee-lawyer"}>
        <LawyerFeeCalc />
      </div>

      {/* هشدار صادقانه + CTA */}
      <Reveal className="mt-8">
        <Card hover={false} className="border-accent/30 bg-accent-soft/40" data-testid="calc-disclaimer">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
              <Icon name="bolt" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">{t("این محاسبات تقریبی و آموزشی است")}</p>
              <p className="mt-1 text-xs leading-6 text-muted">
                {t(
                  "نرخ‌ها، شاخص‌ها و مبالغ پیش‌فرض ممکن است با اعلامیه‌های رسمی روز (بانک مرکزی، مرکز آمار و قوهٔ قضاییه) تفاوت داشته باشند؛ برای استناد رسمی، نتایج را با نرخ‌های رسمی روز تطبیق دهید.",
                )}
              </p>
            </div>
            <Button href="/consultation" variant="accent" icon="user" className="shrink-0">
              {t("مشاوره با وکیل")}
            </Button>
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
