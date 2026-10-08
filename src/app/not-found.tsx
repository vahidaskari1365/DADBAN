import Link from "next/link";
import { Icon } from "@/components/icons";
import { Container, Button } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

/**
 * صفحه‌ی ۴۰۴ سفارشی — فارسی RTL با طراحی دادبان.
 */
export default async function NotFound() {
  const t = await getT();
  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <span className="mx-auto mb-6 inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-primary-soft text-primary">
        <Icon name="search" className="h-12 w-12" />
      </span>

      <p className="text-6xl font-extrabold tracking-tight text-primary sm:text-7xl">۴۰۴</p>
      <h1 className="mt-4 text-xl font-bold text-foreground sm:text-2xl">
        {t("صفحه‌ی مورد نظر پیدا نشد")}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-7 text-muted">
        {t("متأسفیم! صفحه‌ای که دنبالش بودید وجود ندارد یا منتقل شده است. ممکن است آدرس را اشتباه وارد کرده باشید یا صفحه حذف شده باشد.")}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/" icon="home" size="lg">
          {t("بازگشت به خانه")}
        </Button>
        <Button href="/lawyers" variant="outline" icon="search" size="lg">
          {t("جستجوی وکیل")}
        </Button>
        <Button href="/ai-assistant" variant="soft" icon="sparkles" size="lg">
          {t("مشاور همراه")}
        </Button>
      </div>

      {/* لینک‌های مفید */}
      <div className="mt-10 grid w-full max-w-md gap-2 text-sm sm:grid-cols-2">
        <Link href="/consultation" className="rounded-xl border border-border bg-surface px-4 py-3 font-medium text-foreground-soft transition-colors hover:bg-surface-2">
          💬 {t("مشاوره آنلاین")}
        </Link>
        <Link href="/contracts" className="rounded-xl border border-border bg-surface px-4 py-3 font-medium text-foreground-soft transition-colors hover:bg-surface-2">
          📄 {t("تنظیم قرارداد")}
        </Link>
        <Link href="/knowledge" className="rounded-xl border border-border bg-surface px-4 py-3 font-medium text-foreground-soft transition-colors hover:bg-surface-2">
          📚 {t("مقالات حقوقی")}
        </Link>
        <Link href="/qa" className="rounded-xl border border-border bg-surface px-4 py-3 font-medium text-foreground-soft transition-colors hover:bg-surface-2">
          ❓ {t("پرسش و پاسخ")}
        </Link>
      </div>

      <p className="mt-8 text-xs text-muted">
        {t("اگه فکر می‌کنید این یک خطاست، با")}{" "}
        <Link href="/support" className="font-medium text-primary hover:underline">
          {t("پشتیبانی")}
        </Link>{" "}
        {t("در تماس باشید.")}
      </p>
    </Container>
  );
}
