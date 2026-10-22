import { redirect } from "next/navigation";
import { getAdminSession, hasAnyPerm } from "@/lib/admin-auth";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { MediaManager } from "@/components/admin/media-manager";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * کتابخانه رسانه ادمین (/admin/media) — مدیریت تصاویر آپلودی که در CrudTableها
 * و محتوای صفحات استفاده می‌شوند. دسترسی: media / articles / content / knowledge.
 */
export default async function AdminMediaPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (!hasAnyPerm(session, ["media", "articles", "content", "knowledge"])) redirect("/admin?denied=media");
  const t = await getT();

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-admin.png"
        badge={t("Admin · رسانه")}
        title={t("کتابخانه رسانه")}
        desc={t("بارگذاری، کپی نشانی و حذف تصاویر سایت — تصاویر بزرگ خودکار بهینه می‌شوند.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پنل مدیریت"), href: "/admin" }, { label: t("رسانه") }]}
      />
      <Container className="py-10">
        <MediaManager />
      </Container>
    </>
  );
}
