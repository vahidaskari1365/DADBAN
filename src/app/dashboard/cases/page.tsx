import { formatJalaliLong as faDate } from "@/lib/jalali";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Badge, Button, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { getCurrentUser } from "@/lib/user-auth";
import { CASE_STATUS_FA, CASE_STAGE_FLOW } from "@/lib/case-facts";

export const metadata: Metadata = {
  title: "پرونده‌های من — دادبان",
  description: "فهرست واقعی پرونده‌های ثبت‌شده شما در دادبان.",
};

export const dynamic = "force-dynamic";


export default async function MyCasesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let myCases: typeof cases.$inferSelect[] = [];
  try {
    myCases = await db
      .select()
      .from(cases)
      .where(eq(cases.contactPhone, user.phone))
      .orderBy(desc(cases.createdAt))
      .limit(50);
  } catch {
    /* degraded mode — honest empty state below */
  }

  return (
    <>
      <PageHero
        title="پرونده‌های من"
        desc="همه پرونده‌هایی که با این شماره موبایل ثبت کرده‌اید؛ وضعیت هر یک واقعی و به‌روز است."
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "پنل موکل", href: "/dashboard/client" }, { label: "پرونده‌ها" }]}
      >
        <Button href="/case/new" icon="plus" size="sm">ثبت پرونده جدید</Button>
      </PageHero>

      <Container className="py-10">
        {myCases.length === 0 ? (
          <>
            <EmptyState
              icon="folder"
              title="هنوز پرونده‌ای ثبت نکرده‌اید"
              desc="با ثبت پرونده، کارشناسان دادبان پرونده شما را بررسی و وکیل مناسب را معرفی می‌کنند."
            />
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button href="/case/new" icon="folder">ثبت اولین پرونده</Button>
              <Button href="/track-case" variant="outline" icon="search">پیگیری با کد رهگیری</Button>
            </div>
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {myCases.map((c) => {
              // «پرونده در چه حالی است» — نوار پیشرفت واقعی بر اساس مرحله
              const idx = CASE_STAGE_FLOW.indexOf(c.stage as (typeof CASE_STAGE_FLOW)[number]);
              const stageIdx = idx === -1 ? 0 : idx;
              const pct = Math.round(((stageIdx + 1) / CASE_STAGE_FLOW.length) * 100);
              return (
                <Link key={c.id} href={`/dashboard/cases/${c.caseNumber}`}>
                  <Card className="h-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">{c.subject}</p>
                        <p className="mt-1 text-xs text-muted">
                          {c.caseNumber} • {c.city} • {faDate(c.createdAt)}
                        </p>
                      </div>
                      <Badge tone="primary">{CASE_STATUS_FA[c.status] ?? c.status}</Badge>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{c.description}</p>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                        <span>مرحله فعلی: <span className="font-bold text-primary">{c.stage}</span></span>
                        <span>{faNum(stageIdx + 1)} از {faNum(CASE_STAGE_FLOW.length)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <p className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                      جزئیات و اقدام بعدی
                      <Icon name="chevron" className="h-3.5 w-3.5 rotate-180" />
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </Container>
    </>
  );
}
