"use client";
import { formatJalali } from "@/lib/jalali";
import { CASE_STAGE_FLOW } from "@/lib/case-facts";
import { useState, useEffect } from "react";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";

const FA: Record<string, string> = { new: "جدید", reviewing: "در حال بررسی", matched: "تطبیق با وکیل", active: "فعال", closed: "بسته" };

export default function TrackCasePage() {
  const t = useT();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<null | { found: boolean; caseData?: { caseNumber: string; status: string; stage: string; createdAt: string; lastUpdatedAt: string }; error?: string }>(null);
  const [loading, setLoading] = useState(false);

  const runSearch = async (value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/cases/track?code=${encodeURIComponent(value.trim())}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ found: false, error: t("خطا در ارتباط با سرور") });
    } finally {
      setLoading(false);
    }
  };

  // پیگیری مستقیم با لینک /track-case?code=SHF-… (از ردیف پرونده‌های پنل وکیل و جاهای دیگر)
  // setState داخل timeout انجام می‌شود تا رندر آبشاری در effect رخ ندهد
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("code");
    if (!c) return;
    const t = setTimeout(() => {
      setCode(c);
      runSearch(c);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = () => runSearch(code);

  return (
    <>
      <PageHero badge={t("پیگیری پرونده")} title={t("پیگیری وضعیت پرونده")} desc={t("با وارد کردن کد پیگیری، وضعیت آخرین اقدامات پرونده خود را مشاهده کنید.")} breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پیگیری پرونده") }]} />
      <Container className="py-12">
        <div className="mx-auto max-w-lg">
          <Card hover={false}>
            <label className="block">
              <span className="text-sm font-bold text-foreground">{t("کد پیگیری پرونده")}</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder={t("کد محرمانهٔ پیگیری (۴۳ نویسه)")}
                dir="ltr"
                className="mt-2 h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <Button onClick={search} disabled={loading || !code.trim()} className="mt-4 w-full" icon="search">
              {loading ? t("در حال جستجو…") : t("پیگیری پرونده")}
            </Button>
          </Card>

          {result && !result.found && (
            <Card hover={false} className="mt-4 border-danger/30">
              <p className="text-sm font-semibold text-danger">{result.error ?? t("پرونده‌ای با این کد یافت نشد.")}</p>
            </Card>
          )}

          {result?.found && result.caseData && (
            <Card hover={false} className="mt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">{t("وضعیت پرونده")}</h3>
                <span className="font-mono text-xs text-muted" dir="ltr">{result.caseData.caseNumber}</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between rounded-xl bg-surface-2/60 p-3"><span className="text-muted">{t("وضعیت")}</span><Badge tone="primary">{t(FA[result.caseData.status] ?? result.caseData.status)}</Badge></div>
                <div className="flex justify-between rounded-xl bg-surface-2/60 p-3"><span className="text-muted">{t("تاریخ ثبت")}</span><span className="font-bold text-foreground">{formatJalali(result.caseData.createdAt)}</span></div>
              </div>

              {/* تایم‌لاین مراحل — «پرونده در چه حالی است» بدون نیاز به ورود */}
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-sm font-bold text-foreground">{t("پرونده در چه مرحله‌ای است؟")}</p>
                <div className="mt-3 space-y-0">
                  {(() => {
                    const idx = Math.max(0, CASE_STAGE_FLOW.indexOf(result.caseData.stage as (typeof CASE_STAGE_FLOW)[number]));
                    return CASE_STAGE_FLOW.map((title, i) => (
                      <div key={title} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                              i < idx
                                ? "border-success bg-success text-primary-foreground"
                                : i === idx
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-surface text-muted"
                            }`}
                          >
                            {i < idx ? <Icon name="check" className="h-3 w-3" /> : faNum(i + 1)}
                          </span>
                          {i < CASE_STAGE_FLOW.length - 1 && (
                            <span className={`h-5 w-0.5 ${i < idx ? "bg-success" : "bg-border"}`} />
                          )}
                        </div>
                        <p className={`-mt-0.5 pb-4 text-xs font-bold ${i === idx ? "text-primary" : i < idx ? "text-foreground" : "text-muted"}`}>
                          {t(title)}
                          {i === idx && <span className="mr-2 rounded-full bg-primary-soft px-2 py-0.5 text-[9px] font-bold text-primary">{t("مرحله فعلی")}</span>}
                        </p>
                      </div>
                    ));
                  })()}
                </div>
                <p className="mt-2 rounded-xl bg-primary-soft/50 p-3 text-[11px] leading-6 text-foreground-soft">
                  {t("برای جزئیات کامل (مدارک، پرداخت‌ها و اقدام بعدی) با همان شماره موبایل ثبت پرونده وارد حساب خود شوید.")}
                </p>
              </div>
            </Card>
          )}
        </div>
      </Container>
    </>
  );
}
