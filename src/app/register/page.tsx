"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"client" | "lawyer">("client");
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
          router.push(role === "lawyer" ? "/dashboard/lawyer" : "/dashboard/client");
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
      <PageHero badge="ثبت‌نام" title="همین حالا حساب کاربری بسازید" desc="ثبت‌نام به‌عنوان موکل یا وکیل و شروع استفاده از خدمات دادبان." breadcrumb={[{ label: "خانه", href: "/" }, { label: "ثبت‌نام" }]} />
      <Container className="py-12">
        <div className="mx-auto max-w-md">
          <Card hover={false}>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1">
              {([["client", "ثبت‌نام موکل"], ["lawyer", "ثبت‌نام وکیل"]] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setRole(k)} className={`rounded-xl py-2.5 text-sm font-semibold transition-all ${role === k ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground-soft"}`}>{label}</button>
              ))}
            </div>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-bold text-foreground">نام و نام خانوادگی</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={`${fieldCls} mt-2`} placeholder="نام شما" />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-foreground">{role === "lawyer" ? "شماره پروانه / موبایل" : "شماره موبایل"}</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`${fieldCls} mt-2`} placeholder="09123456789" dir="ltr" style={{ textAlign: "right" }} />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-foreground">رمز عبور</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${fieldCls} mt-2`} placeholder="حداقل ۸ کاراکتر" />
              </label>
              {error && <p className="text-sm font-semibold text-danger">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full" icon="user">{loading ? "در حال ساخت حساب…" : "ثبت‌نام"}</Button>
            </form>
            {role === "lawyer" && (
              <p className="mt-3 rounded-xl bg-accent-soft/60 p-3 text-xs leading-6 text-foreground-soft">پس از ثبت‌نام، اطلاعات حرفه‌ای و مدارک شما بررسی و پس از احراز هویت، پروفایل فعال می‌شود.</p>
            )}
            <p className="mt-4 text-center text-sm text-muted">حساب دارید؟ <Link href="/login" className="font-bold text-primary hover:text-primary-hover">ورود</Link></p>
          </Card>
        </div>
      </Container>
    </>
  );
}
