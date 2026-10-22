import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-panel";

/**
 * قالب مشترک صفحات ورود / ثبت‌نام — نسخه تمام‌صفحه سبک رفرنس VERSO:
 * کل ویوپورت را می‌گیرد (fixed inset-0) و با «برش مورب» به دو نیمه تقسیم می‌شود؛
 * یک طرف فرم لاگین روی زمینه خود تم سایت، طرف دیگر پنل برند سرمه‌ای/طلایی با
 * لوگو، توضیحات و عکس هیرو در پس‌زمینه + موشن سینمایی (ورود اسلایدی، کن‌برنز،
 * اورورا، شیمر درز طلایی و جاروی تیغه هنگام سوییچ).
 */
export function AuthPage({
  mode,
  initialTab,
  initialTrack,
}: {
  mode: "login" | "register";
  /** تب اولیه — دیپ‌لینک (/register?role=expert) */
  initialTab?: "client" | "lawyer";
  /** مسیر عضویت اولیه — wakil | karamooz | expert */
  initialTrack?: "wakil" | "karamooz" | "expert";
}) {
  return (
    <div className="auth-stage fixed inset-0 z-[95] overflow-x-hidden overflow-y-auto">
      <AuthCard initialMode={mode} initialTab={initialTab} initialTrack={initialTrack} />
    </div>
  );
}
