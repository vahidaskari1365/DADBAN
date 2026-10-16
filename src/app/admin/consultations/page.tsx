import { guardAdminPage } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";

export const dynamic = "force-dynamic";

export default async function AdminConsultationsPage() {
  await guardAdminPage("consultations");
  return (
    <AdminCrudTable
      resource="consultations"
      title="مدیریت مشاوره‌ها"
      itemLabel="مشاوره"
      searchKeys={["client_name", "client_phone", "subject"]}
      columns={[
        { key: "client_name", label: "نام موکل" },
        { key: "client_phone", label: "تلفن موکل" },
        { key: "subject", label: "موضوع" },
        { key: "type", label: "نوع" },
        { key: "price", label: "قیمت" },
        { key: "status", label: "وضعیت" },
      ]}
      fields={[
        { key: "client_name", label: "نام موکل", required: true },
        { key: "client_phone", label: "تلفن موکل", required: true },
        { key: "subject", label: "موضوع", required: true },
        {
          key: "type",
          label: "نوع",
          type: "select",
          options: [
            { value: "chat", label: "چت" },
            { value: "voice", label: "صوتی" },
            { value: "video", label: "تصویری" },
          ],
        },
        { key: "lawyer_name", label: "وکیل" },
        { key: "duration", label: "مدت (دقیقه)", type: "number" },
        { key: "scheduled_at", label: "زمان جلسه" },
        { key: "price", label: "قیمت (تومان)", type: "number" },
        {
          key: "status",
          label: "وضعیت",
          type: "select",
          options: [
            { value: "pending", label: "در انتظار" },
            { value: "confirmed", label: "تأیید شده" },
            { value: "completed", label: "انجام شده" },
            { value: "cancelled", label: "لغو شده" },
          ],
        },
      ]}
    />
  );
}
