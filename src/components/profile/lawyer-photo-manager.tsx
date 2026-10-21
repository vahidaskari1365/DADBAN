"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LawyerPhoto } from "@/components/lawyer-photo";
import { shrinkImageFile } from "@/lib/image-file";
import { useT } from "@/lib/i18n/provider";

/**
 * مدیریت عکس پروفایل وکیل — بارگذاری و تعویض هر زمان.
 * عکس پیش از ارسال سمت مرورگر کوچک می‌شود و سرور آن را به مربعِ استاندارد
 * ۵۱۲×۵۱۲ (سایز کارت‌های سایت) با برش هوشمند تبدیل می‌کند؛ بنابراین خروجی
 * همیشه دقیقاً روی کارت وکلا و پروفایل عمومی می‌نشیند. پس از ذخیره، همین صفحه
 * و همه کارت‌های سایت با عکس تازه به‌روزرسانی می‌شوند.
 */
export function LawyerPhotoManager({
  name,
  color,
  photoUrl,
}: {
  name: string;
  color: string;
  photoUrl: string | null;
}) {
  const router = useRouter();
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error(t("لطفاً یک فایل تصویری انتخاب کنید."));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error(t("حجم عکس حداکثر ۸ مگابایت است."));
      return;
    }
    setBusy(true);
    try {
      // پیش‌کوچک‌سازی برای آپلود سریع — برش نهایی مربعیِ استاندارد را سرور انجام می‌دهد
      const small = await shrinkImageFile(file, 1024, 0.9);
      const fd = new FormData();
      fd.append("file", small);
      const res = await fetch("/api/lawyer/photo", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (data.ok) {
        toast.success(t("عکس پروفایل با سایز استاندارد کارت ذخیره شد."));
        router.refresh();
      } else {
        toast.error(data.error ?? t("آپلود عکس ناموفق بود."));
      }
    } catch {
      toast.error(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative">
        <LawyerPhoto name={name} color={color} photoUrl={photoUrl} size="lg" className={busy ? "opacity-60" : ""} />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <svg className="h-6 w-6 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.2-8.56" />
            </svg>
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = ""; // اجازهٔ انتخاب دوبارهٔ همان فایل
          if (f) void upload(f);
        }}
      />
      <Button type="button" variant="outline" size="sm" icon="camera" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? t("در حال ذخیره…") : photoUrl ? t("تغییر عکس") : t("بارگذاری عکس")}
      </Button>
      <p className="max-w-[240px] text-center text-[11px] leading-5 text-muted">
        <Icon name="check" className="me-1 inline h-3 w-3 text-success" />
        {t("عکس به‌صورت خودکار به سایز استاندارد کارت (مربع) تبدیل می‌شود — هر وقت بخواهید می‌توانید عوضش کنید.")}
      </p>
    </div>
  );
}
