import Link from "next/link";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getT } from "@/lib/i18n/server";

/**
 * FeeCard — کارت فشردهٔ «پرداخت قسطی حق‌الوکاله» برای داشبورد دو طرف.
 * با audience، متن برای موکل یا وکیل تنظیم می‌شود؛ استایل هم‌سبک کارت‌های
 * داشبورد (گرادیان ملایم + آیکن‌چیپ) است تا با بقیهٔ پنل یکدست دیده شود.
 */
export async function FeeCard({ audience = "client" }: { audience?: "client" | "lawyer" }) {
  const t = await getT();
  const copy =
    audience === "lawyer"
      ? {
          title: "پرداخت قسطی برای موکلان شما فعال است",
          desc: "موکلان شما می‌توانند حق‌الوکاله را قسطی بپردازند — شرایط را در قرارداد ثبت کنید تا برای هر دو طرف قابل رهگیری باشد.",
          linkLabel: "راهنمای پرداخت قسطی برای وکلا",
        }
      : {
          title: "پرداخت قسطی حق‌الوکاله فعال است",
          desc: "اگر پرداخت یکجای حق‌الوکاله برایتان دشوار است، با توافق وکیل می‌توانید مبلغ را به ۲ تا ۴ قسط تقسیم کنید.",
          linkLabel: "جزئیات پرداخت قسطی",
        };

  return (
    <Card
      hover={false}
      className="border-accent/30 bg-gradient-to-l from-accent-soft/60 via-surface to-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
            <Icon name="balance" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-bold text-foreground">{t(copy.title)}</p>
            <p className="mt-1 text-sm leading-7 text-foreground-soft">{t(copy.desc)}</p>
          </div>
        </div>
        <Link
          href="/fee-payment"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 px-1 text-sm font-bold text-accent-text transition-colors hover:text-accent-hover"
        >
          {t(copy.linkLabel)}
          <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}
