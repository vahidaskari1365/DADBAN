"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { trackEvent } from "@/lib/analytics";
import { useT } from "@/lib/i18n/provider";
import { ConsultLawyerDirectory } from "@/components/consultation/consult-lawyer-directory";
import { ConsultChatPanel } from "@/components/consultation/consult-chat-panel";

/** وکیل از فهرست قابل‌گفتگو — زیرمجموعه‌ای از فیلدهای API /api/lawyers */
interface DirectoryLawyer {
  slug: string;
  name: string;
  city: string;
  photoUrl: string | null;
  avatarColor: string;
}

/**
 * صفحهٔ مشاوره — فقط فهرست وکلا:
 *  انتخاب وکیل + وضعیت واقعی آنلاین/آفلاین + فیلتر نوع کار + گفتگوی متنی.
 *  فرم تکمیل رزرو به صفحهٔ اختصاصی /consultation/book منتقل شد.
 *  هیرو: همان کادر پنل «بازار پروژه‌ها» با عکس اختصاصی مشاورهٔ آنلاین.
 */
export default function ConsultationPage() {
  const router = useRouter();
  const t = useT();
  const [chatLawyer, setChatLawyer] = useState<DirectoryLawyer | null>(null);

  // «رزرو مشاوره» روی کارت وکیل → صفحهٔ اختصاصی رزرو با پیش‌پر کردن وکیل
  const bookWithLawyer = (lw: DirectoryLawyer) => {
    trackEvent("lawyer_picked_from_directory");
    router.push(`/consultation/book?lawyer=${encodeURIComponent(lw.slug)}`);
  };

  return (
    <>
      {/* هیرو — کادر هم‌اندازهٔ صفحهٔ پروژه‌ها، با عکس متناسب با مشاورهٔ آنلاین */}
      <PageHero
        variant="market"
        image="/images/hero-consult-bg.png"
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("مشاوره حقوقی") }]}
        badge={t("گفتگوی آنلاین با وکلای پایه‌یک دادگستری")}
        title={t("رزرو مشاوره حقوقی آنلاین")}
        desc={t("وکیل متخصص خود را انتخاب کنید؛ وضعیت آنلاین بودن وکلا واقعی است — همین‌جا گفتگو کنید یا نوبت مشاوره بگیرید.")}
        chips={[
          { icon: "chat", label: t("وکیل آنلاین — آمادهٔ گفتگو") },
          { icon: "video", label: t("مشاورهٔ متنی، صوتی و تصویری") },
          { icon: "clock", label: t("نوبت‌دهی بر اساس برنامهٔ وکیل") },
        ]}
      >
        <div className="flex flex-wrap gap-3">
          {/* Magic UI — دکمهٔ درخشان طلایی روی پنل سرمه‌ای */}
          <ShimmerButton
            href="/consultation/book"
            background="#15365d"
            shimmerColor="#e6b94e"
            borderRadius="12px"
            shimmerDuration="3.4s"
            className="min-h-11 gap-2 px-6 text-sm font-black shadow-[var(--shadow-lift)]"
          >
            <Icon name="calendar" className="h-[1.15em] w-[1.15em]" />
            {t("رزرو نوبت مشاوره")}
          </ShimmerButton>
          <a
            href="#lawyer-directory"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
          >
            <Icon name="chat" className="h-[1.15em] w-[1.15em]" />
            {t("گفتگو با وکلای آنلاین")}
          </a>
        </div>
      </PageHero>

      {/* فهرست وکلا — انتخاب وکیل، وضعیت آنلاین/آفلاین، فیلتر نوع کار و شروع گفتگو */}
      <div id="lawyer-directory" className="scroll-mt-20 border-b border-border bg-surface-2/30 py-10">
        <ConsultLawyerDirectory onChat={(lw) => setChatLawyer(lw)} onBook={bookWithLawyer} />
      </div>

      {/* پنل گفتگوی متنی با وکیل انتخاب‌شده */}
      {chatLawyer && (
        <ConsultChatPanel
          lawyer={chatLawyer}
          role="client"
          onClose={() => setChatLawyer(null)}
        />
      )}
    </>
  );
}
