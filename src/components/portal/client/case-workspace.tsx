"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Progress, StatusBadge } from "@/components/panel-widgets";
import type { IconKey } from "@/lib/data";
import { formatJalaliLong, formatToman, labelStatus, toFa } from "@/lib/money";
import { nextActionForCase } from "@/lib/case-facts";
import CaseMessages from "./case-messages";
import CaseTimeline from "./case-timeline";
import CasePayments from "./case-payments";
import CaseContract from "./case-contract";
import CaseProposals from "./case-proposals";
import type {
  EventItem,
  InstallmentItem,
  CreditItem,
  LawyerLite,
  MessageItem,
  ProposalItem,
  WorkspaceCase,
} from "./types";

type TabKey = "overview" | "timeline" | "messages" | "payments" | "contract" | "proposals";

const URGENCY_FA: Record<string, { label: string; cls: string }> = {
  normal: { label: "عادی", cls: "bg-surface-2 text-muted" },
  high: { label: "مهم", cls: "bg-accent-soft text-accent" },
  urgent: { label: "فوری", cls: "bg-danger/10 text-danger" },
};

/**
 * فضای کاری واحد پرونده (موکل و وکیل) — تب‌های سمت کاربر.
 * دادهٔ اولیه در سرور خوانده شده و بدون JS هم تب نخست رندر می‌شود؛
 * تب‌های زنده از APIهای /api/portal/cases/[id]/** بروزرسانی می‌شوند.
 */
export default function CaseWorkspace({
  viewerRole,
  kase,
  lawyer,
  events,
  messages,
  unreadCount,
  installments,
  credits,
  proposals,
  lawyers,
  initialTab = "overview",
}: {
  viewerRole: string;
  kase: WorkspaceCase;
  lawyer: LawyerLite | null;
  events: EventItem[];
  messages: MessageItem[];
  unreadCount: number;
  installments: InstallmentItem[];
  credits: CreditItem[];
  proposals: ProposalItem[];
  lawyers: LawyerLite[];
  initialTab?: TabKey;
}) {
  const showProposals = proposals.length > 0 && !lawyer;
  const [tab, setTab] = useState<TabKey>(initialTab);

  const tabs: { key: TabKey; label: string; icon: IconKey; badge?: number }[] = [
    { key: "overview", label: "پرونده", icon: "folder" },
    { key: "timeline", label: "تایم‌لاین", icon: "clock", badge: events.length },
    { key: "messages", label: "پیام‌ها", icon: "chat", badge: unreadCount },
    { key: "payments", label: "پرداخت و اقساط", icon: "money", badge: installments.filter((i) => i.status === "pending" || i.status === "late").length },
    { key: "contract", label: "قرارداد", icon: "stamp" },
    ...(showProposals ? [{ key: "proposals" as TabKey, label: "پیشنهادها", icon: "mail" as const, badge: proposals.filter((p) => p.status === "pending").length }] : []),
  ];

  const caseStatus = labelStatus("case", kase.status);
  const contractStatus = labelStatus("contract", kase.contractStatus);
  const urgency = URGENCY_FA[kase.urgency] ?? URGENCY_FA.normal;
  const next = viewerRole === "client" ? nextActionForCase(kase.stage, kase.status) : null;

  return (
    <div className="space-y-5">
      {/* سربرگ پرونده */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-foreground">{kase.subject}</h2>
              <StatusBadge tone={caseStatus.tone}>{caseStatus.label}</StatusBadge>
              {kase.urgency !== "normal" && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${urgency.cls}`}>{urgency.label}</span>
              )}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span dir="ltr" className="font-mono">{kase.caseNumber}</span>
              <span>{kase.city}{kase.province ? ` · ${kase.province}` : ""}</span>
              {kase.createdAt && <span>ثبت: {formatJalaliLong(kase.createdAt)}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/client"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-2"
            >
              <Icon name="home" className="h-4 w-4" /> داشبورد موکل
            </Link>
          </div>
        </div>

        {/* نوار پیشرفت کلی */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground-soft">پیشرفت کلی پرونده</span>
            <span className="font-extrabold text-accent">{toFa(kase.progress)}٪</span>
          </div>
          <Progress value={kase.progress} />
          <p className="mt-1.5 text-[11px] text-muted">مرحله فعلی: {kase.stage}</p>
        </div>
      </div>

      {/* تب‌ها — موبایل: اسکرول افقی */}
      <div role="tablist" aria-label="بخش‌های پرونده" className="-mx-1 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-1.5 rounded-2xl border border-border bg-surface p-1.5 shadow-sm">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-[13px] font-bold transition-all ${
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground-soft hover:bg-surface-2"
                }`}
              >
                <Icon name={t.icon} className="h-4 w-4" />
                {t.label}
                {typeof t.badge === "number" && t.badge > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20 text-white" : "bg-accent/15 text-accent"}`}>
                    {toFa(t.badge)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* محتوای تب‌ها */}
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        {tab === "overview" && (
          <div className="space-y-5">
            {next && (
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-accent/30 bg-accent-soft/50 p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-accent">
                    <Icon name="bolt" className="h-4 w-4" /> اقدام بعدی
                  </p>
                  <h3 className="mt-1 text-sm font-bold text-foreground">{next.action}</h3>
                  <p className="mt-1 text-xs leading-6 text-foreground-soft">{next.detail}</p>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="text-xs text-muted">شرح پرونده</p>
                <p className="mt-1 text-sm leading-7 text-foreground-soft">{kase.description}</p>
              </div>
              <div>
                <p className="text-xs text-muted">تخصص حقوقی</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <Icon name="scale" className="h-4 w-4 text-accent" /> {kase.specialty}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">شهر / استان</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <Icon name="location" className="h-4 w-4 text-accent" /> {kase.city}
                  {kase.province ? ` — ${kase.province}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">بودجهٔ اعلامی</p>
                <p className="mt-1 text-sm font-bold text-foreground">{kase.budget ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted">مبلغ قرارداد (حق‌الوکالهٔ توافقی)</p>
                <p className="dp-money mt-1 text-sm">{formatToman(kase.feeAgreed)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">وضعیت قرارداد</p>
                <p className="mt-1">
                  <StatusBadge tone={contractStatus.tone}>{contractStatus.label}</StatusBadge>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">مرحلهٔ رسیدگی</p>
                <p className="mt-1 text-sm font-bold text-foreground">{kase.stage}</p>
              </div>
            </div>

            {/* وکیل منتخب */}
            <div className="rounded-2xl border border-border bg-surface-2/30 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-muted">
                <Icon name="gavel" className="h-4 w-4 text-accent" /> وکیل منتخب
              </p>
              {lawyer ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl text-sm font-bold" style={{ background: "#17264a", color: "#7fd8ee" }}>
                      {lawyer.name.trim().charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-foreground">{lawyer.name}</p>
                      <p className="flex items-center gap-2 text-[11px] text-muted">
                        <span>{lawyer.title}</span>
                        {lawyer.rating > 0 && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <Icon name="star" className="h-3 w-3 text-accent" />
                              {toFa(lawyer.rating.toFixed(1))}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/lawyers/${lawyer.slug}`}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-2"
                  >
                    مشاهده پروفایل
                    <Icon name="chevron" className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <p className="mt-2 flex items-start gap-2 text-xs leading-6 text-muted">
                  <Icon name="clock" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  هنوز وکیل منتخبی تعیین نشده است؛ پیشنهادهای وکلا را در تب «پیشنهادها» مقایسه و یکی را پذیرش کنید.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "timeline" && <CaseTimeline caseId={kase.id} initialEvents={events} />}

        {tab === "messages" && (
          <CaseMessages
            caseId={kase.id}
            viewerRole={viewerRole}
            initialMessages={messages}
          />
        )}

        {tab === "payments" && (
          <CasePayments caseId={kase.id} feeAgreed={kase.feeAgreed} initialInstallments={installments} initialCredits={credits} />
        )}

        {tab === "contract" && (
          <CaseContract
            caseId={kase.id}
            contractStatus={kase.contractStatus}
            contractCode={kase.contractCode}
            feeAgreed={kase.feeAgreed}
            signedAt={kase.contractSignedAt}
          />
        )}

        {tab === "proposals" && showProposals && (
          <CaseProposals caseId={kase.id} initialProposals={proposals} lawyers={lawyers} />
        )}
      </div>
    </div>
  );
}
