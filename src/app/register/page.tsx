"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const login = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: phone, password }),
        });
        if (login.ok) {
          router.push("/dashboard/client");
          router.refresh();
        } else {
          router.push("/login");
        }
      } else {
        setError(data.error ?? "خطا در ثبت‌نام");
        setLoading(false);
      }
    } catch {
      setError("خطا در ارتباط با سرور");
      setLoading(false);
    }
  };

  const fieldCls = "h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

  return (
    <>
      <PageHero badge="ثبت‌نام" title="همین حالا حساب کاربری بسازید" desc="برای استفاده از مشاوره‌ها، پیگیری پرونده و خدمات دادبان ثبت‌نام کنید." breadcrumb={[{ label: "خانه", href: "/" }, { label: "ثبت‌نام" }]} />
      <Container className="py-12">
        <div className="mx-auto max-w-md">
          <Card hover={false}>
            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="text-sm font-bold text-foreground">نام و نام خانوادگی</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={`${fieldCls} mt-2`} placeholder="نام شما" />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-foreground">شماره موبایل</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`${fieldCls} mt-2`} placeholder="09123456789" dir="ltr" style={{ textAlign: "right" }} />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-foreground">رمز عبور</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${fieldCls} mt-2`} placeholder="حداقل ۸ کاراکتر" />
              </label>
              {error && <p className="text-sm font-semibold text-danger">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full" icon="user">{loading ? "در حال ساخت حساب…" : "ثبت‌نام"}</Button>
            </form>
            <p className="mt-3 rounded-xl bg-accent-soft/60 p-3 text-xs leading-6 text-foreground-soft">
              وکیل هستید؟ عضویت وکلای دادبان پس از بررسی مدارک و احراز هویت از طریق <Link href="/support" className="font-bold text-primary hover:underline">پشتیبانی</Link> انجام می‌شود.
            </p>
            <p className="mt-4 text-center text-sm text-muted">حساب دارید؟ <Link href="/login" className="font-bold text-primary hover:text-primary-hover">ورود</Link></p>
          </Card>
        </div>
      </Container>
    </>
  );
}
