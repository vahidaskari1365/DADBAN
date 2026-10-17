import { guardAdminPage } from "@/lib/admin-auth";
import { Container, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

/**
 * تقویم محتوای سئو — نقشه راه ۱۲ هفته‌ای مصوب (سئو/AEO/GEO).
 * صفحه مرجع عملیاتی تیم محتوا: هر هفته چه چیزی تولید/به‌روز شود.
 */
const PLAN: { week: string; type: "landing" | "article" | "qa" | "geo"; task: string; target: string; status: "done" | "progress" | "todo" }[] = [
  { week: "هفته ۱", type: "landing", task: "صفحه تعرفه /fee-guide + صفحات فرود ۱۲ تخصص + ۱۵ شهر + ۱۸۰ ترکیبی", target: "تعرفه وکالت ۱۴۰۵، وکیل طلاق، وکیل کیفری…", status: "done" },
  { week: "هفته ۱", type: "geo", task: "IndexNow + ربات‌های AI در robots + llms.txt غنی‌شده", target: "ChatGPT / Perplexity / Bing", status: "done" },
  { week: "هفته ۲", type: "article", task: "۲ مقاله: «چگونه وکیل خوب انتخاب کنیم» + «تعرفه وکالت ۱۴۰۵» (سوال‌محور)", target: "چگونه وکیل خوب انتخاب کنیم", status: "todo" },
  { week: "هفته ۲", type: "qa", task: "۲۰ پرسش/پاسخ جدید از سوالات AEO خوشه خانواده", target: "طلاق توافقی چقدر طول می‌کشد…", status: "todo" },
  { week: "هفته ۳", type: "article", task: "۳ مقاله خوشه کیفری: کلاهبرداری، خیانت در امانت، برگشت چک", target: "مجازات برگشت خوردن چک", status: "todo" },
  { week: "هفته ۳", type: "geo", task: "ثبت Google Search Console + Bing Webmaster + سابمیت sitemap", target: "ایندکس کامل", status: "todo" },
  { week: "هفته ۴", type: "article", task: "۳ مقاله خوشه ملکی: تخلیه، الزام به تنظیم سند، سرقفلی", target: "مراحل دعوای تخلیه", status: "todo" },
  { week: "هفته ۴", type: "qa", task: "۲۰ پرسش/پاسخ خوشه کیفری و چک", target: "long-tail کیفری", status: "todo" },
  { week: "هفته ۵", type: "article", task: "به‌روزرسانی ۱۰ مقاله موجود با سال ۱۴۰۵ + بلوک پاسخ خودکفا", target: "تازگی محتوا (GEO ×۳)", status: "todo" },
  { week: "هفته ۶", type: "article", task: "۳ مقاله خوشه کار و مالیاتی: اخراج، سنوات، برگ تشخیص", target: "اخراج غیرقانونی", status: "todo" },
  { week: "هفته ۷", type: "geo", task: "آیتم ویکی‌دیتای «دادورزان» + صفحه لینکدین شرکت", target: "سیگنال برند برای ChatGPT", status: "todo" },
  { week: "هفته ۸", type: "qa", task: "۲۰ پرسش/پاسخ خوشه ملکی + ارث", target: "long-tail ملکی", status: "todo" },
  { week: "هفته ۹", type: "geo", task: "راه‌اندازی کانال آپارات/یوتیوب — ۴ ویدیو ۲ دقیقه‌ای", target: "قوی‌ترین سیگنال GEO", status: "todo" },
  { week: "هفته ۱۰", type: "article", task: "۳ مقاله خوشه تجاری: داوری، وصول مطالبات، ثبت برند", target: "وکیل داوری", status: "todo" },
  { week: "هفته ۱۱", type: "geo", task: "«گزارش آماری پرونده‌های دادورزان» — داده اختصاصی قابل نقل", target: "citation مغناطیسی AI", status: "todo" },
  { week: "هفته ۱۲", type: "landing", task: "بازبینی رتبه‌ها و گسترش شهرها به فاز دوم (۲۰ شهر جدید)", target: "machine scale", status: "todo" },
];

const TYPE_META: Record<string, { label: string; tone: "primary" | "accent" | "success" | "neutral"; icon: string }> = {
  landing: { label: "صفحه فرود", tone: "primary", icon: "gavel" },
  article: { label: "مقاله", tone: "accent", icon: "book" },
  qa: { label: "پرسش/پاسخ", tone: "success", icon: "chat" },
  geo: { label: "برند/GEO", tone: "neutral", icon: "globe" },
};

export default async function AdminContentCalendarPage() {
  await guardAdminPage("content");

  const done = PLAN.filter((p) => p.status === "done").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-foreground">
            <Icon name="calendar" className="h-5 w-5 text-primary" />
            تقویم محتوای سئو (۱۲ هفته)
          </h1>
          <p className="mt-1 text-sm text-muted">
            نقشه راه مصوب سئو/AEO/GEO — وضعیت پیش‌فرض تولید محتوا. صفحات فرود فاز ۱ منتشر شده است.
          </p>
        </div>
        <Badge tone="primary">{`${done} از ${PLAN.length} انجام شده`}</Badge>
      </div>

      <Container className="!px-0">
        <Card hover={false} className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-xs text-muted">
                  <th scope="col" className="p-3.5 font-bold">هفته</th>
                  <th scope="col" className="p-3.5 font-bold">نوع</th>
                  <th scope="col" className="p-3.5 font-bold">اقدام</th>
                  <th scope="col" className="p-3.5 font-bold">کلمات هدف</th>
                  <th scope="col" className="p-3.5 font-bold">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {PLAN.map((row) => {
                  const meta = TYPE_META[row.type];
                  return (
                    <tr key={row.week + row.task} className="border-b border-border/60 last:border-0 hover:bg-surface-2/50">
                      <td className="whitespace-nowrap p-3.5 font-bold text-foreground">{row.week}</td>
                      <td className="p-3.5">
                        <Badge tone={meta.tone}>
                          <Icon name={meta.icon as never} className="h-3 w-3" />
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="p-3.5 leading-6 text-foreground">{row.task}</td>
                      <td className="p-3.5 text-xs leading-5 text-muted">{row.target}</td>
                      <td className="p-3.5">
                        {row.status === "done" ? (
                          <Badge tone="success">✓ انجام شد</Badge>
                        ) : row.status === "progress" ? (
                          <Badge tone="accent">در جریان</Badge>
                        ) : (
                          <Badge tone="neutral">در نوبت</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </Container>
    </div>
  );
}
