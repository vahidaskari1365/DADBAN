"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button } from "@/components/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.push("/admin");
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

  const fieldCls =
    "h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

  return (
    <>
      <PageHero
        badge="Admin"
        title="ورود مدیر"
        desc="برای مدیریت سایت و محتوا وارد شوید."
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "ورود مدیر" }]}
      />
      <Container className="py-12">
        <div className="mx-auto max-w-md">
          <Card hover={false}>
            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="text-sm font-bold text-foreground">ایمیل</span>
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${fieldCls} mt-2`}
                  placeholder="admin@dadban.ir"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-foreground">رمز عبور</span>
                <input
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${fieldCls} mt-2`}
                  placeholder="••••••••"
                  required
                />
              </label>
              {error && <p className="text-sm font-semibold text-danger">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "در حال ورود..." : "ورود به پنل"}
              </Button>
            </form>
          </Card>
        </div>
      </Container>
    </>
  );
}
