"use client";

import { useState } from "react";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";
import { MoneyInput } from "@/components/money-input";
import { templateT } from "@/lib/i18n/core";

const TYPES = [
  "قرارداد اجاره", "قرارداد خرید و فروش", "قرارداد مشارکت", "قرارداد استخدام",
  "قرارداد محرمانگی (NDA)", "قرارداد پیمانکاری", "قرارداد سرمایه‌گذاری", "قرارداد شراکت",
];

const STEPS = ["نوع قرارداد", "طرف اول", "طرف دوم", "موضوع و مبلغ", "مدت و شروط", "پیش‌نمایش"];

export default function ContractBuilderPage() {
  const t = useT();
  const tt = templateT(t);
  const [step, setStep] = useState(0);
  const [type, setType] = useState("");
  const [party1, setParty1] = useState("");
  const [party2, setParty2] = useState("");
  const [subject, setSubject] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [terms, setTerms] = useState("");

  const canNext =
    (step === 0 && type) ||
    (step === 1 && party1) ||
    (step === 2 && party2) ||
    (step === 3 && subject) ||
    step === 4 ||
    step === 5;

  const preview = tt("قرارداد {type}\nبین طرف اول: {p1} و طرف دوم: {p2}\nموضوع: {subject}\nمبلغ: {amount}\nمدت قرارداد: {duration}\nشروط خاص: {terms}\n\nاین قرارداد پس از امضای طرفین لازم‌الاجرا است و بندهای آن مطابق قوانین جمهوری اسلامی ایران تنظیم شده است. این پیش‌نمایش توسط قراردادساز هوشمند دادورزان تولید شده و پیش از امضای نهایی، نیازمند بازبینی توسط وکیل متخصص است.", {
    type: type || "...",
    p1: party1 || "...",
    p2: party2 || "...",
    subject: subject || "...",
    amount: amount ? `${amount} ${t("تومان")}` : "...",
    duration: duration || "...",
    terms: terms || "—",
  });

  const fieldCls = "h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

  return (
    <>
      <PageHero variant="market" image="/images/hero-contract-builder.png" badge={t("قراردادساز")} title={t("قرارداد خود را گام‌به‌گام بسازید")} desc={t("نوع قرارداد را انتخاب کنید، اطلاعات را وارد نمایید و پیش‌نمایش را دریافت کنید؛ سپس وکیل آن را بازبینی می‌کند.")} breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("قراردادها"), href: "/contracts" }, { label: t("قراردادساز") }]} />

      <Container className="py-12">
        <div className="mx-auto max-w-3xl">
          {/* Progress */}
          <div className="mb-6 flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${i <= step ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted"}`}>
                  {i < step ? <Icon name="check" className="h-4 w-4" /> : i + 1}
                </span>
                <span className={`hidden text-[10px] sm:block ${i === step ? "font-bold text-foreground" : "text-muted"}`}>{t(s)}</span>
              </div>
            ))}
          </div>

          <Card hover={false} className="min-h-[280px]">
            {step === 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground">{t("نوع قرارداد را انتخاب کنید")}</h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {TYPES.map((ct) => (
                    <button key={ct} type="button" onClick={() => setType(ct)} className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-right text-sm font-medium transition-all cursor-pointer ${type === ct ? "border-primary bg-primary-soft text-primary" : "border-border text-foreground-soft hover:bg-surface-2"}`}>
                      <Icon name="document" className="h-4 w-4" /> {t(ct)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {step === 1 && (
              <label className="block"><span className="text-sm font-bold text-foreground">{t("مشخصات طرف اول")}</span><input value={party1} onChange={(e) => setParty1(e.target.value)} placeholder={t("نام و مشخصات طرف اول")} className={`${fieldCls} mt-3`} /></label>
            )}
            {step === 2 && (
              <label className="block"><span className="text-sm font-bold text-foreground">{t("مشخصات طرف دوم")}</span><input value={party2} onChange={(e) => setParty2(e.target.value)} placeholder={t("نام و مشخصات طرف دوم")} className={`${fieldCls} mt-3`} /></label>
            )}
            {step === 3 && (
              <div className="space-y-3">
                <label className="block"><span className="text-sm font-bold text-foreground">{t("موضوع قرارداد")}</span><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("موضوع قرارداد")} className={`${fieldCls} mt-2`} /></label>
                <label className="block"><span className="text-sm font-bold text-foreground">{t("مبلغ")}</span><MoneyInput value={amount} onValueChange={setAmount} placeholder={t("مبلغ به تومان")} className={`${fieldCls} mt-2`} /></label>
              </div>
            )}
            {step === 4 && (
              <div className="space-y-3">
                <label className="block"><span className="text-sm font-bold text-foreground">{t("مدت قرارداد")}</span><input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder={t("مثلاً: ۱۲ ماه")} className={`${fieldCls} mt-2`} /></label>
                <label className="block"><span className="text-sm font-bold text-foreground">{t("شروط خاص")}</span><textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} placeholder={t("شروط خاص قرارداد (اختیاری)")} className={`${fieldCls} mt-2 h-auto resize-y py-2.5`} /></label>
              </div>
            )}
            {step === 5 && (
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Icon name="document" className="h-5 w-5 text-primary" /> {t("پیش‌نمایش قرارداد")}</h2>
                <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-surface-2 p-4 text-sm leading-8 text-foreground-soft">{preview}</pre>
                <div className="mt-4 rounded-xl bg-primary-soft/50 p-3">
                  <p className="text-xs leading-6 text-foreground-soft">{t("برای دریافت نسخه‌ی نهایی و قانونی، قرارداد توسط وکیل متخصص بازبینی می‌شود.")}</p>
                  <Button href="/consultation" className="mt-3" icon="user">{t("بازبینی توسط وکیل")}</Button>
                </div>
              </div>
            )}

            {/* Nav */}
            {step < 5 && (
              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} className="text-sm font-medium text-muted hover:text-foreground">
                  {step === 0 ? "" : t("→ قبلی")}
                </button>
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext} icon="arrow" className="">{t("مرحله‌ی بعد")}</Button>
              </div>
            )}
          </Card>

          <p className="mt-4 text-center text-xs text-muted"><Badge tone="neutral">{t("توجه")}</Badge> {t("قراردادساز صرفاً پیش‌نمایش تولید می‌کند و جایگزین مشاوره‌ی وکیل نیست.")}</p>
        </div>
      </Container>
    </>
  );
}
