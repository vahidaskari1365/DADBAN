import type { Metadata } from "next";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "حریم خصوصی — دادبان",
  description: "سیاست حفظ حریم خصوصی کاربران پلتفرم حقوقی دادبان.",
};

const SECTIONS = [
  ["۱. اطلاعات جمع‌آوری‌شده", "نام، شماره تماس، اطلاعات پرونده و محتوای گفتگوهایی که هنگام استفاده از خدمات ثبت می‌کنید."],
  ["۲. نحوه استفاده از اطلاعات", "اطلاعات شما برای ارائه خدمات، بررسی درخواست‌ها، بهبود پلتفرم و اطلاع‌رسانی پیرامون پرونده استفاده می‌شود."],
  ["۳. اشتراک‌گذاری اطلاعات", "اطلاعات پرونده فقط با وکیل منتخب شما و صرفاً برای ارائه خدمت به اشتراک گذاشته می‌شود. بدون رضایت شما داده‌ای فروخته یا اجاره داده نمی‌شود."],
  ["۴. امنیت داده‌ها", "داده‌ها با رمزنگاری محافظت شده و دسترسی به آن‌ها محدود به پرسنل مجاز است. رمز عبور شما به‌صورت هش‌شده ذخیره می‌شود."],
  ["۵. کوکی‌ها", "برای بهبود تجربه کاربری و تحلیل بازدید از کوکی استفاده می‌کنیم. می‌توانید کوکی‌ها را از مرورگر خود غیرفعال کنید."],
  ["۶. حقوق شما", "شما می‌توانید در هر زمان درخواست مشاهده، اصلاح یا حذف اطلاعات خود را از طریق صفحه تماس ثبت کنید."],
];

export default function PrivacyPage() {
  return (
    <Container className="py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-extrabold text-foreground">حریم خصوصی</h1>
        <p className="mt-2 text-sm text-muted">حفظ حریم خصوصی شما برای ما اولویت است. آخرین به‌روزرسانی: بهار ۱۴۰۴</p>
        <div className="mt-6 space-y-5">
          {SECTIONS.map(([t, b]) => (
            <div key={t} className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-base font-bold text-foreground">{t}</h2>
              <p className="mt-2 text-sm leading-7 text-muted">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
