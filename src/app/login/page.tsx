import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-page";
import { getT } from "@/lib/i18n/server";

/** چندزبانه: تیتر/توضیح با generateMetadata و getT به زبان انتخابی کاربر می‌رود */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("ورود به حساب کاربری | دادبان"),
    description: t(
      "ورود امن به پنل موکل یا پنل وکیل دادبان — پیگیری پرونده، مشاوره‌ها و اسناد حقوقی در یک نگاه.",
    ),
    alternates: { canonical: "/login" },
  };
}

export default function LoginPage() {
  return <AuthPage mode="login" />;
}
