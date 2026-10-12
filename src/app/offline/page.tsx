import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { ReloadButton } from "@/components/pwa/reload-button";
import { getT } from "@/lib/i18n/server";

/** چندزبانه: تیتر با generateMetadata و getT به زبان انتخابی کاربر می‌رود */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("اتصال قطع است"),
    robots: { index: false, follow: false },
  };
}

export default async function OfflinePage() {
  const t = await getT();
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <span className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-soft text-primary">
        <Icon name="lock" className="h-10 w-10" />
      </span>
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
        {t("اتصال اینترنت قطع است")}
      </h1>
      <p className="mt-3 max-w-md text-muted">
        {t("دادورزان در حالت آفلاین اجرا می‌شود. می‌توانید صفحاتی که قبلاً باز کرده‌اید را مرور کنید، یا وقتی اینترنت وصل شد دوباره تلاش کنید.")}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          {t("بازگشت به خانه")}
        </Link>
        <ReloadButton />
      </div>
    </div>
  );
}
