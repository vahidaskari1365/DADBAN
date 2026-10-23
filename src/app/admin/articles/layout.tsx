import { redirect } from "next/navigation";
import { guardAdminPage } from "@/lib/admin-auth";

/**
 * گارد سرور-رندر برای همهٔ صفحات ادمین مقالات (فهرست/جدید/ویرایش).
 * فیکس defense-in-depth: این صفحات client-only بودند و پوستهٔ پنل برای
 * کاربر ناشناس هم رندر می‌شد (داده‌ها با 401 محافظت بودند ولی همین
 * وجودِ پوسته، نقشهٔ پنل را لو می‌داد).
 */
export default async function AdminArticlesLayout({ children }: { children: React.ReactNode }) {
  await guardAdminPage("articles");
  return <>{children}</>;
}
