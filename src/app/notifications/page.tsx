import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

/**
 * /notifications — لیست اعلان‌های دمو حذف شد (گمراه‌کننده بود).
 * اعلان‌های واقعی کاربر در پنل داشبورد با SSE زنده نمایش داده می‌شود
 * (NotificationsPanel از /api/notifications + /api/notifications/stream).
 * این مسیر فقط بر اساس نقش به پنل درست هدایت می‌کند.
 */
export default async function NotificationsRedirectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const isLawyerSide =
    user.role === "lawyer" || user.role === "trainee" || user.role === "team" || user.role === "staff" || user.role === "supervisor";
  redirect(isLawyerSide ? "/dashboard/lawyer" : "/dashboard/client");
}
