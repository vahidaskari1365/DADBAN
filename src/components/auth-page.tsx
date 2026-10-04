import { Container } from "@/components/ui";
import { AuthCard } from "@/components/auth-panel";

/**
 * قالب مشترک صفحات ورود / ثبت‌نام — کارت دوپاره سبک VERSO:
 * سمت فرم کرم + سمت برند سبز با عکس هیرو و لوگو؛ سوییچ ورود↔ثبت‌نام
 * با انیمیشن «تیغه» انجام می‌شود (بدون fade).
 * پس‌زمینه صفحه (هیرو محو + اورورا + نویز) طبق طراحی تأییدشده قبلی حفظ شده است.
 */
export function AuthPage({ mode }: { mode: "login" | "register" }) {
  return (
    <main className="relative overflow-hidden">
      {/* ── پس‌زمینه: عکس هیرو (کم‌رنگ) + اورورا + نویز + شبکه نقطه‌ای ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* عکس هیروی سایت — هماهنگ با تم، با شفافیت کم */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 dark:hidden"
          style={{ backgroundImage: "url('/hero-bg-light.jpg')" }}
        />
        <div
          className="absolute inset-0 hidden bg-cover bg-center opacity-15 dark:block"
          style={{ backgroundImage: "url('/hero-bg-dark.jpg')" }}
        />
        {/* واش همرنگ صفحه برای محو بیشتر و خوانایی فرم */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, var(--background) 0%, color-mix(in oklab, var(--background) 55%, transparent) 45%, color-mix(in oklab, var(--background) 35%, transparent) 100%)",
          }}
        />
        <div className="auth-aurora-a absolute -top-32 right-[4%] h-[30rem] w-[30rem]" />
        <div className="auth-aurora-b absolute top-1/3 -left-36 h-[27rem] w-[27rem]" />
        <div className="auth-aurora-a absolute bottom-[-9rem] right-[40%] h-[23rem] w-[23rem] [animation-delay:-6s]" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--border-strong, var(--border)) 1px, transparent 0)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse 85% 65% at 50% 0%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 85% 65% at 50% 0%, black, transparent)",
          }}
        />
        <div className="auth-noise absolute inset-0" />
      </div>

      <Container className="relative flex min-h-[calc(100svh-4.5rem)] items-center justify-center py-10 pb-28 sm:py-14">
        <div className="w-full max-w-[66rem]">
          <AuthCard initialMode={mode} />
        </div>
      </Container>
    </main>
  );
}
