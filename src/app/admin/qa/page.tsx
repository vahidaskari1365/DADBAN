import { guardAdminPage } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";

export const dynamic = "force-dynamic";

export default async function AdminQaPage() {
  await guardAdminPage("qa");
  return (
    <AdminCrudTable
      resource="qa"
      title="مدیریت پرسش و پاسخ"
      itemLabel="پرسش"
      searchKeys={["question", "slug", "category", "lawyer_name"]}
      columns={[
        { key: "question", label: "پرسش" },
        { key: "category", label: "دسته" },
        { key: "lawyer_name", label: "پاسخ‌دهنده" },
        { key: "helpful", label: "مفید" },
        { key: "verified", label: "تأییدشده" },
      ]}
      fields={[
        { key: "slug", label: "شناسه (slug)", required: true },
        { key: "question", label: "پرسش", required: true },
        { key: "body", label: "متن پرسش", type: "textarea" },
        { key: "answer", label: "پاسخ", type: "textarea" },
        { key: "category", label: "دسته‌بندی", required: true },
        { key: "lawyer_name", label: "نام پاسخ‌دهنده" },
        { key: "lawyer_title", label: "عنوان پاسخ‌دهنده" },
        { key: "verified", label: "تأییدشده", type: "boolean", default: true },
        { key: "helpful", label: "تعداد «مفید بود»", type: "number" },
        { key: "views", label: "بازدید", type: "number" },
      ]}
    />
  );
}
