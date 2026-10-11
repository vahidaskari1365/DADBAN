import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseDetailClient } from "@/components/case-detail-client";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";

/**
 * صفحهٔ اختصاصی هر پروژهٔ بازار پروژه‌های حقوقی — /case-board/[id]
 * با کلیک روی هر پروژه در برد (/case-board) این صفحه باز می‌شود:
 * اطلاعات کامل پروژه + دکمهٔ «ثبت پیشنهاد روی پروژه» که فرم
 * (باکس توضیحات + باکس قیمت پیشنهادی + دکمهٔ ارسال) را برای وکیل باز می‌کند
 * و پیشنهاد مستقیماً برای موکلِ صاحب پروژه ارسال می‌شود.
 *
 * حریم خصوصی: نام/شمارهٔ تماس موکل هرگز نمایش داده نمی‌شود (API خودش ماسک می‌کند)؛
 * چون متن پروژه نوشتهٔ موکل است، این صفحات برای موتورهای جستجو noindex هستند.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const t = await getT();
  const tf = templateT(t);
  return {
    title: tf("جزئیات پروژه شماره {n} | بازار پروژه‌های دادبان", { n: id }),
    description:
      t("اطلاعات کامل پروژهٔ حقوقی و ثبت پیشنهاد قیمت توسط وکلای متخصص — موکل آزادانه بهترین پیشنهاد را انتخاب می‌کند."),
    robots: { index: false, follow: false },
  };
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caseId = Number(id);
  if (!Number.isInteger(caseId) || caseId <= 0) notFound();
  return <CaseDetailClient caseId={caseId} />;
}
