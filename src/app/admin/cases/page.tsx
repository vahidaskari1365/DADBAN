import { guardAdminPage } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";

export const dynamic = "force-dynamic";

export default async function AdminCasesPage() {
  await guardAdminPage("cases");
  return (
    <AdminCrudTable
      resource="cases"
      title="مدیریت پرونده‌ها"
      itemLabel="پرونده"
      searchKeys={["case_number", "subject", "contact_name", "contact_phone"]}
      columns={[
        { key: "case_number", label: "شماره پرونده" },
        { key: "subject", label: "موضوع" },
        { key: "city", label: "شهر" },
        { key: "contact_name", label: "نام مخاطب" },
        { key: "contact_phone", label: "تلفن مخاطب" },
        { key: "status", label: "وضعیت" },
      ]}
      fields={[
        { key: "case_number", label: "شماره پرونده", required: true },
        { key: "subject", label: "موضوع", required: true },
        { key: "description", label: "توضیحات", type: "textarea", required: true },
        { key: "city", label: "شهر" },
        { key: "stage", label: "مرحله" },
        { key: "budget", label: "بودجه" },
        { key: "contact_name", label: "نام مخاطب", required: true },
        { key: "contact_phone", label: "تلفن مخاطب", required: true },
        {
          key: "status",
          label: "وضعیت",
          type: "select",
          options: [
            { value: "new", label: "جدید" },
            { value: "reviewing", label: "در حال بررسی" },
            { value: "matched", label: "تطبیق شده" },
            { value: "active", label: "فعال" },
            { value: "closed", label: "بسته" },
          ],
        },
      ]}
    />
  );
}
