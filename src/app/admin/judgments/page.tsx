import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";

export const dynamic = "force-dynamic";

export default async function AdminJudgmentsPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <AdminCrudTable
      resource="judgments"
      title="مدیریت آرای قضایی"
      description="آرای رویهٔ قضایی (/judgments) — افزودن رأی جدید، ویرایش و حذف با سینک فوری."
      itemLabel="رأی"
      searchKeys={["title", "court", "subject"]}
      sortBy="sortOrder"
      columns={[
        { key: "title", label: "عنوان رأی" },
        { key: "court", label: "مرجع" },
        { key: "date", label: "تاریخ" },
        { key: "subject", label: "موضوع" },
      ]}
      fields={[
        { key: "title", label: "عنوان رأی", required: true, placeholder: "رأی وحدت رویه درباره…" },
        { key: "slug", label: "شناسه لاتین (slug)", required: true, placeholder: "j7" },
        { key: "court", label: "مرجع صادرکننده", placeholder: "دیوان عالی کشور" },
        { key: "date", label: "تاریخ", placeholder: "۱۴۰۲" },
        { key: "subject", label: "موضوع", placeholder: "خانواده / ملک / کیفری…" },
        { key: "summary", label: "خلاصه رأی", type: "textarea" },
        { key: "sortOrder", label: "ترتیب نمایش", type: "number" },
      ]}
    />
  );
}
