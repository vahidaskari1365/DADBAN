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

export const metadata: Metadata = { title: "خدمات من — دادبان" };
export const dynamic = "force-dynamic";

export default async function MyServices() {
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

  const nav = [
    { label: "نمای کلی", icon: "home" as IconKey, href: "/dashboard/client" },
    { label: "پرونده‌های من", icon: "folder" as IconKey, href: "/dashboard/cases" },
    { label: "خدمات من", icon: "briefcase" as IconKey, active: true, href: "/dashboard/services" },
    { label: "اسناد و مدارک", icon: "document" as IconKey, href: "/dashboard/documents" },
    { label: "رزرو مشاوره", icon: "calendar" as IconKey, href: "/consultation" },
    { label: "پیام‌ها", icon: "mail" as IconKey, href: "/support" },
  ];

  return (
    <DashboardShell role="موکل" title={`داشبورد ${user.name}`} nav={nav}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">خدمات من</h1>
          <p className="mt-1 text-sm text-muted">درخواست‌های پیگیری و انجام امور خود را اینجا مدیریت کنید.</p>
        </div>
        <Button href="/services" icon="plus" variant="primary">ثبت درخواست جدید</Button>
      </div>

      <div className="mt-6">
        {rows.length ? (
          <div className="space-y-3">
            {rows.map((r) => {
              const na = nextBestAction(r.req);
              return (
                <Link key={r.req.id} href={`/dashboard/services/${r.req.id}`} className="block">
                  <Card hover={false} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Icon name={(r.icon as IconKey) ?? "briefcase"} className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-bold text-foreground">{r.title ?? "خدمت"}</p>
                        <p className="text-xs text-muted" dir="ltr">{r.req.requestNumber}</p>
                        <p className="mt-1 text-sm text-muted">{na.label}</p>
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
            <p className="mt-3 text-sm text-muted">هنوز درخواستی ثبت نکرده‌اید.</p>
            <Button href="/services" icon="plus" className="mt-4">مشاهده خدمات</Button>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
