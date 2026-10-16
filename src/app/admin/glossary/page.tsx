import { guardAdminPage } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";

export const dynamic = "force-dynamic";

export default async function AdminGlossaryPage() {
  await guardAdminPage("knowledge");
  return (
    <AdminCrudTable
      resource="glossary"
      title="مدیریت واژه‌نامه حقوقی"
      description="واژه‌های /glossary — افزودن، ویرایش و حذف با سینک فوری به سایت."
      itemLabel="واژه"
      searchKeys={["term", "slug", "pro"]}
      sortBy="sortOrder"
      columns={[
        { key: "term", label: "واژه" },
        { key: "slug", label: "شناسه (slug)" },
        { key: "simple", label: "تعریف ساده" },
        { key: "related", label: "مرتبط" },
      ]}
      fields={[
        { key: "term", label: "واژه", required: true, placeholder: "مثلاً اعسار" },
        { key: "slug", label: "شناسه لاتین (slug)", required: true, placeholder: "aesar" },
        { key: "simple", label: "تعریف ساده", type: "textarea" },
        { key: "pro", label: "تعریف حقوقی (تخصصی)", type: "textarea" },
        { key: "example", label: "مثال", type: "textarea" },
        { key: "related", label: "واژه‌های مرتبط", type: "csv" },
        { key: "sortOrder", label: "ترتیب نمایش", type: "number" },
      ]}
    />
  );
}
