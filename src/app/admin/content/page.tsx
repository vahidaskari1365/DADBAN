import { guardAdminPage } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";
import { PAGE_REGISTRY } from "@/lib/cms";

export const dynamic = "force-dynamic";

/**
 * مدیریت محتوای همهٔ صفحات سایت — وردپرس‌مانند.
 * ادمین برای هر صفحهٔ ثبت‌شده در PAGE_REGISTRY بلوک محتوایی می‌سازد:
 * عنوان/زیرعنوان/متن/عکس (آپلود مستقیم)/لینک/ترتیب/فعال.
 * برای نمایش در پایین صفحه، «بخش» را بنویسید: bottom
 */
export default async function AdminContentPage() {
  await guardAdminPage("content");
  return (
    <AdminCrudTable
      resource="site-content"
      title="محتوای صفحات سایت"
      description="برای هر صفحهٔ سایت مطلب و عکس اضافه کنید — همین‌جا بنویسید، فوراً روی همان صفحهٔ عمومی نمایش داده می‌شود. نوع بلوک: اطلاعیه، متن، ویژگی، پرسش‌ومپاسخ و تصویر."
      itemLabel="بلوک محتوایی"
      searchKeys={["page", "section", "title", "subtitle", "body"]}
      sortBy="sortOrder"
      columns={[
        { key: "page", label: "صفحه" },
        { key: "kind", label: "نوع" },
        { key: "title", label: "عنوان" },
        { key: "imageUrl", label: "عکس" },
        { key: "active", label: "فعال" },
        { key: "sortOrder", label: "ترتیب" },
      ]}
      fields={[
        {
          key: "page",
          label: "صفحهٔ مقصد",
          type: "select",
          required: true,
          options: PAGE_REGISTRY.map((p) => ({ value: p.key, label: p.label })),
          hint: "بلوک روی همین صفحهٔ عمومی رندر می‌شود",
        },
        {
          key: "section",
          label: "بخش / جای نمایش",
          placeholder: "خالی = بالای صفحه",
          hint: "برای نمایش در انتهای صفحه بنویسید: bottom (فقط همین کلمه)",
        },
        {
          key: "kind",
          label: "نوع بلوک",
          type: "select",
          options: [
            { value: "announcement", label: "اطلاعیهٔ شاخص" },
            { value: "text", label: "متن ساده" },
            { value: "feature", label: "معرفی ویژگی" },
            { value: "faq", label: "پرسش و پاسخ" },
            { value: "image", label: "تصویر + توضیح" },
          ],
        },
        { key: "title", label: "عنوان", required: true, placeholder: "مثلاً: خبر مهم برای کاربران" },
        { key: "subtitle", label: "زیرعنوان", placeholder: "اختیاری" },
        { key: "body", label: "متن", type: "textarea", placeholder: "متن کامل مطلب — هرچند خط بخواهید" },
        { key: "imageUrl", label: "عکس (آپلود)", type: "image", span: 2 },
        { key: "link", label: "لینک دکمه", placeholder: "/contact" },
        { key: "linkLabel", label: "متن دکمه", placeholder: "مشاهده" },
        { key: "active", label: "فعال (نمایش در سایت)", type: "boolean", default: true, hint: "پیش‌فرض روشن — بلافاصله روی سایت منتشر می‌شود" },
        { key: "sortOrder", label: "ترتیب نمایش", type: "number", hint: "عدد کوچک‌تر = بالاتر" },
      ]}
    />
  );
}
