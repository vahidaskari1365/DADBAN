import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * ============================================================================
 * وضعیت و محدودیت‌های وکیل/کارشناس حقوقی — منبع واحد حقیقت برای گیت‌ها
 * ----------------------------------------------------------------------------
 *  - وکیل/کارشناس تازه‌ثبت‌نام‌شده: verified=false → پروفایل شخصی را می‌بیند
 *    (با بنر «در انتظار تأیید») ولی هیچ درخواستی نمی‌تواند بپذیرد و در
 *    فهرست عمومی هم نیست.
 *  - کارشناس حقوقی (lawyerType="expert"): به‌جای وکالت قضایی فقط
 *    مشاوره/اسناد/قرارداد — پیشنهاد پروندهٔ قضایی و توکیل برای او بسته است.
 * ============================================================================
 */
export type LawyerEligibility = {
  lawyerId: number;
  verified: boolean;
  lawyerType: string;
  title: string;
  name: string;
  slug: string;
  specialties: string[];
  /** کارشناس حقوقی — نه وکیل دادگستری */
  isExpert: boolean;
  /** تخصص ثبت نکرده → پاپاپ انتخاب تخصص */
  needsSpecialties: boolean;
  /** دلیل بسته‌بودن پذیرش درخواست قضایی (پرونده/پیشنهاد/توکیل) — null یعنی باز */
  caseActionBlock: string | null;
  /** دلیل بسته‌بودن پذیرش مشاوره — null یعنی باز (کارشناس هم مشاوره دارد) */
  consultationBlock: string | null;
};

export async function getLawyerEligibility(
  lawyerId: number | null | undefined,
): Promise<LawyerEligibility | null> {
  if (!lawyerId || lawyerId <= 0) return null;
  try {
    const [l] = await db
      .select({
        id: lawyers.id,
        name: lawyers.name,
        slug: lawyers.slug,
        title: lawyers.title,
        lawyerType: lawyers.lawyerType,
        verified: lawyers.verified,
        specialties: lawyers.specialties,
      })
      .from(lawyers)
      .where(eq(lawyers.id, lawyerId))
      .limit(1);
    if (!l) return null;
    const isExpert = l.lawyerType === "expert";
    const needsSpecialties = (l.specialties ?? []).length === 0;
    const pendingMsg =
      "حساب شما هنوز احراز نشده است. تا زمان تأیید شماره پروانه (یا مدارک) توسط دادورزان، هیچ درخواستی نمی‌توانید بپذیرید و پروفایل شما در فهرست عمومی نمایش داده نمی‌شود.";
    return {
      lawyerId: l.id,
      verified: l.verified,
      lawyerType: l.lawyerType,
      title: l.title,
      name: l.name,
      slug: l.slug,
      specialties: l.specialties ?? [],
      isExpert,
      needsSpecialties,
      caseActionBlock: !l.verified
        ? pendingMsg
        : isExpert
          ? "کارشناس حقوقی مجاز به پذیرش پرونده قضایی و وکالت در دادگاه نیست؛ شما می‌توانید مشاوره، تنظیم قرارداد و کمک به اسناد ارائه دهید."
          : null,
      consultationBlock: !l.verified ? pendingMsg : null,
    };
  } catch {
    // حالت degraded — محدودیت سخت‌گیرانه‌تر امن‌تر است؛ صفر تخصص → پاپاپ
    return null;
  }
}

/** پیام بنر «در انتظار تأیید» — برای پروفایل/پنل (نوع‌آگاه: وکیل یا کارشناس) */
export function pendingApprovalBanner(title: string): string {
  return `تا زمان تأیید شماره پروانه/مدارک شما توسط دادورزان، هیچ درخواستی نمی‌توانید بپذیرید و پروفایل شما در فهرست عمومی وکلای ${title} نمایش داده نمی‌شود. پس از تأیید، این پیام حذف می‌شود و پروفایل شما فعال می‌گردد.`;
}
