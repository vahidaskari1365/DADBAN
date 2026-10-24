import { guardAdminPage } from "@/lib/admin-auth";
import { Container, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

/**
 * تقویم محتوای سئو — نقشه راه ۱۲ هفته‌ای مصوب (سئو/AEO/GEO) + چرخه دوم ۱۳–۲۴.
 * صفحه مرجع عملیاتی تیم محتوا: هر هفته چه چیزی تولید/به‌روز شود.
 */

type PlanStatus = "done" | "progress" | "todo";
type PlanRow = { week: string; type: "landing" | "article" | "qa" | "geo"; task: string; target: string; status: PlanStatus };

const PLAN: PlanRow[] = [
  { week: "هفته ۱", type: "landing", task: "صفحه تعرفه /fee-guide + صفحات فرود ۱۲ تخصص + ۱۵ شهر + ۱۸۰ ترکیبی", target: "تعرفه وکالت ۱۴۰۵، وکیل طلاق، وکیل کیفری…", status: "done" },
  { week: "هفته ۱", type: "geo", task: "IndexNow + ربات‌های AI در robots + llms.txt غنی‌شده", target: "ChatGPT / Perplexity / Bing", status: "done" },
  { week: "هفته ۲", type: "article", task: "۲ مقاله: «چگونه وکیل خوب انتخاب کنیم» + «تعرفه وکالت ۱۴۰۵» (سوال‌محور، ۱۵۰۰+ کلمه)", target: "چگونه وکیل خوب انتخاب کنیم", status: "done" },
  { week: "هفته ۲", type: "qa", task: "۲۰ پرسش/پاسخ جدید از سوالات AEO خوشه خانواده", target: "طلاق توافقی چقدر طول می‌کشد…", status: "done" },
  { week: "هفته ۳", type: "article", task: "۳ مقاله خوشه کیفری: کلاهبرداری، خیانت در امانت، برگشت چک", target: "مجازات برگشت خوردن چک", status: "done" },
  { week: "هفته ۳", type: "geo", task: "Google Search Console + Bing Webmaster + سابمیت sitemap (workflows فعال)", target: "ایندکس کامل", status: "done" },
  { week: "هفته ۴", type: "article", task: "خوشه ملکی: تخلیه و الزام به سند (موجود) + مقاله جدید «دفاع مستأجر در دعوای تخلیه»", target: "مراحل دعوای تخلیه", status: "done" },
  { week: "هفته ۴", type: "qa", task: "۲۰ پرسش/پاسخ خوشه کیفری و چک", target: "long-tail کیفری", status: "done" },
  { week: "هفته ۵", type: "article", task: "به‌روزرسانی ۱۱ مقاله موجود با بلوک پاسخ خودکفای ۱۴۰۵ + bump نسخه محتوا (dateModified صادقانه)", target: "تازگی محتوا (GEO ×۳)", status: "done" },
  { week: "هفته ۶", type: "article", task: "۳ مقاله خوشه کار و مالیاتی: اخراج غیرقانونی، سنوات، برگ تشخیص", target: "اخراج غیرقانونی", status: "done" },
  { week: "هفته ۷", type: "geo", task: "ویکی‌دیتا + لینکدین — پیش‌نویس و راهنمای کامل آماده (docs/geo)؛ اقدام نهایی نیازمند حساب‌های رسمی", target: "سیگنال برند برای ChatGPT", status: "progress" },
  { week: "هفته ۸", type: "qa", task: "۲۰ پرسش/پاسخ خوشه ملکی و ارث", target: "long-tail ملکی", status: "done" },
  { week: "هفته ۹", type: "geo", task: "آپارات/یوتیوب — سناریوی ۴ ویدیوی ۲ دقیقه‌ای آماده (docs/geo)؛ ضبط و انتشار نیازمند کانال رسمی", target: "قوی‌ترین سیگنال GEO", status: "progress" },
  { week: "هفته ۱۰", type: "article", task: "۳ مقاله خوشه تجاری: داوری، وصول مطالبات، ثبت علامت تجاری", target: "وکیل داوری", status: "done" },
  { week: "هفته ۱۱", type: "geo", task: "«گزارش آماری دادورزان» — /reports/cases-1405 با داده واقعی DB + Dataset schema", target: "citation مغناطیسی AI", status: "done" },
  { week: "هفته ۱۲", type: "landing", task: "گسترش شهرها به فاز ۲ — ۲۰ لندینگ شهر جدید با محتوای اختصاصی (۳۵ شهر × ۱۳ تخصص)", target: "machine scale", status: "done" },
];

const PLAN2: PlanRow[] = [
  { week: "هفته ۱۳", type: "geo", task: "آدیت دوره‌ای GSC (workflow gsc-audit) + رفع خطاهای ایندکس باقی‌مانده", target: "پوشش کامل ایندکس", status: "todo" },
  { week: "هفته ۱۴", type: "qa", task: "۱۰ پرسش/پاسخ جدید از کوئری‌های بدون کلیک GSC (impressions بالا، CTR پایین)", target: "شکار long-tail واقعی", status: "todo" },
  { week: "هفته ۱۵", type: "geo", task: "لینک‌سازی خارجی: گست‌پست در رسانه‌های حقوقی و خبری + دایرکتوری‌های کسب‌وکار", target: "authority", status: "todo" },
  { week: "هفته ۱۶", type: "article", task: "به‌روزرسانی فصلی مقالات پربازدید (تازه‌سازی تعرفه‌ها و سال‌ها)", target: "freshness پیوسته", status: "todo" },
  { week: "هفته ۱۷", type: "geo", task: "نوبت دوم ویدیو: ۴ ویدیو جدید + ترانویسی فارسی + embed در مقالات", target: "سیگنال ویدیویی", status: "todo" },
  { week: "هفته ۱۸", type: "landing", task: "عمیق‌سازی SXO لندینگ‌های ترکیبی: مراجع محلی + بلوک سوال‌محور برای ۳۵ شهر", target: "تبدیل و رتبه", status: "todo" },
  { week: "هفته ۱۹", type: "geo", task: "بروزرسانی گزارش آماری + تفکیک موضوعی (کاهش صف خالی)", target: "citation پایدار", status: "todo" },
  { week: "هفته ۲۰", type: "geo", task: "مانیتورینگ GEO: بررسی نقل‌شدن دادورزان در پاسخ‌های ChatGPT/Perplexity و ثبت شکاف‌ها", target: "AI share of voice", status: "todo" },
  { week: "هفته ۲۱", type: "qa", task: "۱۰ پرسش/پاسخ خوشه خانواده فاز ۲ (سوالات نیمه‌سالی)", target: "پوشش مکمل", status: "todo" },
  { week: "هفته ۲۲", type: "article", task: "بهینه‌سازی CTR: بازنویسی title/description صفحات با نمایش بالا و کلیک پایین (از GSC)", target: "CTR ×۲", status: "todo" },
  { week: "هفته ۲۳", type: "article", task: "لینک‌سازی داخلی دوره دوم: تکمیل گراف hub-spoke همه مقالات به لندینگ‌ها", target: "PageRank داخلی", status: "todo" },
  { week: "هفته ۲۴", type: "geo", task: "بازبینی کل چرخه ۱۲ هفته + تدوین برنامه فاز ۳ بر اساس داده واقعی", target: "چرخه بعدی", status: "todo" },
];

const TYPE_META: Record<string, { label: string; tone: "primary" | "accent" | "success" | "neutral"; icon: string }> = {
  landing: { label: "صفحه فرود", tone: "primary", icon: "gavel" },
  article: { label: "مقاله", tone: "accent", icon: "book" },
  qa: { label: "پرسش/پاسخ", tone: "success", icon: "chat" },
  geo: { label: "برند/GEO", tone: "neutral", icon: "globe" },
};

function PlanTable({ rows, title }: { rows: PlanRow[]; title: string }) {
  const done = rows.filter((p) => p.status === "done").length;
  return (
    <Container className="!px-0">
      <div className="flex items-center justify-between px-1 pb-2">
        <h2 className="flex items-center gap-2 text-base font-black text-foreground">{title}</h2>
        <Badge tone="primary">{`${done} از ${rows.length} انجام شده`}</Badge>
      </div>
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
              {rows.map((row) => {
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
  );
}

export default async function AdminContentCalendarPage() {
  await guardAdminPage("content");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-foreground">
            <Icon name="calendar" className="h-5 w-5 text-primary" />
            تقویم محتوای سئو (چرخه ۱: هفته ۱–۱۲ | چرخه ۲: هفته ۱۳–۲۴)
          </h1>
          <p className="mt-1 text-sm text-muted">
            نقشه راه مصوب سئو/AEO/GEO — چرخه اول کامل اجرا شده است؛ ۶۴ مقاله، ۶۶ پرسش/پاسخ و ۳۵ لندینگ شهر فعال است.
          </p>
        </div>
        <Badge tone="success">چرخه ۱: ۱۳ از ۱۶ انجام شد</Badge>
      </div>

      <PlanTable rows={PLAN} title="چرخه اول — نقشه ۱۲ هفته‌ای (اجرا شد)" />
      <PlanTable rows={PLAN2} title="چرخه دوم — برنامه هفته ۱۳ تا ۲۴ (برنامه جدید)" />
    </div>
  );
}
