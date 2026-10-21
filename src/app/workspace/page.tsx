import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/user-auth";
import { isLawyerSideRole } from "@/lib/roles";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("جعبه‌ابزار وکیل — فضای کاری دادورزان") },
    description: t(
      "همهٔ ابزارهای کاری وکیل در یک جا: دادخواست‌ساز هوشمند، لایحه، بررسی قرارداد، پژوهش حقوقی، محاسبه‌گرها، میز پرونده و شبیه‌سازی دادگاه.",
    ),
    robots: { index: false, follow: false },
  };
}
export const dynamic = "force-dynamic";

type ToolIcon = "file" | "signature" | "shield" | "book" | "gavel" | "search" | "calculator" | "folder" | "sparkles" | "chat" | "lock" | "landmark" | "scale" | "stamp" | "balance";

type ToolCard = {
  href: string;
  icon: ToolIcon;
  title: string;
  desc: string;
  tag?: string;
};

export default async function WorkspacePage() {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lawyerSide = isLawyerSideRole(user.role) || user.role === "staff" || user.role === "supervisor";

  /* ابزارهای مشترک همهٔ حساب‌ها */
  const common: ToolCard[] = [
    {
      href: "/court-sim",
      icon: "gavel",
      title: t("شبیه‌سازی دادگاه"),
      desc: t("تمرین جلسه با قاضی و وکیلِ خصم؛ بازخورد پاسخ‌ها و چک‌لیست آمادگی برای جلسهٔ واقعی."),
      tag: t("جدید"),
    },
    {
      href: "/ai-assistant",
      icon: "chat",
      title: t("دستیار هوشمند"),
      desc: t("پاسخ سریع حقوقی با استناد ماده‌ای، همراه با ورودی صوتی."),
    },
    {
      href: "/calculators",
      icon: "calculator",
      title: t("محاسبه‌گرهای حقوقی"),
      desc: t("مهریه، دیه، خسارت تأخیر تأدیه، هزینه دادرسی و حق‌الوکاله — با نرخ‌های قابل ویرایش."),
    },
    {
      href: "/dashboard/documents",
      icon: "lock",
      title: t("گاوصندوق اسناد"),
      desc: t("آپلود رمزنگاری‌شدهٔ اسناد مهم شما (AES-GCM سمت مرورگر)."),
    },
  ];

  /* ابزارهای تولید سند و پژوهش — مخصوص سمت وکیل */
  const lawyerTools: ToolCard[] = [
    {
      href: "/dashboard/lawyer#my-cases",
      icon: "folder",
      title: t("میز پرونده"),
      desc: t("تحلیل کل پرونده، کشف تناقض‌های احتمالی اسناد، قوت/ضعف، لایحه و تمرین دادگاه — از روی «پرونده‌های من»."),
      tag: t("جدید"),
    },
    {
      href: "/legal-forms",
      icon: "file",
      title: t("دادخواست‌ساز هوشمند"),
      desc: t("ویزارد فیلدها + تولید سند با استریم AI؛ کپی، چاپ و دانلود Word برای ۶ فرم رسمی."),
      tag: t("با سبک شما"),
    },
    {
      href: "/legal-forms/layehe",
      icon: "signature",
      title: t("لایحهٔ دفاعیه"),
      desc: t("تنظیم لایحهٔ دفاعیهٔ رسمی با استناد ماده‌ای — با رعایت پروفایل سبک نگارش شما."),
    },
    {
      href: "/contracts",
      icon: "shield",
      title: t("بررسی قرارداد"),
      desc: t("آپلود عکس/PDF/Word قرارداد؛ تحلیل ریسک، بندهای یک‌طرفه و پیشنهاد اصلاح."),
    },
    {
      href: "/knowledge",
      icon: "book",
      title: t("پژوهش حقوقی"),
      desc: t("مقالات و راهنماهای موضوعی با جستجوی هوشمند."),
    },
    {
      href: "/laws",
      icon: "landmark",
      title: t("متن قوانین"),
      desc: t("قوانین اصلی ایران به‌صورت ساختاریافته و جستج‌پذیر."),
    },
    {
      href: "/judgments",
      icon: "balance",
      title: t("آرای وحدت رویه"),
      desc: t("آرای وحدت رویهٔ دیوان عالی کشور، دسته‌بندی‌شده و قابل جستجو."),
    },
    {
      href: "/glossary",
      icon: "stamp",
      title: t("واژه‌نامهٔ حقوقی"),
      desc: t("معادل و تعریف کوتاه اصطلاحات حقوقی."),
    },
    {
      href: "/qa",
      icon: "search",
      title: t("انجمن پرسش و پاسخ"),
      desc: t("پرسش‌های حقوقی عمومی و پاسخ‌های راهنما — منبع کشف پرونده."),
    },
    {
      href: "/dashboard/lawyer/style",
      icon: "sparkles",
      title: t("سبک نگارش من"),
      desc: t("پروفایل سبک خود را بسازید تا اسناد تولیدی مثل خودتان نوشته شود."),
      tag: t("جدید"),
    },
  ];

  const tools = [...(lawyerSide ? lawyerTools : []), ...common];

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-legal.png"
        title={t("جعبه‌ابزار وکیل")}
        desc={t(
          "فضای کاری واحد وکیلِ عضو دادورزان: از تنظیم دادخواست و لایحه تا تحلیل پرونده، تمرین دادگاه و پژوهش حقوقی — همهٔ ابزارها یک‌جا.",
        )}
        breadcrumb={[
          { label: t("خانه"), href: "/" },
          { label: lawyerSide ? t("پنل وکیل") : t("پنل موکل"), href: lawyerSide ? "/dashboard/lawyer" : "/dashboard/client" },
          { label: t("جعبه‌ابزار") },
        ]}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
            <Icon name="badge" className="h-3.5 w-3.5 text-[#eec97b]" />
            {lawyerSide ? `${t("خوش آمدید، وکیل")}: ${user.name || t("همکار")}` : `${t("خوش آمدید")}: ${user.name || t("کاربر")}`}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
            <Icon name="bolt" className="h-3.5 w-3.5 text-[#eec97b]" />
            {t("ابزارهای تولید سند با هوش مصنوعی + راستی‌آزمایی وکیل")}
          </span>
        </div>
      </PageHero>

      <Container className="py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="workspace-grid">
          {tools.map((tool) => (
            <Card key={tool.href} hover className="group relative flex h-full flex-col justify-between overflow-hidden">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon name={tool.icon} className="h-5 w-5" />
                  </span>
                  {tool.tag && <Badge tone="accent">{tool.tag}</Badge>}
                </div>
                <h2 className="text-[15px] font-bold text-foreground">{tool.title}</h2>
                <p className="mt-1.5 text-[13px] leading-6 text-foreground-soft">{tool.desc}</p>
              </div>
              <div className="mt-4">
                <Button href={tool.href} variant="soft" size="sm" icon="arrow" className="w-full justify-center">
                  {t("ورود به ابزار")}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {!lawyerSide && (
          <Card hover={false} className="mt-6 border-accent/30 bg-accent-soft/30">
            <p className="text-sm leading-7 text-foreground-soft">
              {t(
                "شما با حساب موکل وارد شده‌اید؛ ابزارهای مخصوص وکلا (دادخواست‌ساز، لایحه، بررسی قرارداد و پژوهش) برای حساب‌های وکیل فعال است. برای ثبت پرونده و پیگیری، از پنل موکل استفاده کنید.",
              )}
            </p>
            <div className="mt-3">
              <Button href="/dashboard/client" variant="outline" size="sm" icon="user">
                {t("رفتن به پنل موکل")}
              </Button>
            </div>
          </Card>
        )}

        <p className="mt-6 text-center text-[11px] leading-6 text-foreground-soft">
          {t(
            "ابزارهای هوشمند دادورزان یاورِ کار وکیل‌اند: خروجی‌ها «پیش‌نویس» هستند و راستی‌آزمایی نهایی با وکیل؛ هیچ تضمینی برای نتیجهٔ دادگاه وجود ندارد.",
          )}
        </p>
      </Container>
    </>
  );
}
