import { guardAdminPage } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";

export const dynamic = "force-dynamic";

export default async function AdminQaSubmissionsPage() {
  await guardAdminPage("qa");
  return (
    <AdminCrudTable
      resource="qa-submissions"
      title="درخواست‌های پرسش حقوقی"
      itemLabel="درخواست"
      searchKeys={["name", "phone", "question"]}
      columns={[
        { key: "name", label: "نام" },
        { key: "phone", label: "تلفن" },
        { key: "question", label: "پرسش" },
        { key: "status", label: "وضعیت" },
      ]}
      fields={[
        { key: "name", label: "نام", required: true },
        { key: "phone", label: "تلفن" },
        { key: "question", label: "پرسش", type: "textarea", required: true },
        {
          key: "status",
          label: "وضعیت",
          type: "select",
          options: [{ value: "pending_review", label: "در انتظار بررسی" }],
        },
      ]}
    />
  );
}
