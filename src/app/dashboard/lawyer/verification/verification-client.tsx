"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatJalali } from "@/lib/jalali";
import { useT } from "@/lib/i18n/provider";

/**
 * بخش احراز هویت پنل وکیل — وردپرسی و ساده:
 *  • وضعیت فعلی با بنر رنگی (تأیید/در انتظار بررسی/رد شده/ارسال نشده)
 *  • فرم آپلود: پروانهٔ وکالت + کارت ملی (الزامی)، مدرک تحصیلی (اختیاری) + توضیح
 *  • پس از تأیید مدیر: پیغام سبز + لینک پروفایل عمومی (ورود به فهرست وکلا)
 */

export interface VerificationData {
  degraded: boolean;
  verified: boolean;
  slug: string;
  name: string;
  city: string;
  request: {
    id: number;
    status: "pending" | "approved" | "rejected";
    note: string;
    adminNote: string | null;
    licenseName: string;
    idName: string;
    degreeName: string;
    createdAt: string;
    reviewedAt: string | null;
  } | null;
}

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif";

export function VerificationClient({ data }: { data: VerificationData }) {
  const t = useT();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const status = data.request?.status ?? null;
  // تأییدشده = پروفایل verified (منبع حقیقت) یا آخرین درخواست approved
  const approved = data.verified || status === "approved";
  const pending = !approved && status === "pending";
  const rejected = !approved && status === "rejected";
  const showForm = !data.degraded && !approved && !pending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const license = fd.get("license");
    const idcard = fd.get("idcard");
    if (!(license instanceof File) || license.size === 0 || !(idcard instanceof File) || idcard.size === 0) {
      setError(t("بارگذاری پروانهٔ وکالت و کارت ملی الزامی است."));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/lawyer/verification", { method: "POST", body: fd });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(d?.error ?? t("خطا در ارسال — دوباره تلاش کنید."));
      }
    } catch {
      setError(t("خطا در ارتباط با سرور"));
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary";

  return (
    <div className="space-y-5" data-testid="verification-section">
      {/* ───── بنرهای وضعیت ───── */}
      {data.degraded && (
        <Card hover={false} className="border-warn/30 bg-warn/10 p-5">
          <p className="text-sm font-bold text-warn-text">{t("سامانهٔ احراز هویت موقتاً در دسترس نیست؛ بعداً تلاش کنید.")}</p>
        </Card>
      )}

      {approved && (
        <Card hover={false} className="border-success/30 bg-success/10 p-6" data-testid="verification-approved">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-success">
              <Icon name="badge" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-black text-success">{t("احراز هویت شما تأیید شد ✓")}</p>
              <p className="mt-1.5 text-sm leading-6 text-foreground-soft">
                {t("پروفایل شما تأیید شده و در فهرست وکلای دادورزان نمایش داده می‌شود.")}
              </p>
              {data.slug && (
                <Button href={`/lawyers/${data.slug}`} variant="outline" size="sm" icon="user" className="mt-4">
                  {t("مشاهدهٔ پروفایل عمومی من")}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {pending && (
        <Card hover={false} className="border-accent/40 bg-accent-soft/40 p-6" data-testid="verification-pending">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent-text">
              <Icon name="clock" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-black text-accent-text">{t("مدارک شما در انتظار بررسی مدیر سایت است")}</p>
              <p className="mt-1.5 text-sm leading-6 text-foreground-soft">
                {t("به‌محض بررسی، نتیجه از طریق اعلان‌های پنل به شما اعلام می‌شود.")}
              </p>
              {data.request && (
                <p className="mt-2 text-xs text-muted">
                  {t("تاریخ ارسال")}: {formatJalali(data.request.createdAt)}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {rejected && (
        <Card hover={false} className="border-destructive/30 bg-destructive/10 p-6" data-testid="verification-rejected">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
              <Icon name="alert" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-black text-destructive">{t("درخواست قبلی شما تأیید نشد")}</p>
              {data.request?.adminNote && (
                <p className="mt-2 rounded-xl border border-destructive/20 bg-surface p-3 text-sm leading-6 text-foreground-soft">
                  <span className="font-bold text-foreground">{t("دلیل (از مدیر سایت)")}: </span>
                  {data.request.adminNote}
                </p>
              )}
              <p className="mt-2 text-sm text-foreground-soft">{t("می‌توانید مدارک را اصلاح و مجدد ارسال کنید.")}</p>
            </div>
          </div>
        </Card>
      )}

      {/* اعلان موفقیت ارسال تازه */}
      {done && (
        <Card hover={false} className="border-success/30 bg-success/10 p-4">
          <p className="text-sm font-bold text-success">{t("درخواست شما ثبت شد و در انتظار بررسی مدیر سایت است.")}</p>
        </Card>
      )}

      {/* ───── فرم آپلود مدارک ───── */}
      {showForm && (
        <Card hover={false} className="p-6">
          <h2 className="flex items-center gap-2 text-base font-black text-foreground">
            <Icon name="fingerprint" className="h-5 w-5 text-primary" />
            {t("بارگذاری مدارک احراز هویت")}
          </h2>
          <p className="mt-1 text-xs leading-6 text-muted">
            {t("فایل‌ها فقط برای بررسی مدیر سایت استفاده می‌شوند و به‌صورت امن نگهداری می‌شوند.")}
          </p>
          <form ref={formRef} onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2" data-testid="verification-form">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor="vf-license">
                {t("پروانهٔ وکالت یا مجوز مربوطه")} <span className="text-destructive">*</span>
              </label>
              <input id="vf-license" name="license" type="file" accept={ACCEPT} required className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor="vf-idcard">
                {t("کارت ملی")} <span className="text-destructive">*</span>
              </label>
              <input id="vf-idcard" name="idcard" type="file" accept={ACCEPT} required className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor="vf-degree">
                {t("مدرک تحصیلی یا سایر مدارک (اختیاری)")}
              </label>
              <input id="vf-degree" name="degree" type="file" accept={ACCEPT} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor="vf-note">
                {t("توضیح (اختیاری)")}
              </label>
              <input
                id="vf-note"
                name="note"
                type="text"
                maxLength={500}
                placeholder={t("مثلاً شمارهٔ پروانه یا توضیح کوتاه دربارهٔ مدارک")}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <p className="text-[11px] leading-5 text-muted">
                {t("فرمت مجاز: PDF یا تصویر (JPG/PNG/WebP) — حداکثر ۵ مگابایت برای هر فایل.")}
              </p>
            </div>
            {error && (
              <div className="sm:col-span-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive" data-testid="verification-error">
                {error}
              </div>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy} icon="send" data-testid="verification-submit">
                {busy ? t("در حال ارسال…") : t("ارسال برای بررسی مدیر سایت")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ───── خلاصهٔ مدارک ارسال‌شده (وقتی فرم پنهان است) ───── */}
      {!showForm && data.request && (
        <Card hover={false} className="p-6">
          <h2 className="text-sm font-black text-foreground">{t("مدارک ارسال‌شده")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.request.licenseName && <Badge tone="primary" icon="file">{t("پروانهٔ وکالت")}</Badge>}
            {data.request.idName && <Badge tone="primary" icon="id">{t("کارت ملی")}</Badge>}
            {data.request.degreeName && <Badge tone="primary" icon="certificate">{t("مدرک تحصیلی/سایر")}</Badge>}
          </div>
          {data.request.note && (
            <p className="mt-3 text-xs leading-6 text-muted">
              <span className="font-bold text-foreground-soft">{t("توضیح وکیل")}: </span>
              {data.request.note}
            </p>
          )}
          {data.request.reviewedAt && (
            <p className="mt-1 text-xs text-muted">
              {t("تاریخ بررسی")}: {formatJalali(data.request.reviewedAt)}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
