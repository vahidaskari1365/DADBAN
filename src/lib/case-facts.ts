// Shared, honest case lifecycle facts: stage flow, next action per stage,
// and timeline derivation used by track-case, case creation success screens
// and the client dashboard case detail page.

/** مراحل استاندارد چرخه پرونده (با API ثبت پرونده هماهنگ است) */
export const CASE_STAGE_FLOW = [
  "ثبت اولیه",
  "بررسی مدارک",
  "تنظیم دادخواست",
  "ثبت در دادگاه",
  "تعیین شعبه",
  "جلسه اول",
  "صدور رأی",
  "تجدیدنظر",
  "مرحله اجرا",
] as const;

export const CASE_STATUS_FA: Record<string, string> = {
  new: "ثبت‌شده",
  reviewing: "در حال بررسی",
  matched: "تطبیق با وکیل",
  active: "فعال",
  closed: "بسته‌شده",
};

/** «اقدام بعدی شما» — کاربر هرگز نباید بپرسد الان چه اتفاقی افتاده است. */
export function nextActionForCase(stage: string, status: string): { action: string; detail: string; href?: string } {
  if (status === "closed") {
    return { action: "پرونده بسته شده است", detail: "در صورت نیاز به پرونده جدید یا اعتراض به رأی، با وکیل مشورت کنید.", href: "/consultation" };
  }
  if (status === "new") {
    return { action: "اقدام بعدی: تکمیل و ارسال مدارک", detail: "مدارک مرتبط (قرارداد، رسید، پیامک‌ها و…) را آماده و در پنل بارگذاری کنید تا بررسی سریع‌تر انجام شود.", href: "/dashboard/client" };
  }
  if (status === "reviewing") {
    return { action: "در انتظار نتیجه بررسی بمانید", detail: "کارشناسان دادبان پرونده را بررسی می‌کنند. اگر اطلاعات بیشتری لازم باشد، با شما تماس می‌گیریم." };
  }
  if (status === "matched") {
    return { action: "اقدام بعدی: هماهنگی جلسه با وکیل", detail: "وکیل معرفی‌شده آماده شروع است؛ جلسه مشاوره را رزرو کنید تا برنامه دفاع مشخص شود.", href: "/consultation" };
  }
  if (stage === "صدور رأی") {
    return { action: "اقدام بعدی: تصمیم درباره اعتراض", detail: "مهلت تجدیدنظرخواهی محدود است؛ هرچه سریع‌تر با وکیل درباره اعتراض یا اجرای رأی تصمیم بگیرید.", href: "/consultation" };
  }
  if (stage === "مرحله اجرا") {
    return { action: "اقدام بعدی: پیگیری اجرای حکم", detail: "از اجرای احکام روند را دنبال کنید و گزارش‌ها را با وکیل خود هماهنگ نگه دارید." };
  }
  return { action: "در حال پیگیری توسط وکیل", detail: "پرونده در مسیر رسیدگی است؛ به‌روزرسانی‌های مهم به شما اطلاع‌رسانی می‌شود." };
}

export interface TimelineItem {
  title: string;
  state: "done" | "current" | "upcoming";
}

/** تایم‌لاین شفاف پرونده بر اساس مرحله فعلی */
export function buildCaseTimeline(currentStage: string): TimelineItem[] {
  const idx = CASE_STAGE_FLOW.indexOf(currentStage as (typeof CASE_STAGE_FLOW)[number]);
  const resolved = idx === -1 ? 0 : idx;
  return CASE_STAGE_FLOW.map((title, i) => ({
    title,
    state: i < resolved ? "done" : i === resolved ? "current" : "upcoming",
  }));
}
