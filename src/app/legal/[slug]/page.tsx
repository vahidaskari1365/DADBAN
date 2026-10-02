import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { TRUST_PAGES } from "@/lib/content";

export const revalidate = 300;

// Generic legal/trust content blocks per page.
const CONTENT: Record<string, { h: string; p: string }[]> = {
  terms: [
    { h: "پذیرش شرایط", p: "با استفاده از خدمات دادبان، این شرایط را می‌پذیرید. دادبان به‌عنوان واسطه‌ی ارتباطی میان موکل و وکیل عمل می‌کند و طرف قرارداد حقوقی میان وکیل و موکل نیست." },
    { h: "تعهدات کاربر", p: "کاربر متعهد می‌شود اطلاعات صحیح ارائه دهد، از خدمات به‌صورت قانونی استفاده کند و حقوق سایر کاربران و وکلا را رعایت نماید." },
    { h: "مسئولیت‌ها", p: "خدمات مشاوره و تنظیم سند توسط وکلا ارائه می‌شود و مسئولیت حرفه‌ی وکالت بر عهده‌ی وکیل مربوطه است. دادبان بستری برای ارتباط فراهم می‌سازد." },
  ],
  privacy: [
    { h: "جمع‌آوری اطلاعات", p: "ما تنها اطلاعاتی را جمع‌آوری می‌کنیم که برای ارائه‌ی خدمات ضروری است؛ شامل اطلاعات هویتی و اطلاعات مرتبط با پرونده." },
    { h: "محافظت از اطلاعات", p: "اطلاعات شما با رمزنگاری نگهداری می‌شود و دسترسی به آن محدود و کنترل‌شده است." },
    { h: "عدم اشتراک با غیر", p: "اطلاعات شما بدون رضایت، در اختیار اشخاص ثالث قرار نمی‌گیرد مگر الزامات قانونی." },
  ],
  "refund-policy": [
    { h: "شرایط بازگشت وجه", p: "در صورت عدم ارائه‌ی خدمت توسط وکیل یا لغو پیش از شروع خدمت مطق مقررات، مبلغ پرداختی قابل بازگشت است." },
    { h: "مراحل بازگشت", p: "درخواست بازگشت وجه از پنل کاربری ثبت و توسط تیم پشتیبانی بررسی می‌شود." },
  ],
  "lawyer-rules": [
    { h: "احراز هویت", p: "تمامی وکلا باید هویت و پروانه‌ی خود را برای فعالیت در دادبان راستی‌آزمایی کنند." },
    { h: "تعهدات حرفه‌ای", p: "وکلا متعهد به رعایت اخلاق حرفه‌ای، محرمانگی و ارائه‌ی خدمت باکیفیت هستند." },
  ],
  security: [
    { h: "رمزنگاری", p: "تمامی ارتباطات و اطلاعات به‌صورت رمزنگاری‌شده ذخیره و منتقل می‌شوند." },
    { h: "کنترل دسترسی", p: "دسترسی به اطلاعات بر اساس نقش و نیاز کنترل و ثبت می‌شود." },
  ],
  transparency: [
    { h: "احراز هویت وکلا", p: "هویت و پروانه‌ی وکلا پیش از فعال‌سازی بررسی می‌شود." },
    { h: "امتیازدهی", p: "امتیاز وکلا بر اساس نظرات واقعی کاربران و شاخص‌های پاسخگویی محاسبه می‌شود." },
    { h: "کمیسیون", p: "دادبان برای حفظ پلتفرم، کمیسیون مشخصی از خدمات دریافت می‌کند که شفاف است." },
  ],
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = TRUST_PAGES.find((x) => x.slug === slug);
  if (!p) return { title: "صفحه یافت نشد" };
  return { title: p.title, description: p.desc, alternates: { canonical: `/legal/${slug}` } };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = TRUST_PAGES.find((x) => x.slug === slug);
  if (!p) notFound();
  const blocks = CONTENT[slug] ?? [{ h: "اطلاعات کلی", p: p.desc }];

  return (
    <>
      <PageHero title={p.title} desc={p.desc} breadcrumb={[{ label: "خانه", href: "/" }, { label: p.title }]} />
      <Container className="py-12">
        <div className="mx-auto max-w-3xl space-y-4">
          {blocks.map((b) => (
            <Card key={b.h} hover={false}>
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Icon name="check" className="h-5 w-5 text-success" /> {b.h}</h2>
              <p className="mt-3 text-sm leading-8 text-foreground-soft">{b.p}</p>
            </Card>
          ))}
          <p className="pt-2 text-center text-xs text-muted">این متن جنبه‌ی عمومی دارد و جایگزال مشاوره‌ی حقوقی تخصصی نیست.</p>
        </div>
      </Container>
    </>
  );
}
