import { guardAdminPage } from "@/lib/admin-auth";
import { PageHero } from "@/components/page-hero";
import AdminsClient from "./admins-client";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminAdminsPage() {
  await guardAdminPage("admins");
  const t = await getT();
  return (
    <>
      <PageHero
        badge={t("Admin · ادمین‌ها")}
        title={t("مدیریت ادمین‌ها و دسترسی‌ها")}
        desc={t("ساخت حساب ادمین برای همکاران با تعیین دقیق دسترسی هر بخش — جدای از کاربران سایت.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پنل مدیریت"), href: "/admin" }, { label: t("ادمین‌ها") }]}
      />
      <AdminsClient />
    </>
  );
}
