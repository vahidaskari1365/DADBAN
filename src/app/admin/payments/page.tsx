import { guardAdminPage } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await guardAdminPage("finance");
  return (
    <AdminCrudTable
      resource="payments"
      title="مدیریت پرداخت‌ها"
      itemLabel="پرداخت"
      searchKeys={["reference", "order_type", "provider"]}
      columns={[
        { key: "reference", label: "شناسه ارجاع" },
        { key: "order_type", label: "نوع سفارش" },
        { key: "amount", label: "مبلغ" },
        { key: "provider", label: "درگاه" },
        { key: "status", label: "وضعیت" },
      ]}
      fields={[
        { key: "reference", label: "شناسه ارجاع", required: true },
        { key: "order_type", label: "نوع سفارش" },
        { key: "amount", label: "مبلغ (تومان)", type: "number" },
        { key: "provider", label: "درگاه پرداخت" },
        {
          key: "status",
          label: "وضعیت",
          type: "select",
          options: [
            { value: "initiated", label: "آغاز شده" },
            { value: "paid", label: "پرداخت شده" },
            { value: "failed", label: "ناموفق" },
            { value: "refunded", label: "بازگشت داده شده" },
          ],
        },
      ]}
    />
  );
}
