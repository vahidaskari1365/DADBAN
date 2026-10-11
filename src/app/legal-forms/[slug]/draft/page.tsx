import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDraftDef } from "@/lib/legal-drafts";
import { getT } from "@/lib/i18n/server";
import { DraftClient } from "@/components/legal-drafts/draft-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const def = getDraftDef(slug);
  const t = await getT();
  if (!def) return { title: t("سند یافت نشد") };
  return {
    title: t(`ساخت هوشمند ${def.title}`),
    description: t("سند خود را با هوش مصنوعی مرحله‌به‌مرحله تنظیم کنید؛ سپس وکیل آن را بازبینی می‌کند."),
    alternates: { canonical: `/legal-forms/${slug}/draft` },
  };
}

export default async function LegalDraftPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const def = getDraftDef(slug);
  if (!def) notFound();

  return <DraftClient def={def} />;
}
