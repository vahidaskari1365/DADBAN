import { guardAdminPage } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";

export const dynamic = "force-dynamic";

export default async function AdminLawyersPage() {
  await guardAdminPage("lawyers");
  return (
    <AdminCrudTable
      resource="lawyers"
      title="مدیریت وکلا"
      description="پروفایل وکلا — افزودن، ویرایش کامل و حذف با سینک فوری به سایت."
      itemLabel="وکیل"
      searchKeys={["name", "city", "slug", "license_no"]}
      sortBy="name"
      columns={[
        { key: "name", label: "نام" },
        { key: "city", label: "شهر" },
        { key: "rating", label: "امتیاز" },
        { key: "case_count", label: "تعداد پرونده" },
        { key: "price_chat", label: "قیمت چت" },
        { key: "verified", label: "تأییدشده" },
      ]}
      fields={[
        { key: "name", label: "نام و نام خانوادگی", required: true },
        { key: "slug", label: "شناسه (slug)", required: true },
        { key: "title", label: "عنوان/درجه", placeholder: "وکیل پایه یک دادگستری" },
        { key: "license_no", label: "شماره پروانه", required: true },
        { key: "city", label: "شهر", required: true },
        { key: "province", label: "استان" },
        {
          key: "gender",
          label: "جنسیت",
          type: "select",
          options: [
            { value: "male", label: "مرد" },
            { value: "female", label: "زن" },
          ],
        },
        { key: "experience_years", label: "سابقه (سال)", type: "number" },
        { key: "specialties", label: "تخصص‌ها", type: "csv" },
        { key: "rating", label: "امتیاز", type: "number" },
        { key: "case_count", label: "تعداد پرونده", type: "number" },
        { key: "price_chat", label: "قیمت چت (تومان)", type: "number" },
        { key: "price_voice", label: "قیمت تماس صوتی (تومان)", type: "number" },
        { key: "price_video", label: "قیمت تماس تصویری (تومان)", type: "number" },
        { key: "verified", label: "تأییدشده", type: "boolean", default: true },
        { key: "top_rated", label: "برترین", type: "boolean" },
        { key: "fast_responder", label: "پاسخ‌گوی سریع", type: "boolean" },
        { key: "contract_expert", label: "کارشناس قرارداد", type: "boolean" },
        { key: "featured", label: "ویژه", type: "boolean" },
        { key: "response_time", label: "زمان پاسخ" },
        { key: "bio", label: "بیوگرافی کوتاه", type: "textarea" },
        { key: "about", label: "درباره وکیل", type: "textarea" },
        { key: "services", label: "خدمات", type: "csv" },
        { key: "photo_url", label: "تصویر", type: "image" },
      ]}
    />
  );
}
