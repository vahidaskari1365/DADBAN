import { guardAdminPage } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage() {
  await guardAdminPage("tickets");
  return (
    <AdminCrudTable
      resource="tickets"
      title="مدیریت تیکت‌های پشتیبانی"
      itemLabel="تیکت"
      searchKeys={["ticket_number", "name", "phone", "message"]}
      columns={[
        { key: "ticket_number", label: "شماره تیکت" },
        { key: "name", label: "نام" },
        { key: "phone", label: "تلفن" },
        { key: "category", label: "دسته" },
        { key: "status", label: "وضعیت" },
      ]}
      fields={[
        { key: "ticket_number", label: "شماره تیکت", required: true },
        { key: "name", label: "نام", required: true },
        { key: "phone", label: "تلفن", required: true },
        { key: "category", label: "دسته‌بندی", required: true },
        { key: "message", label: "پیام", type: "textarea", required: true },
        {
          key: "status",
          label: "وضعیت",
          type: "select",
          options: [
            { value: "open", label: "باز" },
            { value: "answered", label: "پاسخ داده شده" },
            { value: "closed", label: "بسته" },
          ],
        },
      ]}
    />
  );
}
