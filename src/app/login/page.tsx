import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-page";

export const metadata: Metadata = {
  title: "ورود به حساب کاربری | دادبان",
  description:
    "ورود امن به پنل موکل یا پنل وکیل دادبان — پیگیری پرونده، مشاوره‌ها و اسناد حقوقی در یک نگاه.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return <AuthPage mode="login" />;
}
