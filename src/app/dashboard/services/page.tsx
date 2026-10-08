import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { serviceRequests, managedServices } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";
import { faNum } from "@/lib/data";
import { getCurrentUser } from "@/lib/user-auth";
import { StatusBadge, UrgencyBadge } from "@/components/managed";
import { nextBestAction, faNumSafe } from "@/lib/managed-labels";
import { isOperative } from "@/lib/managed-services";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("خدمات من — دادبان") };
}
export const dynamic = "force-dynamic";

export default async function MyServices() {
  const t = await getT();
  const locale = await getServerLocale();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let rows: any[] = [];
  try {
    rows = await db
      .select({
        req: serviceRequests,
        title: managedServices.title,
        slug: managedServices.slug,
        icon: managedServices.icon,
      })
      .from(serviceRequests)
      .leftJoin(managedServices, eq(serviceRequests.serviceId, managedServices.id))
      .where(eq(serviceRequests.userId, user.id))
      .orderBy(desc(serviceRequests.createdAt))
      .limit(50);
  } catch {
    /* degraded */
  }

  // ترجمهٔ محتوای DB (عنوان خدمت کاتالوگ و موضوع درخواست) برای زبان‌های غیرفارسی
  const rowsView = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      titleT: r.title ? await tdyn(locale, r.title, 300) : r.title,
      reqTitleT: r.req.title ? await tdyn(locale, r.req.title, 300) : r.req.title,
    })),
  );

  const nav = [
    { label: t("نمای کلی"), icon: "home" as IconKey, href: isOperative(user.role) ? "/dashboard/lawyer" : "/dashboard/client" },
    { label: t("پرونده‌های من"), icon: "folder" as IconKey, href: "/dashboard/cases" },
    { label: t("خدمات من"), icon: "briefcase" as IconKey, active: true, href: "/dashboard/services" },
    { label: t("اسناد و مدارک"), icon: "document" as IconKey, href: "/dashboard/documents" },
    { label: t("رزرو مشاوره"), icon: "calendar" as IconKey, href: "/consultation" },
    { label: t("پیام‌ها"), icon: "mail" as IconKey, href: "/support" },
  ];

  return (
    <DashboardShell
      role={isOperative(user.role) ? "وکیل" : "موکل"}
      title={t("خدمات من")}
      name={user.name}
      back={{ fallback: isOperative(user.role) ? "/dashboard/lawyer" : "/dashboard/client", label: t("بازگشت به داشبورد") }}
      nav={nav}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm leading-7 text-muted">{t("درخواست‌های پیگیری و انجام امور خود را اینجا مدیریت کنید.")}</p>
        <Button href="/services" icon="plus" variant="primary" className="shrink-0">{t("ثبت درخواست جدید")}</Button>
      </div>

      <div className="mt-6">
        {rows.length ? (
          <div className="space-y-3">
            {rowsView.map((r) => {
              const na = nextBestAction(r.req);
              return (
                <Link key={r.req.id} href={`/dashboard/services/${r.req.id}`} className="block">
                  <Card hover={false} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Icon name={(r.icon as IconKey) ?? "briefcase"} className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-bold text-foreground">{r.titleT ?? t("خدمت")}</p>
                        {/* موضوع واقعی درخواست — همان‌طور که موکل نوشته */}
                        {r.req.title && r.req.title !== r.title && (
                          <p className="mt-0.5 text-sm font-bold text-foreground">{r.reqTitleT}</p>
                        )}
                        <p className="text-xs text-muted" dir="ltr">{r.req.requestNumber}</p>
                        <p className="mt-1 text-sm text-muted">{t(na.label)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <UrgencyBadge urgency={r.req.urgency} />
                      <StatusBadge status={r.req.status} />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card hover={false} className="text-center">
            <Icon name="briefcase" className="mx-auto h-10 w-10 text-muted" />
            <p className="mt-3 text-sm text-muted">{t("هنوز درخواستی ثبت نکرده‌اید.")}</p>
            <Button href="/services" icon="plus" className="mt-4">{t("مشاهده خدمات")}</Button>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
