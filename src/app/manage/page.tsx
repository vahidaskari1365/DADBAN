import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { getCurrentUser } from "@/lib/user-auth";
import { isOperative } from "@/lib/managed-services";
import ManagedOperations from "@/components/managed-ops";

export const metadata: Metadata = { title: "پنل عملیات — خدمات و پیگیری‌ها — دادبان" };
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  staff: "کارشناس عملیات",
  supervisor: "ناظر",
  lawyer: "وکیل ناظر",
  admin: "مدیر",
};

export default async function ManagePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isOperative(user.role)) redirect("/dashboard/client");

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="border-b border-border bg-gradient-to-b from-primary-soft/50 to-background">
        <Container className="py-8">
          <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            خدمات و پیگیری‌ها
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">پنل عملیات دادبان</h1>
          <p className="mt-2 text-sm text-muted">
            مدیریت درخواست‌های خدمات پیگیری و انجام امور — واگذاری، پیش‌فاکتور، پرداخت و تحویل نتیجه.
          </p>
          <p className="mt-2 text-xs text-muted">شما با نقش: {ROLE_LABEL[user.role] ?? user.role}</p>
        </Container>
      </div>
      <Container className="mt-8">
        <ManagedOperations currentRole={user.role} />
      </Container>
    </div>
  );
}
