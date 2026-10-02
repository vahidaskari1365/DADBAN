import { NextResponse } from "next/server";
import { db } from "@/db";
import { managedServices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { faNum } from "@/lib/data";
import { CATEGORY_LABELS, CLASSIFICATION_LABELS, deriveIntakeFields } from "@/lib/managed-services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/services/[slug] — public detail of a single active service. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const [svc] = await db.select().from(managedServices).where(eq(managedServices.slug, slug)).limit(1);
    if (!svc || !svc.active) {
      return NextResponse.json({ ok: false, error: "خدمت یافت نشد" }, { status: 404 });
    }
    const fields = deriveIntakeFields(svc);
    const pricePreview =
      svc.priceType === "FIXED"
        ? `${faNum(svc.basePrice.toLocaleString("en-US"))} تومان`
        : svc.priceType === "FROM"
          ? `از ${faNum(svc.basePrice.toLocaleString("en-US"))} تومان`
          : "پس از بررسی اعلام می‌شود";

    return NextResponse.json({
      ok: true,
      service: {
        id: svc.id,
        title: svc.title,
        slug: svc.slug,
        shortDescription: svc.shortDescription,
        description: svc.description,
        icon: svc.icon,
        category: svc.category,
        categoryLabel: CATEGORY_LABELS[svc.category] ?? svc.category,
        classification: svc.classification,
        classificationLabel: CLASSIFICATION_LABELS[svc.classification] ?? svc.classification,
        estimatedTime: svc.estimatedTime,
        priceType: svc.priceType,
        basePrice: svc.basePrice,
        pricePreview,
        requiresLawyer: svc.requiresLawyer,
        requiresSupervision: svc.requiresSupervision,
        requiresDocuments: svc.requiresDocuments,
        requiresCaseInfo: svc.requiresCaseInfo,
        formFields: fields,
        requiredDocs: svc.requiredDocs ?? [],
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
