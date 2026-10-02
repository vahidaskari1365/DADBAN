import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { desc } from "drizzle-orm";
import { isAdmin } from "@/lib/admin-auth";
import { PageHero } from "@/components/page-hero";
import { Card, Container } from "@/components/ui";
import { Icon } from "@/components/icons";
import { toFa } from "@/lib/money";
import MatchingTable, { type MatchingRow } from "./matching-table";

export const metadata: Metadata = {
  title: "مانیتور تطبیق هوشمند — پنل مدیریت دادپیو",
  description: "پایش موتور تطبیق هوشمند دادپیو: دسته‌بندی AI پرونده‌ها، درصد اطمینان، تخمین هزینه و تحلیل مجدد.",
};
export const dynamic = "force-dynamic";

export default async function AdminMatchingPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  let rows: MatchingRow[] = [];
  try {
    const data = await db
      .select({
        id: cases.id,
        caseNumber: cases.caseNumber,
        subject: cases.subject,
        description: cases.description,
        specialty: cases.specialty,
        city: cases.city,
        status: cases.status,
        progress: cases.progress,
        urgency: cases.urgency,
        aiCategory: cases.aiCategory,
        aiConfidence: cases.aiConfidence,
        aiEstimate: cases.aiEstimate,
        contractStatus: cases.contractStatus,
        createdAt: cases.createdAt,
      })
      .from(cases)
      .orderBy(desc(cases.createdAt))
      .limit(60);
    rows = Array.isArray(data)
      ? data.map((r) => ({
          ...r,
          description: r.description.slice(0, 1500),
          createdAt: r.createdAt,
        }))
      : [];
  } catch {
    rows = [];
  }

  /* ---------------- توزیع دسته‌ها (AI یا تخصص) ---------------- */
  const dist = new Map<string, number>();
  for (const r of rows) {
    const key = (r.aiCategory || r.specialty || "عمومی").trim();
    dist.set(key, (dist.get(key) ?? 0) + 1);
  }
  const distList = [...dist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCount = distList[0]?.[1] ?? 1;

  const analyzed = rows.filter((r) => r.aiCategory).length;
  const avgConfidence =
    analyzed > 0 ? Math.round(rows.reduce((s, r) => s + (r.aiCategory ? r.aiConfidence : 0), 0) / analyzed) : 0;
  const urgent = rows.filter((r) => r.urgency === "high").length;

  return (
    <>
      <PageHero
        badge="Admin · تطبیق AI"
        title="مانیتور تطبیق هوشمند"
        desc="پایش موتور تطبیق دادپیو — ترکیب تخصص وکلا، امتیاز و تحلیل هوش مصنوعی روی پرونده‌های بازار"
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "پنل مدیریت", href: "/admin" }, { label: "تطبیق هوشمند" }]}
      />
      <Container className="py-10">
        {/* ---------------- توضیح موتور ---------------- */}
        <Card hover={false} className="border-accent/30 bg-accent-soft/30">
          <div className="flex flex-wrap items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-white">
              <Icon name="sparkles" className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-extrabold text-foreground">موتور تطبیق هوشمند دادپیو</h2>
              <p className="mt-1 text-sm leading-7 text-muted">
                هر پرونده هنگام ثبت، با تحلیل متن (LLM + قواعد قطعی) دسته‌بندی و بر اساس تخصص وکلا، امتیاز و رتبه،
                سابقه و شهر، به بهترین وکلای پلتفرم تطبیق داده می‌شود. درصد اطمینان و تخمین هزینه/مدت نیز تولید می‌شود؛
                مدیر می‌تواند هر پرونده را «تحلیل مجدد» کند.
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-foreground-soft">
                <span>پرونده‌های تحلیل‌شده: {toFa(analyzed)} از {toFa(rows.length)}</span>
                <span>میانگین اطمینان: {toFa(avgConfidence)}٪</span>
                <span className="text-danger">فوری: {toFa(urgent)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* ---------------- توزیع دسته‌ها ---------------- */}
        <Card hover={false} className="mt-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-foreground">
            <Icon name="filter" className="h-4.5 w-4.5 text-accent" />
            توزیع دسته‌های پرونده
          </h2>
          {distList.length === 0 ? (
            <p className="text-sm text-muted">پرونده‌ای برای تحلیل توزیع وجود ندارد.</p>
          ) : (
            <div className="space-y-3">
              {distList.map(([label, count]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-xs font-bold text-foreground">{label}</span>
                  <div className="h-5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${Math.max(6, Math.round((count / maxCount) * 100))}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-left text-xs font-bold text-foreground-soft">
                    {toFa(count)} مورد
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ---------------- جدول پرونده‌ها + تحلیل مجدد ---------------- */}
        <div className="mt-6">
          <MatchingTable rows={rows} />
        </div>
      </Container>
    </>
  );
}
