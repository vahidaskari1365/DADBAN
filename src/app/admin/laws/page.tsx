import { guardAdminPage } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";

export const dynamic = "force-dynamic";

export default async function AdminLawsPage() {
  await guardAdminPage("knowledge");
  return (
    <AdminCrudTable
      resource="laws"
      title="مدیریت قوانین"
      description="قوانین مرکز قوانین (/laws) — افزودن قانون جدید، ویرایش و حذف با سینک فوری."
      itemLabel="قانون"
      searchKeys={["name", "subjects", "summary"]}
      sortBy="sortOrder"
      columns={[
        { key: "name", label: "نام قانون" },
        { key: "year", label: "سال" },
        { key: "authority", label: "مرجع تصویب" },
        { key: "status", label: "وضعیت" },
        { key: "subjects", label: "موضوعات" },
      ]}
      fields={[
        { key: "name", label: "نام قانون", required: true, placeholder: "مثلاً قانون مدنی" },
        { key: "slug", label: "شناسه لاتین (slug)", required: true, placeholder: "ghanun-madani" },
        { key: "year", label: "سال تصویب", placeholder: "۱۳۰۷" },
        { key: "authority", label: "مرجع تصویب" },
        { key: "status", label: "وضعیت", placeholder: "معتبر / اصلاحی / منسوخ" },
        { key: "subjects", label: "موضوعات", type: "csv" },
        { key: "summary", label: "خلاصه", type: "textarea" },
        { key: "sortOrder", label: "ترتیب نمایش", type: "number" },
      ]}
    />
  );
}
