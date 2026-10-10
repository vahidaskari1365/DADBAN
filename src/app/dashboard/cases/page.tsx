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
import { isLawyerSideRole } from "@/lib/roles";
import { CASE_STATUS_FA, CASE_STAGE_FLOW } from "@/lib/case-facts";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("پرونده‌های من — دادبان"),
    description: t("فهرست واقعی پرونده‌های ثبت‌شده شما در دادبان."),
  };
}

export const dynamic = "force-dynamic";


export default async function MyCasesPage() {
  const t = await getT();
  const locale = await getServerLocale();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isLawyerSideRole(user.role)) redirect("/dashboard/lawyer");

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

  // ترجمهٔ محتوای DB (موضوع/شهر/توضیح پرونده) برای زبان‌های غیرفارسی
  const myCasesView = await Promise.all(
    myCases.map(async (c) => ({
      ...c,
      subjectT: await tdyn(locale, c.subject, 300),
      cityT: await tdyn(locale, c.city, 120),
      descT: c.description ? await tdyn(locale, c.description, 600) : c.description,
    })),
  );

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-dash-cases.png"
        title={t("پرونده‌های من")}
        desc={t("همه پرونده‌هایی که با این شماره موبایل ثبت کرده‌اید؛ وضعیت هر یک واقعی و به‌روز است.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پنل موکل"), href: "/dashboard/client" }, { label: t("پرونده‌ها") }]}
      >
        <Button href="/case/new" variant="accent" icon="plus" size="sm">{t("ثبت پرونده جدید")}</Button>
      </PageHero>

      <Container className="py-10">
        {myCasesView.length === 0 ? (
          <>
            <EmptyState
              icon="folder"
              title={t("هنوز پرونده‌ای ثبت نکرده‌اید")}
              desc={t("با ثبت پرونده، کارشناسان دادبان پرونده شما را بررسی و وکیل مناسب را معرفی می‌کنند.")}
            />
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button href="/case/new" icon="folder">{t("ثبت اولین پرونده")}</Button>
              <Button href="/track-case" variant="outline" icon="search">{t("پیگیری با کد رهگیری")}</Button>
            </div>
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {myCasesView.map((c) => {
              // «پرونده در چه حالی است» — نوار پیشرفت واقعی بر اساس مرحله
              const idx = CASE_STAGE_FLOW.indexOf(c.stage as (typeof CASE_STAGE_FLOW)[number]);
              const stageIdx = idx === -1 ? 0 : idx;
              const pct = Math.round(((stageIdx + 1) / CASE_STAGE_FLOW.length) * 100);
              return (
                <Link key={c.id} href={`/dashboard/cases/${c.caseNumber}`}>
                  <Card className="h-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">{c.subjectT}</p>
                        <p className="mt-1 text-xs text-muted">
                          {c.caseNumber} • {c.cityT} • {faDate(c.createdAt)}
                        </p>
                      </div>
                      <Badge tone="primary">{t(CASE_STATUS_FA[c.status] ?? c.status)}</Badge>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{c.descT}</p>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                        <span>{t("مرحله فعلی:")} <span className="font-bold text-primary">{t(c.stage)}</span></span>
                        <span>{faNum(stageIdx + 1)} {t("از")} {faNum(CASE_STAGE_FLOW.length)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <p className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                      {t("جزئیات و اقدام بعدی")}
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
