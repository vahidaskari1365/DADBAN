import Link from "next/link";
import { guardAdminPage } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";

export const dynamic = "force-dynamic";

/** مدیریت پاسخ‌های تالار گفتگو — پنهان‌سازی/حذف پاسخ‌های نامناسب */
export default async function AdminForumRepliesPage() {
  await guardAdminPage("forum");
  return (
    <AdminCrudTable
      resource="forum-replies"
      title="تالار گفتگو — پاسخ‌ها"
      description="پاسخ‌های ثبت‌شده روی موضوع‌ها. برای برداشتن موقت، وضعیت را hidden کنید؛ شمارهٔ topic_id = موضوع مربوطه."
      itemLabel="پاسخ"
      searchKeys={["body", "authorName", "authorRole"]}
      columns={[
        { key: "topicId", label: "موضوع (شناسه)" },
        { key: "body", label: "متن" },
        { key: "authorName", label: "نویسنده" },
        { key: "authorRole", label: "نقش" },
        { key: "status", label: "وضعیت" },
      ]}
      fields={[
        { key: "body", label: "متن پاسخ", type: "textarea", required: true },
        { key: "authorName", label: "نویسنده" },
        {
          key: "status",
          label: "وضعیت",
          type: "select",
          options: [
            { value: "visible", label: "نمایش" },
            { value: "hidden", label: "پنهان" },
          ],
        },
      ]}
    />
  );
}
