import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { serviceRequestEvents, serviceRequestDocs, serviceQuotes, managedServices } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard-shell";
import Link from "next/link";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";
import { getCurrentUser } from "@/lib/user-auth";
import { resolveRequestFor, isOperative } from "@/lib/managed-services";
import UserRequestDetail from "@/components/user-request-detail";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";

export const dynamic = "force-dynamic";

export default async function MyServiceRequest({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const locale = await getServerLocale();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // وکیل/عملیات: این صفحه نمای موکل است (پرداخت و بارگذاری موکل) — کارپرداز باید از کنسول /manage اقدام کند
  if (isOperative(user.role)) redirect("/manage");
  const { id: idParam } = await params;
  const id = Number(idParam);
  const req = await resolveRequestFor(user, id);
  if (!req) notFound();

  let svc: { title: string; slug: string; icon: string; requiresLawyer: boolean } | undefined;
  let events: typeof serviceRequestEvents.$inferSelect[] = [];
  let quotes: typeof serviceQuotes.$inferSelect[] = [];
  let docs: typeof serviceRequestDocs.$inferSelect[] = [];
  try {
    [[svc], events, quotes, docs] = await Promise.all([
      db.select({ title: managedServices.title, slug: managedServices.slug, icon: managedServices.icon, requiresLawyer: managedServices.requiresLawyer }).from(managedServices).where(eq(managedServices.id, req.serviceId)).limit(1),
      db.select().from(serviceRequestEvents).where(eq(serviceRequestEvents.requestId, id)).orderBy(desc(serviceRequestEvents.createdAt)),
      db.select().from(serviceQuotes).where(eq(serviceQuotes.requestId, id)).orderBy(desc(serviceQuotes.createdAt)).limit(3),
      db.select().from(serviceRequestDocs).where(eq(serviceRequestDocs.requestId, id)).orderBy(desc(serviceRequestDocs.createdAt)),
    ]);
  } catch (err) {
    console.error("[dadban] service request detail query failed:", err);
  }

  const visibleEvents = events.filter((e) => e.visibleToUser);

  // ترجمهٔ محتوای DB (عنوان خدمت، موضوع درخواست، رویدادها) برای زبان‌های غیرفارسی
  const [svcTitleT, reqTitleT, reqDescT] = await Promise.all([
    svc ? tdyn(locale, svc.title, 300) : Promise.resolve(""),
    req.title ? tdyn(locale, req.title, 300) : Promise.resolve(req.title ?? ""),
    req.description ? tdyn(locale, req.description, 700) : Promise.resolve(req.description ?? ""),
  ]);
  const eventsView = await Promise.all(
    visibleEvents.map(async (e) => ({
      ...e,
      titleT: await tdyn(locale, e.title, 250),
      descT: e.description ? await tdyn(locale, e.description, 500) : e.description,
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

  const canCancel = !isOperative(user.role) && ["DRAFT", "SUBMITTED", "REVIEWING", "AWAITING_DOCUMENTS", "QUOTED", "AWAITING_PAYMENT"].includes(req.status);

  return (
    <DashboardShell
      role={isOperative(user.role) ? "وکیل" : "موکل"}
      title={t("جزئیات درخواست خدمت")}
      name={user.name}
      back={{ fallback: "/dashboard/services", label: t("بازگشت به خدمات") }}
      nav={nav}
    >
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/dashboard/services" className="hover:text-primary">{t("خدمات من")}</Link>
        <Icon name="chevron" className="h-4 w-4" />
        <span>{t("جزئیات درخواست")}</span>
      </div>
      <UserRequestDetail
        request={{
          id: req.id,
          requestNumber: req.requestNumber,
          title: reqTitleT ?? req.title,
          status: req.status,
          urgency: req.urgency,
          price: req.price,
          paymentStatus: req.paymentStatus,
          contractStatus: req.contractStatus,
          finalReport: req.finalReport,
          resultFileLabel: req.resultFileLabel,
          description: reqDescT ?? req.description,
        }}
        service={svc ? { ...svc, title: svcTitleT ?? svc.title } : null}
        events={eventsView.map((e) => ({ ...e, title: e.titleT, description: e.descT ?? "" })) as any}
        quotes={quotes as any}
        docs={docs as any}
        canCancel={canCancel}
      />
    </DashboardShell>
  );
}
