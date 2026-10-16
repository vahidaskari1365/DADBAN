import Link from "next/link";
import { guardAdminPage } from "@/lib/admin-auth";
import { AdminCrudTable } from "@/components/admin/crud-table";
import { Container, Card } from "@/components/ui";
import { FORUM_CATEGORIES } from "@/lib/cms";

export const dynamic = "force-dynamic";

/**
 * مدیریت تالار گفتگو — موضوع‌ها: پنهان‌سازی/نمایش، سنجاق، ویرایش، حذف.
 * پاسخ‌ها در /admin/forum/replies مدیریت می‌شوند.
 */
export default async function AdminForumPage() {
  await guardAdminPage("forum");
  return (
    <>
      <Container className="pt-6">
        <Card hover={false} className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-foreground-soft">
            هر موضوعی را می‌توانید پنهان (status=hidden)، سنجاق یا حذف کنید — تغییرات فوراً در /forum اعمال می‌شود.
          </p>
          <Link href="/admin/forum/replies" className="text-sm font-bold text-primary hover:underline">
            مدیریت پاسخ‌ها ←
          </Link>
        </Card>
      </Container>
      <AdminCrudTable
        resource="forum-topics"
        title="تالار گفتگو — موضوع‌ها"
        description="همهٔ موضوع‌های نوشته‌شدهٔ کاربران و مهمان‌ها. برای برداشتن موقت، وضعیت را hidden کنید."
        itemLabel="موضوع"
        searchKeys={["title", "authorName", "category", "body"]}
        columns={[
          { key: "title", label: "عنوان" },
          { key: "authorName", label: "نویسنده" },
          { key: "authorRole", label: "نقش" },
          { key: "category", label: "دسته" },
          { key: "views", label: "بازدید" },
          { key: "pinned", label: "سنجاق" },
          { key: "status", label: "وضعیت" },
        ]}
        fields={[
          { key: "title", label: "عنوان", required: true },
          { key: "body", label: "متن", type: "textarea" },
          {
            key: "category",
            label: "دسته",
            type: "select",
            options: FORUM_CATEGORIES.map((c) => ({ value: c, label: c })),
          },
          { key: "authorName", label: "نویسنده" },
          { key: "pinned", label: "سنجاق‌شده (بالای فهرست)", type: "boolean" },
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
    </>
  );
}
