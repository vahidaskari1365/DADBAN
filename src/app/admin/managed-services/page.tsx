import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { Container, Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import Link from "next/link";
import ManagedServicesAdmin from "@/components/managed-admin";

export const dynamic = "force-dynamic";

export default async function AdminManagedServicesPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <Container className="py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مدیریت خدمات عملیاتی</h1>
          <p className="mt-1 text-sm text-muted">
            دسته‌بندی‌ها و خدمات کاتالوگ «پیگیری و انجام امور» را مدیریت کنید. خدمات فعال در صفحهٔ عمومی
            /services نمایش داده می‌شوند.
          </p>
        </div>
        <Link href="/admin">
          <Button variant="outline" size="sm" icon="arrow">
            بازگشت به پیشخوان
          </Button>
        </Link>
      </div>
      <Card className="p-5">
        <ManagedServicesAdmin />
      </Card>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted">
        <Icon name="alert" className="h-4 w-4" />
        هشدار: این خدمات جایگزین وکیل نیستند؛ در صورت نیاز به نمایندگی حقوقی، گزینهٔ نظارت/وکیل را فعال کنید.
      </p>
    </Container>
  );
}
