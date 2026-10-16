import { guardAdminPage } from "@/lib/admin-auth";
import { Container, Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import Link from "next/link";
import ManagedServicesAdmin from "@/components/managed-admin";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminManagedServicesPage() {
  await guardAdminPage("services");
  const t = await getT();
  return (
    <Container className="py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("مدیریت خدمات عملیاتی")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t(
              "دسته‌بندی‌ها و خدمات کاتالوگ «پیگیری و انجام امور» را مدیریت کنید. خدمات فعال در صفحهٔ عمومی /services نمایش داده می‌شوند.",
            )}
          </p>
        </div>
        <Link href="/admin">
          <Button variant="outline" size="sm" icon="arrow">
            {t("بازگشت به پیشخوان")}
          </Button>
        </Link>
      </div>
      <Card className="p-5">
        <ManagedServicesAdmin />
      </Card>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted">
        <Icon name="alert" className="h-4 w-4" />
        {t("هشدار: این خدمات جایگزین وکیل نیستند؛ در صورت نیاز به نمایندگی حقوقی، گزینهٔ نظارت/وکیل را فعال کنید.")}
      </p>
    </Container>
  );
}
