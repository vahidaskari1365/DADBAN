"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatJalaliDateTime } from "@/lib/jalali";
import { useT } from "@/lib/i18n/provider";

/**
 * صف احراز هویت وکلا — پنل ادمین:
 *  • مشاهدهٔ مدارک (پروانه/کارت ملی/مدرک) در تب جدید
 *  • تأیید → وکیل وارد فهرست عمومی می‌شود + پیغام به وکیل
 *  • رد → نوشتن دلیل الزامی + پیغام به وکیل برای ارسال مجدد
 */

type Row = {
  id: number;
  lawyerId: number | null;
  status: string;
  licenseName: string;
  licenseSize: number;
  idName: string;
  idSize: number;
  degreeName: string;
  degreeSize: number;
  note: string;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  lawyerName: string | null;
  lawyerSlug: string | null;
  lawyerCity: string | null;
  lawyerType: string | null;
  licenseNo: string | null;
  specialties: string[] | null;
  employeeLawyer: boolean | null;
  verified: boolean | null;
  userPhone: string | null;
};

const STATUS_FA: Record<string, { label: string; tone: "accent" | "success" | "danger" }> = {
  pending: { label: "در انتظار بررسی", tone: "accent" },
  approved: { label: "تأیید شده", tone: "success" },
  rejected: { label: "رد شده", tone: "danger" },
};

function fmtSize(n: number): string {
  if (!n) return "—";
  return `${(n / 1024).toFixed(0)} KB`;
}

export default function VerificationsClient({ initialRows }: { initialRows: Row[] }) {
  const t = useT();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [seenInitial, setSeenInitial] = useState<Row[]>(initialRows);
  // همگام‌سازی با رفرش سرور — الگوی «تنظیم state در فاز رندر» (بدون effect)
  if (initialRows !== seenInitial) {
    setSeenInitial(initialRows);
    setRows(initialRows);
  }
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const act = async (id: number, action: "approve" | "reject", adminNote = "") => {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, adminNote }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.ok) {
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: action === "approve" ? "approved" : "rejected", adminNote: adminNote || r.adminNote } : r)));
        setNotice(action === "approve" ? t("تأیید شد — وکیل وارد فهرست عمومی سایت شد و پیغام برایش ثبت شد.") : t("رد شد — دلیل برای وکیل ارسال شد."));
        setRejectId(null);
        setRejectNote("");
        router.refresh();
      } else {
        setError(d?.error ?? t("عملیات ناموفق بود"));
      }
    } catch {
      setError(t("خطای ارتباط با سرور"));
    } finally {
      setBusyId(null);
    }
  };

  if (!rows.length) {
    return (
      <Card hover={false} className="p-10 text-center" data-testid="verifications-empty">
        <Icon name="fingerprint" className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-3 text-sm text-muted">{t("هنوز درخواست احراز هویتی ثبت نشده است.")}</p>
      </Card>
    );
  }

  const ordered = [...rows].sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1));

  return (
    <div className="space-y-4">
      {notice && (
        <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-bold text-success" data-testid="verifications-notice">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive" data-testid="verifications-error">
          {error}
        </div>
      )}

      {ordered.map((r) => {
        const st = STATUS_FA[r.status] ?? STATUS_FA.pending;
        return (
          <Card key={r.id} hover={false} className="p-5" data-testid={`verification-row-${r.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black text-foreground">{r.lawyerName ?? "—"}</p>
                  <Badge tone={st.tone}>{t(st.label)}</Badge>
                  {r.lawyerType === "karamooz" && <Badge tone="primary">{t("کارآموز وکالت")}</Badge>}
                  {r.employeeLawyer && <Badge tone="accent" icon="briefcase">{t("وکیل کارمندان و کارهای اداری")}</Badge>}
                  {r.verified && <Badge tone="success" icon="check">{t("در فهرست عمومی")}</Badge>}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  {r.userPhone && <span dir="ltr">{r.userPhone}</span>}
                  {r.lawyerCity && <span>{r.lawyerCity}</span>}
                  {r.licenseNo && <span>{t("پروانه")}: {r.licenseNo}</span>}
                  <span>{formatJalaliDateTime(r.createdAt)}</span>
                </div>
                {!!r.specialties?.length && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.specialties.slice(0, 6).map((s) => (
                      <span key={s} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-bold text-primary">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {r.note && (
                  <p className="mt-2 max-w-2xl rounded-xl border border-border bg-surface-2/60 p-3 text-xs leading-6 text-foreground-soft">
                    <span className="font-bold text-foreground">{t("توضیح وکیل")}: </span>
                    {r.note}
                  </p>
                )}
                {r.status === "rejected" && r.adminNote && (
                  <p className="mt-2 max-w-2xl text-xs leading-6 text-destructive">
                    <span className="font-bold">{t("دلیل رد")}: </span>
                    {r.adminNote}
                  </p>
                )}
              </div>

              {/* مدارک */}
              <div className="flex flex-wrap items-center gap-2">
                {r.licenseName && (
                  <Button href={`/api/admin/verifications/doc?id=${r.id}&kind=license`} target="_blank" variant="outline" size="sm" icon="file">
                    {t("پروانه")} ({fmtSize(r.licenseSize)})
                  </Button>
                )}
                {r.idName && (
                  <Button href={`/api/admin/verifications/doc?id=${r.id}&kind=idcard`} target="_blank" variant="outline" size="sm" icon="id">
                    {t("کارت ملی")} ({fmtSize(r.idSize)})
                  </Button>
                )}
                {r.degreeName && (
                  <Button href={`/api/admin/verifications/doc?id=${r.id}&kind=degree`} target="_blank" variant="outline" size="sm" icon="certificate">
                    {t("مدرک")} ({fmtSize(r.degreeSize)})
                  </Button>
                )}
              </div>
            </div>

            {/* اقدامات */}
            {r.status === "pending" && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <Button
                  onClick={() => act(r.id, "approve")}
                  disabled={busyId === r.id}
                  icon="check"
                  size="sm"
                  data-testid={`verify-approve-${r.id}`}
                >
                  {busyId === r.id ? t("…") : t("تأیید احراز هویت")}
                </Button>
                <Button
                  onClick={() => { setRejectId(rejectId === r.id ? null : r.id); setRejectNote(""); }}
                  variant="ghost"
                  size="sm"
                  icon="x"
                  data-testid={`verify-reject-toggle-${r.id}`}
                >
                  {t("رد درخواست")}
                </Button>
              </div>
            )}
            {rejectId === r.id && (
              <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor={`rn-${r.id}`}>
                  {t("دلیل رد (برای وکیل ارسال می‌شود)")} *
                </label>
                <textarea
                  id={`rn-${r.id}`}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder={t("مثلاً: تصویر پروانه ناخوانا است؛ لطفاً واضح‌تر بارگذاری کنید.")}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
                <div className="mt-2">
                  <Button onClick={() => act(r.id, "reject", rejectNote.trim())} disabled={busyId === r.id || rejectNote.trim().length < 3} variant="outline" size="sm" data-testid={`verify-reject-confirm-${r.id}`}>
                    {busyId === r.id ? t("…") : t("ثبت رد و ارسال پیغام")}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
