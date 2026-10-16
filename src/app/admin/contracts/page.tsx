import { guardAdminPage } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";

export const dynamic = "force-dynamic";

export default async function AdminContractsPage() {
  await guardAdminPage("contracts");
  return (
    <AdminCrudTable
      resource="contracts"
      title="مدیریت قراردادها"
      itemLabel="قرارداد"
      searchKeys={["title", "slug", "category"]}
      columns={[
        { key: "title", label: "عنوان" },
        { key: "category", label: "دسته" },
        { key: "sample_price", label: "قیمت نمونه" },
        { key: "custom_price", label: "قیمت سفارشی" },
        { key: "popular", label: "محبوب" },
      ]}
      fields={[
        { key: "slug", label: "شناسه (slug)", required: true },
        { key: "title", label: "عنوان", required: true },
        { key: "category", label: "دسته‌بندی", required: true },
        { key: "icon", label: "آیکن", defaultValue: "file" },
        { key: "description", label: "توضیحات", type: "textarea", required: true },
        { key: "use_case", label: "کاربرد", type: "textarea" },
        { key: "risks", label: "ریسک‌ها", type: "csv" },
        { key: "key_clauses", label: "بندهای کلیدی", type: "csv" },
        { key: "steps", label: "مراحل", type: "csv" },
        { key: "sample_price", label: "قیمت نمونه (تومان)", type: "number" },
        { key: "custom_price", label: "قیمت سفارشی (تومان)", type: "number" },
        { key: "popular", label: "محبوب", type: "boolean", default: false },
      ]}
    />
  );
}
