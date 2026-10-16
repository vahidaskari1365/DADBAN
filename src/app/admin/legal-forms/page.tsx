import { guardAdminPage } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";

export const dynamic = "force-dynamic";

export default async function AdminLegalFormsPage() {
  await guardAdminPage("knowledge");
  return (
    <AdminCrudTable
      resource="legal-forms"
      title="مدیریت فرم‌های حقوقی"
      description="فرم‌های آماده (/legal-forms) — مدارک لازم و مراحل هر فرم، با سینک فوری."
      itemLabel="فرم"
      searchKeys={["name", "description"]}
      sortBy="sortOrder"
      columns={[
        { key: "name", label: "نام فرم" },
        { key: "description", label: "توضیح" },
        { key: "icon", label: "آیکون" },
      ]}
      fields={[
        { key: "name", label: "نام فرم", required: true, placeholder: "مثلاً دادخواست" },
        { key: "slug", label: "شناسه لاتین (slug)", required: true, placeholder: "dadkhasat" },
        { key: "description", label: "توضیح", type: "textarea" },
        { key: "docs", label: "مدارک لازم", type: "csv" },
        { key: "steps", label: "مراحل تنظیم", type: "csv" },
        { key: "icon", label: "آیکون (gavel / mail / document / file)", placeholder: "gavel" },
        { key: "sortOrder", label: "ترتیب نمایش", type: "number" },
      ]}
    />
  );
}
