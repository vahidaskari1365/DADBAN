import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/ui";
import { getCurrentUser } from "@/lib/user-auth";
import { isLawyerSideRole } from "@/lib/roles";
import { getT } from "@/lib/i18n/server";
import VaultManager from "@/components/vault/vault-manager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("مدیریت اسناد و مدارک") };
}

/**
 * گاوصندوق اسناد شخصی — جایگزین فهرست ساختگی قبلی.
 * آپلود واقعی multipart (≤۵MB) + رمزنگاری اختیاری AES-GCM سمت مرورگر؛
 * کلید از عبارت عبور کاربر مشتق می‌شود و هرگز سرور را ترک نمی‌کند.
 */
export default async function DocumentsPage() {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isLawyerSideRole(user.role)) redirect("/dashboard/lawyer");

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-dash-docs.png"
        badge={t("پنل موکل")}
        title={t("مدیریت اسناد و مدارک")}
        desc={t(
          "آپلود امن اسناد شخصی؛ امکان رمزنگاری با عبارت عبور — فایل‌های رمز شده فقط در مرورگر شما رمزگشایی می‌شوند.",
        )}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("اسناد و مدارک") }]}
      />

      <Container className="py-10">
        <VaultManager />
      </Container>
    </>
  );
}
