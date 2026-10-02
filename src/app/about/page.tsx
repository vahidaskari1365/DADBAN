import type { Metadata } from "next";
import { Container, Card, Badge, Stat } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getPlatformStats } from "@/lib/stats";
import { faNum } from "@/lib/data";
import Link from "next/link";

export const metadata: Metadata = {
  title: "درباره دادبان",
  description:
    "دادبان پلتفرم هوشمند خدمات حقوقی برای اتصال موکلان به وکلای متخصص، با مشاوره آنلاین، مدیریت پرونده، تنظیم اسناد و دستیار حقوقی هوش مصنوعی.",
  alternates: { canonical: "/about" },
};

const LAYERS = [
  { title: "لایه جذب", desc: "SEO، مقالات، جستجوی وکیل و پرسش و پاسخ", icon: "search" as const },
  { title: "لایه تشخیص", desc: "دستیار هوش مصنوعی و ارزیابی اولیه پرونده", icon: "sparkles" as const },
  { title: "لایه ارائه خدمت", desc: "مشاوره، وکالت، تنظیم قرارداد و اسناد", icon: "chat" as const },
  { title: "لایه اجرای پرونده", desc: "مدیریت پرونده، اسناد، جلسات، مهلت‌ها و پرداخت", icon: "folder" as const },
  { title: "لایه اکوسیستم", desc: "قوانین، آموزش، خدمات ثبتی و خدمات کسب‌وکارها", icon: "landmark" as const },
];

const VALUES = [
  { title: "اعتماد و شفافیت", desc: "احراز هویت وکلا، تعرفه شفاف و گزارش‌دهی دقیق.", icon: "shield" as const },
  { title: "دسترسی برابر به عدالت", desc: "ارزان‌ترین و سریع‌ترین مسیر دسترسی به مشاوره حقوقی.", icon: "balance" as const },
  { title: "فناوری برای همه", desc: "از دستیار هوش مصنوعی تا مدیریت اسناد، همه کارها آنلاین.", icon: "bolt" as const },
  { title: "محرمانگی", desc: "حفاظت از اطلاعات شما با بالاترین استانداردهای امنیتی.", icon: "lock" as const },
];

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const stats = await getPlatformStats();
  const statItems = [
    { value: stats.verifiedLawyers != null ? faNum(stats.verifiedLawyers) : "—", label: "وکیل تأییدشده", icon: "badge" as const },
    { value: stats.registeredCases != null ? faNum(stats.registeredCases) : "—", label: "پرونده ثبت‌شده", icon: "folder" as const },
    { value: stats.answeredQuestions != null ? faNum(stats.answeredQuestions) : "—", label: "پرسش حقوقی", icon: "chat" as const },
    { value: stats.publishedArticles != null ? faNum(stats.publishedArticles) : "—", label: "مقاله منتشرشده", icon: "document" as const },
  ];
  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-primary-soft/40 to-background py-12">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Badge tone="primary" icon="balance">درباره ما</Badge>
            <h1 className="mt-3 text-3xl font-extrabold text-foreground sm:text-4xl">عدالت، در دسترس همه</h1>
            <p className="mt-4 text-base leading-8 text-muted">
              دادبان با هدف دموکراتیزه‌کردن دسترسی به خدمات حقوقی ساخته شده است؛ پلتفرمی که وکیل‌یابی، مشاوره
              آنلاین، مدیریت پرونده، تنظیم اسناد و دستیار حقوقی هوش مصنوعی را در یک‌جا گرد می‌آورد.
            </p>
          </div>
        </Container>
      </section>

      <Container className="py-12">
        <div className="grid grid-cols-2 gap-6 rounded-3xl border border-border bg-surface p-8 card-shadow sm:grid-cols-4">
          {statItems.map((s) => <Stat key={s.label} {...s} />)}
        </div>
      </Container>

      {/* Mission */}
      <Container className="py-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">مأموریت ما</h2>
            <p className="mt-3 text-sm leading-8 text-muted">
              معتقدیم دسترسی به مشاوره حقوقی نباید پیچیده، گران یا کند باشد. دادبان با ترکیب تخصص وکلای دادگستری و
              فناوری روز، تجربه‌ای ساده، شفاف و قابل اعتماد برای حل مسائل حقوقی شما فراهم می‌کند.
            </p>
            <ul className="mt-5 space-y-2.5">
              {["احراز هویت و راستی‌آزمایی همه وکلا", "مشاوره متنی، صوتی و تصویری آنلاین", "مدیریت یکپارچه پرونده و اسناد", "دستیار هوش مصنوعی حقوقی ۲۴ ساعته"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-foreground-soft"><Icon name="check" className="h-4 w-4 text-success" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-hover p-8 text-primary-foreground">
            <Icon name="balance" className="absolute -bottom-6 -left-6 h-48 w-48 opacity-10" />
            <p className="relative text-lg font-bold leading-8">«هدف ما این است که هر ایرانی، فارغ از شهر و توان مالی، به مشاوره حقوقی باکیفیت دسترسی داشته باشد.»</p>
            <p className="relative mt-4 text-sm text-white/80">— تیم بنیان‌گذار دادبان</p>
          </div>
        </div>
      </Container>

      {/* Layers */}
      <Container className="py-12">
        <h2 className="text-center text-2xl font-bold text-foreground">معماری پنج‌لایه دادبان</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted">از جذب کاربر تا اکوسیستم کامل حقوقی، یک سفر یکپارچه.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {LAYERS.map((l, i) => (
            <Card key={l.title} className="text-center">
              <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon name={l.icon} className="h-5 w-5" /></span>
              <p className="mt-3 text-xs font-bold text-accent">لایه {i + 1}</p>
              <h3 className="mt-1 text-sm font-bold text-foreground">{l.title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted">{l.desc}</p>
            </Card>
          ))}
        </div>
      </Container>

      {/* Values */}
      <Container className="py-12">
        <h2 className="text-center text-2xl font-bold text-foreground">ارزش‌های ما</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <Card key={v.title}>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name={v.icon} className="h-5 w-5" /></span>
              <h3 className="mt-3 text-sm font-bold text-foreground">{v.title}</h3>
              <p className="mt-1 text-xs leading-6 text-muted">{v.desc}</p>
            </Card>
          ))}
        </div>
      </Container>

      <Container className="py-12">
        <div className="rounded-3xl border border-border bg-surface p-8 text-center card-shadow">
          <h2 className="text-xl font-bold text-foreground">آماده‌اید به ما بپیوندید؟</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">چه به دنبال وکیل باشید چه عضو تیم وکلای دادبان، خوشحال می‌شویم همراهتان باشیم.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/lawyers" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"><Icon name="search" className="h-4 w-4" /> پیدا کردن وکیل</Link>
            <Link href="/contact" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border-strong bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"><Icon name="mail" className="h-4 w-4" /> تماس با ما</Link>
          </div>
        </div>
      </Container>
    </>
  );
}
