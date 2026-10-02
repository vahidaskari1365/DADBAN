import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { managedServices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";
import { getServiceBySlug, deriveIntakeFields } from "@/lib/managed-services";
import { CATEGORY_LABELS, CLASSIFICATION_LABELS, PRICE_TYPE_LABELS, faNumSafe } from "@/lib/managed-labels";
import RequestForm from "@/components/request-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const svc = await getServiceBySlug(slug);
  return { title: svc ? `${svc.title} — دادبان` : "خدمت یافت نشد", description: svc?.shortDescription };
}

export default async function ServiceDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const svc = await getServiceBySlug(slug);
  if (!svc || !svc.active) notFound();

  const fields = deriveIntakeFields(svc);
  const pricePreview =
    svc.priceType === "FIXED"
      ? `${faNumSafe(svc.basePrice)} تومان`
      : svc.priceType === "FROM"
        ? `از ${faNumSafe(svc.basePrice)} تومان`
        : "پس از بررسی اعلام می‌شود";

  return (
    <div className="min-h-screen bg-background pb-16">
      <Container className="py-10">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Icon name="briefcase" className="h-4 w-4" />
              <span>خدمات پیگیری و انجام امور</span>
              <span>•</span>
              <span>{CATEGORY_LABELS[svc.category] ?? svc.category}</span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">{svc.title}</h1>
            <p className="mt-4 text-lg leading-8 text-muted">{svc.description}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Badge tone="primary">{CLASSIFICATION_LABELS[svc.classification] ?? svc.classification}</Badge>
              <Badge tone="neutral">{PRICE_TYPE_LABELS[svc.priceType] ?? svc.priceType}</Badge>
              {svc.estimatedTime && (
                <Badge tone="neutral" icon="clock">
                  {svc.estimatedTime}
                </Badge>
              )}
              {svc.requiresLawyer && (
                <Badge tone="accent" icon="scale">
                  با نظارت وکیل
                </Badge>
              )}
            </div>

            <Card className="mt-6">
              <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                <Icon name="check" className="h-5 w-5 text-success" /> چه کمکی به شما می‌کنیم
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>• پیگیری مرحله‌به‌مرحله و گزارش‌دهی شفاف در هر مرحله</li>
                <li>• ثبت و تکمیل مدارک طبق درخواست مرجع</li>
                <li>• مدیریت زمان‌بندی و یادآوری موعدها</li>
                {svc.requiresLawyer ? (
                  <li>• در صورت نیاز، ارجاع به وکیل واجد صلاحیت و نظارت حرفه‌ای</li>
                ) : (
                  <li>• انجام توسط کارشناس عملیات دادبان</li>
                )}
              </ul>
            </Card>

            {svc.requiresLawyer && (
              <div className="mt-4 rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm text-foreground-soft">
                <Icon name="scale" className="inline h-4 w-4 text-accent" /> {" "}
                این موضوع نیازمند اقدام حرفه‌ای حقوقی است؛ پس از بررسی اولیه به وکیل دارای صلاحیت ارجاع داده می‌شود. دادبان خود را جایگزین وکیل شما معرفی نمی‌کند.
              </div>
            )}
          </div>

          <div>
            <div className="lg:sticky lg:top-6">
              <Card>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">برآورد هزینه</span>
                  <span className="text-lg font-bold text-foreground">{pricePreview}</span>
                </div>
                <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm text-muted">
                  قیمت نهایی پس از ثبت درخواست و بررسی جزئیات توسط کارشناس تعیین می‌شود و هیچ‌گاه صرفاً بر اساس مبلغ اعلامی شما محاسبه نمی‌شود.
                </div>
                <div className="mt-4">
                  <RequestForm
                    service={{
                      id: svc.id,
                      title: svc.title,
                      slug: svc.slug,
                      description: svc.description,
                      icon: svc.icon,
                      priceType: svc.priceType,
                      basePrice: svc.basePrice,
                      requiresLawyer: svc.requiresLawyer,
                      requiresSupervision: svc.requiresSupervision,
                      requiresDocuments: svc.requiresDocuments,
                      estimatedTime: svc.estimatedTime,
                      formFields: fields as any,
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
