import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/user-auth";
import { toFa } from "@/lib/money";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";
import { fetchMarketItems, resolveLawyerContext } from "@/components/portal/lawyer/portal-server";
import { lawyerNav } from "@/components/portal/lawyer/nav-items";
import { MarketBrowser } from "@/components/portal/lawyer/market-browser";
import { DpToaster } from "@/components/portal/lawyer/toaster";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("پنل وکیل — پرونده‌های پیشنهادی"),
    description: t("بازار پرونده‌های جدید دادورزان با تطبیق هوشمند تخصص و ارسال پیشنهاد قیمت."),
  };
}
export const dynamic = "force-dynamic";

export default async function LawyerMarketPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getT();
  const tf = templateT(t);

  const ctx = await resolveLawyerContext(user);
  const items = await fetchMarketItems(ctx.lawyer, { limit: 24 });

  return (
    <DashboardShell
      role="وکیل"
      title={t("پرونده‌های پیشنهادی")}
      subtitle={t("بازار پرونده‌های جدید — با توجه به تخصص خود پیشنهاد قیمت ارسال کنید")}
      userName={ctx.lawyer?.name ?? user.name}
      userRole={ctx.demo ? t("وکیل · حالت نمایش") : t(ctx.lawyerTitle)}
      nav={lawyerNav("market")}
    >
      <DpToaster />

      <Card hover={false}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[16px] font-bold text-foreground">
              <Icon name="scale" className="h-5 w-5 text-primary" />
              {t("بازار پرونده‌های جدید")}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {tf("{n} پروندهٔ باز · مرتب‌شده بر اساس تطبیق تخصص شما", { n: toFa(items.length) })}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent">
            <Icon name="sparkles" className="h-4 w-4" />
            {t("AI Matching فعال")}
          </span>
        </div>
        <MarketBrowser initialItems={items} canOffer={!ctx.demo} />
      </Card>
    </DashboardShell>
  );
}
