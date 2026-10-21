import Link from "next/link";
import { Container } from "@/components/ui";
import { FaqSection } from "@/components/seo/faq-section";
import { SeoLinkGrid } from "@/components/seo/link-grid";
import { safeJsonLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";
import { SITE_NAME } from "@/lib/brand";
import type { FaqItem } from "@/lib/seo-landings";

/**
 * بخش سئوی سرور-رندر صفحه دستیار هوش مصنوعی (گام ۳ — خوشه هوش مصنوعی و حقوق).
 *
 * چرا؟ صفحه اصلی ابزار «use client» است و فقط رابط چت را رندر می‌کند؛ موتورهای
 * پاسخ‌محور (AI Overviews، Perplexity، Copilot) برای نقل‌قول به محتوای خودکفای
 * سرور-رندر نیاز دارند. این بخش در layout بعد از ابزار قرار می‌گیرد:
 *  - بلوک پاسخ سریع (AEO — کلاس .aeo-quick-answer برای Speakable)
 *  - قابلیت‌ها + مرزهای قانونی با استناد واقعی (GEO)
 *  - جدول تصمیم «دستیار یا وکیل؟» (SXO)
 *  - FAQ + FAQPage schema (AEO) — دقیقاً یک FAQPage در صفحه
 *  - WebApplication + BreadcrumbList JSON-LD + لینک‌سازی داخلی (Hub/Spoke)
 */
const AI_FAQS: FaqItem[] = [
  {
    q: "آیا هوش مصنوعی می‌تواند جای وکیل را بگیرد؟",
    a: "خیر. وکالت در دادگاه فقط از اختیارات اشخاص دارای پروانه وکالت است. دستیار هوش مصنوعی در فهم مسیر، مراحل، مدارک و تحلیل قرارداد کمک می‌کند، اما انتخاب استراتژی، حضور در جلسه و دفاع پرونده کار وکیل است.",
  },
  {
    q: "استفاده از دستیار حقوقی دادورزان هزینه دارد؟",
    a: "خیر؛ پرسش و پاسخ حقوقی و تحلیل قرارداد با دستیار دادورزان رایگان و بدون ثبت‌نام است. اگر پرونده نیاز به اقدام واقعی داشته باشد، همان‌جا می‌توانید به وکیل متخصص موضوع ارجاع شوید یا مشاوره آنلاین رزرو کنید.",
  },
  {
    q: "گفتگوی من محرمانه می‌ماند؟",
    a: "تاریخچه گفتگوها فقط روی همین دستگاه شما (مرورگر) ذخیره می‌شود و هر لحظه قابل حذف است. رمزها، شماره کارت و مدارک کامل اشخاص ثالث را در هیچ چت آنلاینی وارد نکنید.",
  },
  {
    q: "پاسخ‌های دستیار بر چه اساسی است؟",
    a: "پاسخ‌ها با استناد به قوانین ایران داده می‌شود و منبع هر پاسخ با لینک به متن قانون قابل بررسی است. پاسخ دستیار آموزشی است و جایگزین نظر کارشناسی وکیل درباره پرونده خاص شما نیست.",
  },
  {
    q: "تحلیل قرارداد با عکس هم ممکن است؟",
    a: "بله؛ متن قرارداد را بنویسید یا عکس آن را بارگذاری کنید. دستیار بندهای پرریسک، جریمه‌های سنگین و ابهام‌ها را استخراج و امتیاز ریسک می‌دهد. عکس صاف، روشن و بدون سایه بهترین نتیجه را می‌دهد.",
  },
];

export function AiAssistantSeoContent() {
  const appSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/ai-assistant#app`,
        name: "دستیار حقوقی هوش مصنوعی دادورزان",
        url: `${SITE_URL}/ai-assistant`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "fa-IR",
        description:
          "دستیار حقوقی هوش مصنوعی دادورزان: تشخیص موضوع حقوقی، پاسخ با استناد به قوانین ایران، تحلیل قرارداد و اتصال به وکیل متخصص — رایگان و آنلاین.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "IRR" },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "خانه", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "دستیار حقوقی هوش مصنوعی", item: `${SITE_URL}/ai-assistant` },
        ],
      },
    ],
  };

  return (
    <section aria-label="راهنمای دستیار حقوقی هوش مصنوعی" className="border-t border-border bg-surface-2/40 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(appSchema) }} />
      <Container className="space-y-8">
        <div className="aeo-quick-answer rounded-2xl border border-accent/30 bg-accent-soft/40 p-5">
          <h2 className="text-base font-bold text-foreground sm:text-lg">
            دستیار حقوقی هوش مصنوعی در یک نگاه
          </h2>
          <p className="mt-2 text-sm leading-7 text-foreground-soft sm:text-base">
            دستیار حقوقی هوش مصنوعی دادورزان رایگان است: پرسش شما را می‌خواند، موضوع حقوقی را تشخیص
            می‌دهد، مراحل و مدارک را با استناد به قوانین ایران توضیح می‌دهد و قرارداد شما را از نظر
            بندهای پرریسک تحلیل می‌کند. وکالت در دادگاه فقط با وکیل دارای پروانه ممکن است؛ دستیار مسیر
            را روشن می‌کند و در گام بعد شما را به وکیل متخصص همان موضوع وصل می‌کند.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="text-lg font-bold text-foreground sm:text-xl">دستیار چه کارهایی می‌کند؟</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground-soft sm:text-base">
              <li>
                <strong className="text-foreground">تشخیص موضوع و مسیر:</strong> مشخص می‌کند پرونده شما
                حقوقی است یا کیفری و به کدام مرجع (شورای حل اختلاف، دادگاه خانواده، دادسرا) باید بروید.
              </li>
              <li>
                <strong className="text-foreground">پاسخ با استناد به قانون:</strong> هر پاسخ به متن
                <Link href="/laws" className="mx-1 font-semibold text-primary hover:underline">قوانین ایران</Link>
                وصل است؛ از قانون وکالت تا قانون تجارت الکترونیکی و جرایم رایانه‌ای.
              </li>
              <li>
                <strong className="text-foreground">تحلیل قرارداد:</strong> متن یا عکس قرارداد را
                می‌گیرد، بندهای پرریسک و جریمه‌های سنگین را علامت می‌زند و امتیاز ریسک می‌دهد.
              </li>
              <li>
                <strong className="text-foreground">اتصال به وکیل درست:</strong> از متن گفتگو تخصص
                موردنیاز را تشخیص می‌دهد و وکلای تأییدشده همان موضوع را با تعرفه شفاف پیشنهاد می‌دهد.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="text-lg font-bold text-foreground sm:text-xl">مرزها؛ کجا پای وکیل وسط است؟</h2>
            <ol className="mt-4 space-y-3 text-sm leading-7 text-foreground-soft sm:text-base">
              <li>
                <strong className="text-foreground">وکالت فقط با پروانه:</strong> دفاع در محاکم از
                اختیارات دارندگان پروانه وکالت است؛ هیچ سیستمی «وکیل» شما نیست.
              </li>
              <li>
                <strong className="text-foreground">پاسخ آموزشی است:</strong> دستیار احتمال‌ها و مسیرها
                را می‌گوید؛ نظر قطعی و شخصی‌سازی‌شده فقط پس از بررسی سندها توسط وکیل معنا دارد.
              </li>
              <li>
                <strong className="text-foreground">حریم خصوصی:</strong> تاریخچه گفتگو فقط روی دستگاه
                شما ذخیره می‌شود؛ اصل ۲۵ قانون اساسی حریم اشخاص را مصون می‌داند.
              </li>
            </ol>
            <p className="mt-4 text-sm leading-7 text-foreground-soft sm:text-base">
              راهنمای کامل کاربرد و محدودیت‌ها را در مقاله{" "}
              <Link
                href="/knowledge/moshaver-hoghoghi-hoosh-masnooie"
                className="font-semibold text-primary hover:underline"
              >
                مشاوره حقوقی با هوش مصنوعی چطور کار می‌کند و تا کجا جواب می‌دهد؟
              </Link>{" "}
              بخوانید.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">دستیار هوش مصنوعی یا وکیل؟</h2>
          <div className="mt-4 overflow-x-auto nice-scroll">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-start">
                  <th className="pb-2 text-start font-semibold">نیاز شما</th>
                  <th className="pb-2 text-start font-semibold">دستیار هوش مصنوعی</th>
                  <th className="pb-2 text-start font-semibold">وکیل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {[
                  ["فهم اصطلاح یا بند قرارداد", "بله — پاسخ فوری", "لازم نیست"],
                  ["مراحل، مدارک و مهلت‌ها", "بله — گام‌به‌گام", "لازم نیست"],
                  ["بازبینی قرارداد قبل از امضا", "تحلیل اولیه و ریسک‌ها", "برای قراردادهای سنگین"],
                  ["پرونده در جریان دادگاه", "فقط برای فهم مراحل", "بله — دفاع و پیگیری"],
                  ["مطالبه مهریه یا چک برگشتی", "مسیر و محاسبه‌گر", "بله — دادخواست و اجرا"],
                ].map((row) => (
                  <tr key={row[0]}>
                    <td className="py-2.5 pe-3 text-foreground">{row[0]}</td>
                    <td className="py-2.5 pe-3 text-foreground-soft">{row[1]}</td>
                    <td className="py-2.5 text-foreground-soft">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <SeoLinkGrid
          title="گام بعدی و منابع مرتبط"
          links={[
            { label: "مشاوره حقوقی با هوش مصنوعی چطور کار می‌کند؟", href: "/knowledge/moshaver-hoghoghi-hoosh-masnooie" },
            { label: "تفاوت وکیل پایه یک و مشاور حقوقی", href: "/knowledge/tafavot-vakil-payeh-yek-moshaver" },
            { label: "هزینه وکیل و تعرفه وکالت", href: "/knowledge/hazine-vakil-tarefe-vekalat" },
            { label: "پایگاه قوانین ایران", href: "/laws" },
            { label: "محاسبه‌گرهای حقوقی (مهریه، دیه، هزینه دادرسی)", href: "/calculators" },
            { label: "فرم‌های حقوقی: دادخواست و شکواییه", href: "/legal-forms" },
            { label: "جستجوی وکلای متخصص دادورزان", href: "/lawyers" },
            { label: "رزرو مشاوره آنلاین", href: "/consultation" },
          ]}
        />

        <FaqSection items={AI_FAQS} canonicalPath="/ai-assistant" title="پرسش‌های متداول درباره دستیار حقوقی هوش مصنوعی" />

        <p className="text-xs leading-6 text-muted">
          پاسخ‌های دستیار صرفاً جنبه آموزشی دارد و جایگزین نظر کارشناسی وکیل نیست؛ برای تصمیم‌گیری در
          پرونده خود با وکیل یا مشاور رسمی مشورت کنید.
        </p>
      </Container>
    </section>
  );
}
