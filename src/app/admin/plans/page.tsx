import { guardAdminPage } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  await guardAdminPage("knowledge");
  return (
    <AdminCrudTable
      resource="plans"
      title="مدیریت پلن‌های عضویت وکلا"
      description="پلن‌های صفحهٔ /plans — همین‌جا پلن اضافه کنید، ویرایش کنید یا حذف کنید؛ تغییرات فوراً روی سایت اعمال می‌شود. برای برداشتن موقت، «فعال» را خاموش کنید."
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
        { key: "key", label: "کلید یکتا (key)", required: true, placeholder: "pro", hint: "کلید یکتای انگلیسی (مثل pro یا gold) — پس از ساخت تغییرش ندهید" },
        { key: "price", label: "قیمت ماهانه (تومان — ۰ = رایگان)", type: "number", hint: "فقط عدد؛ مثلاً 490000 — صفر یعنی پلن رایگان" },
        { key: "desc", label: "توضیح کوتاه", span: 2 },
        { key: "features", label: "مزایا", type: "csv", hint: "هر مزیت با «،» جدا شود" },
        { key: "cta", label: "متن دکمه", placeholder: "فعال‌سازی پلن حرفه‌ای" },
        { key: "href", label: "لینک دکمه", placeholder: "/contact" },
        { key: "icon", label: "آیکون", placeholder: "bolt", hint: "از این‌ها: user، bolt، badge، star، shield، sparkles، coins، certificate، briefcase، gavel، landmark، scale" },
        { key: "highlight", label: "پیشنهاد ویژه (کارت برجسته)", type: "boolean" },
        { key: "active", label: "فعال (نمایش در سایت)", type: "boolean", hint: "خاموش = پلن موقتاً از سایت پنهان می‌شود (حذف نمی‌شود)" },
        { key: "sortOrder", label: "ترتیب نمایش", type: "number", hint: "عدد کوچک‌تر = بالاتر" },
      ]}
    />
  );
}
