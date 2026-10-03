import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-page";

export const metadata: Metadata = {
  title: "ثبت‌نام رایگان | دادبان",
  description:
    "ساخت حساب کاربری رایگان در دادبان — ثبت پرونده، رزرو مشاوره و پیگیری آنلاین مراحل حقوقی.",
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  return <AuthPage mode="register" />;
}
