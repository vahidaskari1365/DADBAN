import { formatJalali } from "@/lib/jalali";
"use client";
import { useState } from "react";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button, Badge } from "@/components/ui";

const FA: Record<string, string> = { new: "جدید", reviewing: "در حال بررسی", matched: "تطبیق با وکیل", active: "فعال", closed: "بسته" };

export default function TrackCasePage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<null | { found: boolean; caseData?: any; error?: string }>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/cases/track?code=${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ found: false, error: "خطا در ارتباط با سرور" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHero badge="پیگیری پرونده" title="پیگیری وضعیت پرونده" desc="با وارد کردن کد پیگیری، وضعیت آخرین اقدامات پرونده خود را مشاهده کنید." breadcrumb={[{ label: "خانه", href: "/" }, { label: "پیگیری پرونده" }]} />
      <Container className="py-12">
        <div className="mx-auto max-w-lg">
          <Card hover={false}>
            <label className="block">
              <span className="text-sm font-bold text-foreground">کد پیگیری پرونده</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="مثلاً SHF-1024"
                dir="ltr"
                className="mt-2 h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <Button onClick={search} disabled={loading || !code.trim()} className="mt-4 w-full" icon="search">
              {loading ? "در حال جستجو…" : "پیگیری پرونده"}
            </Button>
          </Card>

          {result && !result.found && (
            <Card hover={false} className="mt-4 border-danger/30">
              <p className="text-sm font-semibold text-danger">{result.error ?? "پرونده‌ای با این کد یافت نشد."}</p>
            </Card>
          )}

          {result?.found && result.caseData && (
            <Card hover={false} className="mt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">وضعیت پرونده</h3>
                <span className="font-mono text-xs text-muted" dir="ltr">{result.caseData.caseNumber}</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between rounded-xl bg-surface-2/60 p-3"><span className="text-muted">وضعیت</span><Badge tone="primary">{FA[result.caseData.status] ?? result.caseData.status}</Badge></div>
                <div className="flex justify-between rounded-xl bg-surface-2/60 p-3"><span className="text-muted">تاریخ ثبت</span><span className="font-bold text-foreground">{formatJalali(result.caseData.createdAt)}</span></div>
              </div>

            </Card>
          )}
        </div>
      </Container>
    </>
  );
}
