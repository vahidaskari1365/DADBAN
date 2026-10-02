"use client";

import { useState } from "react";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";

interface Finding { type: "risk" | "info"; label: string; detail: string }

export default function ContractReviewPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ findings: Finding[]; riskScore: number } | null>(null);

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "contract", contract: text }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setResult({ findings: data.findings, riskScore: data.riskScore });
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در تحلیل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHero badge="بررسی قرارداد" title="قرارداد خود را هوشمندانه تحلیل کنید" desc="متن قرارداد را درج کنید تا بندهای پرریسک، جریمه‌ها، تعهدات و ابهامات شناسایی شوند. سپس برای دقت نهایی، وکیل آن را بررسی می‌کند." breadcrumb={[{ label: "خانه", href: "/" }, { label: "قراردادها", href: "/contracts" }, { label: "بررسی قرارداد" }]} />

      <Container className="py-12">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card hover={false} className="space-y-3">
            <label htmlFor="cr" className="text-sm font-bold text-foreground">متن قرارداد را درج کنید</label>
            <textarea id="cr" value={text} onChange={(e) => setText(e.target.value)} rows={9} placeholder="متن قرارداد خود را اینجا قرار دهید…" className="w-full resize-y rounded-xl border border-border-strong bg-background p-3 text-sm leading-7 text-foreground outline-none transition-colors focus:border-primary" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{text.length} کاراکتر</span>
              <Button onClick={analyze} disabled={loading || !text.trim()} icon="file">{loading ? "در حال تحلیل…" : "تحلیل قرارداد"}</Button>
            </div>
          </Card>

          {error && <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</div>}

          {result && (
            <div className="space-y-4 animate-fade-up">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: result.findings.length, l: "مورد شناسایی‌شده" },
                  { v: result.findings.filter((f) => f.type === "risk").length, l: "بند پرریسک" },
                  { v: result.riskScore === 0 ? "کم" : result.riskScore <= 2 ? "متوسط" : "زیاد", l: "سطح ریسک" },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl border border-border bg-surface p-4 text-center"><p className="text-2xl font-extrabold text-foreground">{s.v}</p><p className="text-xs text-muted">{s.l}</p></div>
                ))}
              </div>
              {result.findings.map((f, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-2xl border p-4 ${f.type === "risk" ? "border-[color-mix(in_oklab,var(--danger)_30%,transparent)] bg-[color-mix(in_oklab,var(--danger)_6%,transparent)]" : "border-border bg-surface"}`}>
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${f.type === "risk" ? "bg-danger/15 text-danger" : "bg-primary-soft text-primary"}`}><Icon name={f.type === "risk" ? "alert" : "check"} className="h-4 w-4" /></span>
                  <div><p className="text-sm font-bold text-foreground">{f.label}</p><p className="mt-0.5 text-xs leading-5 text-muted">{f.detail}</p></div>
                </div>
              ))}
              <Card hover={false} className="bg-primary-soft/50 text-center">
                <p className="text-sm text-foreground">برای رفع بندهای پرریسک و تنظیم نهایی، با وکیل مشورت کنید.</p>
                <Button href="/consultation" className="mt-3" icon="user">دریافت مشاوره</Button>
              </Card>
            </div>
          )}
        </div>
      </Container>
    </>
  );
}
