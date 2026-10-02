// Pure, client-safe label/metadata for Managed Services.
// IMPORTANT: this module must NOT import the database or any server-only code,
// so it can be safely imported from client components.
import { faNum } from "@/lib/data";
import type { ServiceRequest } from "@/db/schema";

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  SUBMITTED: "ثبت‌شده",
  REVIEWING: "در حال بررسی",
  AWAITING_DOCUMENTS: "منتظر مدارک",
  QUOTED: "اعلام قیمت",
  AWAITING_PAYMENT: "منتظر پرداخت",
  ASSIGNED: "واگذارشده",
  IN_PROGRESS: "در حال انجام",
  WAITING_EXTERNAL: "منتظر مرجع خارجی",
  COMPLETED: "تکمیل‌شده",
  DELIVERED: "تحویل‌شده",
  CANCELLED: "لغو‌شده",
  REJECTED: "رد‌شده",
};

export const STATUS_TONE: Record<string, "muted" | "info" | "warn" | "success" | "danger" | "brand"> = {
  DRAFT: "muted",
  SUBMITTED: "info",
  REVIEWING: "info",
  AWAITING_DOCUMENTS: "warn",
  QUOTED: "info",
  AWAITING_PAYMENT: "warn",
  ASSIGNED: "brand",
  IN_PROGRESS: "brand",
  WAITING_EXTERNAL: "info",
  COMPLETED: "success",
  DELIVERED: "success",
  CANCELLED: "danger",
  REJECTED: "danger",
};

export const URGENCY_LABELS: Record<string, string> = {
  LOW: "کم‌اهمیت",
  NORMAL: "عادی",
  HIGH: "فوری",
  URGENT: "خیلی فوری",
};

export const CATEGORY_LABELS: Record<string, string> = {
  CASE_FOLLOW_UP: "پیگیری پرونده و درخواست",
  JUDICIAL_OPERATIONS: "امور قضایی و اجرای احکام",
  ENFORCEMENT: "اجرای احکام و توقیف",
  REGISTRATION: "امور ثبتی",
  TAX: "امور مالیاتی",
  ADMINISTRATIVE: "امور اداری و سازمانی",
  DOCUMENTS: "مدارک و اسناد",
  ORGANIZATIONS: "پیگیری از سازمان‌ها و مراجع",
  OTHER: "سایر خدمات",
};

export const CLASSIFICATION_LABELS: Record<string, string> = {
  ADMINISTRATIVE: "امور اجرایی",
  INFORMATIONAL: "اطلاعات و پیگیری",
  DOCUMENT_SERVICE: "خدمات مدارک",
  PROFESSIONAL_LEGAL: "امور حقوقی تخصصی",
  REPRESENTATION: "وکالت",
  REQUIRES_REVIEW: "نیازمند بررسی",
};

export const PRICE_TYPE_LABELS: Record<string, string> = {
  FIXED: "قیمت ثابت",
  FROM: "از مبلغ",
  QUOTE: "استعلام قیمت",
  REQUIRES_REVIEW: "پس از بررسی",
};

export function faNumSafe(n: number | string): string {
  try {
    const num = typeof n === "string" ? Number(n) : n;
    return faNum((num as number).toLocaleString("en-US"));
  } catch {
    return String(n);
  }
}

/** The single most useful next action for a user viewing their request. */
export function nextBestAction(req: Pick<ServiceRequest, "status">): { label: string; cta?: string } {
  switch (req.status) {
    case "DRAFT":
      return { label: "پیش‌نویس را تکمیل و ثبت کنید", cta: "ادامه ثبت" };
    case "SUBMITTED":
    case "REVIEWING":
      return { label: "دادبان در حال بررسی درخواست شماست", cta: "پیگیری" };
    case "AWAITING_DOCUMENTS":
      return { label: "مدارک درخواستی را بارگذاری کنید", cta: "بارگذاری مدارک" };
    case "QUOTED":
      return { label: "پیش‌فاکتور آماده است", cta: "مشاهده پیش‌فاکتور" };
    case "AWAITING_PAYMENT":
      return { label: "پرداخت هزینه خدمت", cta: "پرداخت" };
    case "ASSIGNED":
    case "IN_PROGRESS":
    case "WAITING_EXTERNAL":
      return { label: "کارشناسان در حال انجام کار هستند", cta: "پیگیری" };
    case "COMPLETED":
      return { label: "گزارش نهایی آماده است", cta: "مشاهده گزارش" };
    case "DELIVERED":
      return { label: "نتیجه تحویل داده شد", cta: "دریافت نتیجه" };
    case "CANCELLED":
    case "REJECTED":
      return { label: "درخواست بسته شد — توضیحات را بخوانید", cta: "جزئیات" };
    default:
      return { label: "وضعیت در حال به‌روزرسانی است", cta: "پیگیری" };
  }
}
