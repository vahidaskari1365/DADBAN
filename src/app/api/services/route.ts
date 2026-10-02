import { NextResponse } from "next/server";
import { db } from "@/db";
import { managedServices, serviceCategories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { faNum } from "@/lib/data";
import { CATEGORY_LABELS } from "@/lib/managed-services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/services — public catalog of active managed services. */
export async function GET() {
  try {
    const [services, categories] = await Promise.all([
      db
        .select()
        .from(managedServices)
        .where(eq(managedServices.active, true))
        .orderBy(desc(managedServices.featured), managedServices.sortOrder),
      db.select().from(serviceCategories).where(eq(serviceCategories.active, true)).orderBy(serviceCategories.sortOrder),
    ]);

    const items = services.map((s) => {
      const preview =
        s.priceType === "FIXED"
          ? `${faNum(s.basePrice.toLocaleString("en-US"))} تومان`
          : s.priceType === "FROM"
            ? `از ${faNum(s.basePrice.toLocaleString("en-US"))} تومان`
            : s.priceType === "QUOTE"
              ? "پس از بررسی اعلام می‌شود"
              : "پس از بررسی اعلام می‌شود";
      return {
        id: s.id,
        title: s.title,
        slug: s.slug,
        shortDescription: s.shortDescription,
        icon: s.icon,
        category: s.category,
        categoryLabel: CATEGORY_LABELS[s.category] ?? s.category,
        estimatedTime: s.estimatedTime,
        priceType: s.priceType,
        basePrice: s.basePrice,
        pricePreview: preview,
        requiresLawyer: s.requiresLawyer,
        requiresSupervision: s.requiresSupervision,
        requiresDocuments: s.requiresDocuments,
      };
    });

    return NextResponse.json({
      ok: true,
      services: items,
      categories: categories.map((c) => ({
        slug: c.slug,
        name: c.name,
        description: c.description,
        icon: c.icon,
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
