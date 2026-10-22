import { getAdminSession, hasPerm } from "@/lib/admin-auth";
import { roleLabel } from "@/lib/admin-permissions";
import AdminShell from "@/components/admin/admin-shell";
import { ADMIN_GROUPS, ADMIN_MENU } from "@/components/admin/nav-config";

/**
 * لایهٔ مشترک همهٔ صفحات /admin — سایدبار پایدار و منوی موبایل.
 *
 * - نشست ادمین سمت سرور خوانده می‌شود؛ آیتم‌های منو بر اساس دسترسی فیلتر می‌شوند.
 * - برای /admin/login (بدون نشست) فقط children رندر می‌شود تا صفحهٔ ورود تمیز بماند.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) return <>{children}</>;

  const items = ADMIN_MENU.filter((m) => !m.perm || hasPerm(session, m.perm)).map((m) => ({
    label: m.label,
    href: m.href,
    icon: m.icon,
    group: m.group,
  }));

  return (
    <AdminShell groups={ADMIN_GROUPS} items={items} userName={session.name} role={roleLabel(session.role)}>
      {children}
    </AdminShell>
  );
}
