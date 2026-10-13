import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <AdminCrudTable
      resource="plans"
      title="مدیریت پلن‌های عضویت وکلا"
      description="پلن‌های صفحهٔ /plans — قیمت، مزایا و متن دکمه‌ها را همین‌جا تغییر دهید؛ فوراً روی سایت اعمال می‌شود."
      itemLabel="پلن"
      searchKeys={["name", "key", "desc"]}
      sortBy="sortOrder"
      columns={[
        { key: "name", label: "پلن" },
        { key: "price", label: "قیمت ماهانه (تومان)" },
        { key: "highlight", label: "پیشنهاد ویژه" },
        { key: "active", label: "فعال" },
      ]}
      fields={[
        { key: "name", label: "نام پلن", required: true, placeholder: "مثلاً حرفه‌ای" },
        { key: "key", label: "کلید یکتا (key)", required: true, placeholder: "pro" },
        { key: "price", label: "قیمت ماهانه (تومان — ۰ = رایگان)", type: "number" },
        { key: "desc", label: "توضیح کوتاه", span: 2 },
        { key: "features", label: "مزایا", type: "csv", hint: "هر مزیت با «،» جدا شود" },
        { key: "cta", label: "متن دکمه", placeholder: "فعال‌سازی پلن حرفه‌ای" },
        { key: "href", label: "لینک دکمه", placeholder: "/contact" },
        { key: "icon", label: "آیکون (user / bolt / badge)", placeholder: "bolt" },
        { key: "highlight", label: "پیشنهاد ویژه (کارت برجسته)", type: "boolean" },
        { key: "active", label: "فعال (نمایش در سایت)", type: "boolean" },
        { key: "sortOrder", label: "ترتیب نمایش", type: "number" },
      ]}
    />
  );
}
