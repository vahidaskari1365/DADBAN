import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-page";
import { getT } from "@/lib/i18n/server";

/** چندزبانه: تیتر/توضیح با generateMetadata و getT به زبان انتخابی کاربر می‌رود */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("ثبت‌نام رایگان | دادبان"),
    description: t(
      "ساخت حساب کاربری رایگان در دادبان — ثبت پرونده، رزرو مشاوره و پیگیری آنلاین مراحل حقوقی.",
    ),
    alternates: { canonical: "/register" },
  };
}

export default function RegisterPage() {
  return <AuthPage mode="register" />;
}
