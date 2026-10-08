import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { managedServices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";
import { getServiceBySlug, deriveIntakeFields } from "@/lib/managed-services";
import { SERVICE_GUIDE } from "@/lib/managed-catalog";
import { CATEGORY_LABELS, CLASSIFICATION_LABELS, PRICE_TYPE_LABELS, faNumSafe } from "@/lib/managed-labels";
import RequestForm from "@/components/request-form";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";
import { templateT } from "@/lib/i18n/core";

export const dynamic = "force-dynamic";

/** مسیر پیش‌رفت کارهای حضوری — برای همه خدمات دارای راهنما یکسان است. */
const GUIDE_STEPS = [
  { title: "ثبت درخواست", desc: "جزئیات کار و مدارک موجود را در فرم همین صفحه ثبت می‌کنید." },
  { title: "بررسی و اعلام هزینه", desc: "کارشناس دادبان موضوع را بررسی و هزینه نهایی را اعلام می‌کند." },
  { title: "وکالت‌نامه رسمی", desc: "برای کارهایی که حضور لازم دارد، یک بار در دفترخانه به نماینده دادبان وکالت می‌دهید." },
  { title: "انجام و گزارش مرحله‌ای", desc: "نماینده به‌جای شما به اداره می‌رود و پیشرفت کار در پنل شما ثبت می‌شود." },
];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const svc = await getServiceBySlug(slug);
  const t = await getT();
  if (!svc) return { title: t("خدمت یافت نشد") };
  const locale = await getServerLocale();
  const title = await tdyn(locale, svc.title, 300);
  return {
    title: `${title} — ${t("دادبان")}`,
    description: svc.shortDescription ? await tdyn(locale, svc.shortDescription, 400) : undefined,
  };
}

export default async function ServiceDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const svc = await getServiceBySlug(slug);
  if (!svc || !svc.active) notFound();

  const t = await getT();
  const locale = await getServerLocale();
  const tt = templateT(t);

  const fields = deriveIntakeFields(svc);
  // ترجمهٔ فیلدهای فرم (برچسب/جانگهدار/راهنما/گزینه‌ها) پیش از ارسال به فرم کلاینتی
  const fieldsT = await Promise.all(
    fields.map(async (f) => ({
      ...f,
      label: await tdyn(locale, f.label, 200),
      placeholder: f.placeholder ? await tdyn(locale, f.placeholder, 200) : f.placeholder,
      hint: f.hint ? await tdyn(locale, f.hint, 200) : f.hint,
      options: f.options ? await Promise.all(f.options.map((o) => tdyn(locale, o, 100))) : f.options,
    })),
  );
  const guide = SERVICE_GUIDE[svc.slug];
  const guideT = guide
    ? {
        tasks: await Promise.all(guide.tasks.map((x) => tdyn(locale, x, 500))),
        presenceNote: await tdyn(locale, guide.presenceNote, 900),
      }
    : { tasks: [] as string[], presenceNote: "" };

  // ترجمهٔ محتوای داینامیک خدمت
  const [svcTitle, svcDescription, svcEstimatedTime] = await Promise.all([
    tdyn(locale, svc.title, 300),
    tdyn(locale, svc.description, 900),
    svc.estimatedTime ? tdyn(locale, svc.estimatedTime, 200) : Promise.resolve(svc.estimatedTime),
  ]);
  const requiredDocsT = svc.requiredDocs
    ? await Promise.all(svc.requiredDocs.map((d) => tdyn(locale, d, 120)))
    : [];

  const pricePreview =
    svc.priceType === "FIXED"
      ? tt("{price} تومان", { price: faNumSafe(svc.basePrice) })
      : svc.priceType === "FROM"
        ? tt("از {price} تومان", { price: faNumSafe(svc.basePrice) })
        : t("پس از بررسی اعلام می‌شود");

  return (
    <div className="min-h-screen bg-background pb-16">
      <Container className="py-10">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Icon name="briefcase" className="h-4 w-4" />
              <span>{t("خدمات پیگیری و انجام امور")}</span>
              <span>•</span>
              <span>{t(CATEGORY_LABELS[svc.category] ?? svc.category)}</span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">{svcTitle}</h1>
            <p className="mt-4 text-lg leading-8 text-muted">{svcDescription}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Badge tone="primary">{t(CLASSIFICATION_LABELS[svc.classification] ?? svc.classification)}</Badge>
              <Badge tone="neutral">{t(PRICE_TYPE_LABELS[svc.priceType] ?? svc.priceType)}</Badge>
              {svc.estimatedTime && (
                <Badge tone="neutral" icon="clock">
                  {svcEstimatedTime}
                </Badge>
              )}
              {svc.requiresLawyer && (
                <Badge tone="accent" icon="scale">
                  {t("با نظارت وکیل")}
                </Badge>
              )}
            </div>

            {guide ? (
              <>
                <Card className="mt-6">
                  <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                    <Icon name="check" className="h-5 w-5 text-success" /> {t("چه کارهایی برای شما انجام می‌دهیم؟")}
                  </h3>
                  <ul className="mt-3 space-y-2.5 text-sm text-muted">
                    {guideT.tasks.map((task) => (
                      <li key={task} className="flex items-start gap-2">
                        <Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-success" />
                        <span className="leading-6">{task}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="mt-4">
                  <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                    <Icon name="location" className="h-5 w-5 text-primary" /> {t("مسیر پیش‌رفت کار")}
                  </h3>
                  <ol className="mt-4 space-y-4">
                    {GUIDE_STEPS.map((s, i) => (
                      <li key={s.title} className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                          {faNumSafe(i + 1)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t(s.title)}</p>
                          <p className="mt-0.5 text-sm leading-6 text-muted">{t(s.desc)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Card>

                <div className="mt-4 rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm leading-6 text-foreground-soft">
                  <Icon name="id" className="me-1 inline h-4 w-4 text-accent-text" /> {guideT.presenceNote}
                </div>
              </>
            ) : (
              <Card className="mt-6">
                <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Icon name="check" className="h-5 w-5 text-success" /> {t("چه کمکی به شما می‌کنیم")}
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  <li>• {t("پیگیری مرحله‌به‌مرحله و گزارش‌دهی شفاف در هر مرحله")}</li>
                  <li>• {t("ثبت و تکمیل مدارک طبق درخواست مرجع")}</li>
                  <li>• {t("مدیریت زمان‌بندی و یادآوری موعدها")}</li>
                  {svc.requiresLawyer ? (
                    <li>• {t("در صورت نیاز، ارجاع به وکیل واجد صلاحیت و نظارت حرفه‌ای")}</li>
                  ) : (
                    <li>• {t("انجام توسط کارشناس عملیات دادبان")}</li>
                  )}
                </ul>
              </Card>
            )}

            {svc.requiredDocs && svc.requiredDocs.length > 0 && (
              <Card className="mt-4">
                <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Icon name="folder" className="h-5 w-5 text-primary" /> {t("مدارک موردنیاز")}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {requiredDocsT.map((d) => (
                    <Badge key={d} tone="neutral">{d}</Badge>
                  ))}
                </div>
              </Card>
            )}

            {svc.requiresLawyer && (
              <div className="mt-4 rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm text-foreground-soft">
                <Icon name="scale" className="inline h-4 w-4 text-accent-text" /> {" "}
                {t("این موضوع نیازمند اقدام حرفه‌ای حقوقی است؛ پس از بررسی اولیه به وکیل دارای صلاحیت ارجاع داده می‌شود. دادبان خود را جایگزین وکیل شما معرفی نمی‌کند.")}
              </div>
            )}
          </div>

          <div>
            <div className="lg:sticky lg:top-6">
              <Card>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">{t("برآورد هزینه")}</span>
                  <span className="text-lg font-bold text-foreground">{pricePreview}</span>
                </div>
                <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm text-muted">
                  {t("قیمت نهایی پس از ثبت درخواست و بررسی جزئیات توسط کارشناس تعیین می‌شود و هیچ‌گاه صرفاً بر اساس مبلغ اعلامی شما محاسبه نمی‌شود.")}
                </div>
                <div className="mt-4">
                  <RequestForm
                    service={{
                      id: svc.id,
                      title: svcTitle,
                      slug: svc.slug,
                      description: svcDescription,
                      icon: svc.icon,
                      priceType: svc.priceType,
                      basePrice: svc.basePrice,
                      requiresLawyer: svc.requiresLawyer,
                      requiresSupervision: svc.requiresSupervision,
                      requiresDocuments: svc.requiresDocuments,
                      estimatedTime: svcEstimatedTime,
                      formFields: fieldsT as any,
                    }}
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
