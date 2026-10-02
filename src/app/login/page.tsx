"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button } from "@/components/ui";
import Link from "next/link";
export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.push(data.user.role === "lawyer" ? "/dashboard/lawyer" : "/dashboard/client");
        router.refresh();
      } else {
        setError(data.error ?? "خطا در ورود");
      }
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };
  const fieldCls = "h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";
  return (
    <>
      <PageHero badge="ورود" title="به دادبان خوش آمدید" desc="برای دسترسی به پرونده‌ها، مشاوره‌ها و اسناد خود وارد شوید." breadcrumb={[{ label: "خانه", href: "/" }, { label: "ورود" }]} />
      <Container className="py-12">
        <div className="mx-auto max-w-md">
          <Card hover={false}>
            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="text-sm font-bold text-foreground">موبایل یا ایمیل</span>
                <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} className={`${fieldCls} mt-2`} placeholder="09123456789" dir="ltr" style={{ textAlign: "right" }} />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-foreground">رمز عبور</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${fieldCls} mt-2`} placeholder="••••••••" />
              </label>
              {error && <p className="text-sm font-semibold text-danger">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">{loading ? "در حال ورود..." : "ورود"}</Button>
              <p className="text-center text-xs text-foreground-soft">
                حساب ندارید؟{" "}
                <Link href="/register" className="font-bold text-primary hover:underline">ثبت‌نام کنید</Link>
              </p>
            </form>
          </Card>
        </div>
      </Container>
    </>
  );
}
