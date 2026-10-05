"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui";
import { Icon } from "@/components/icons";
import { trackEvent } from "@/lib/analytics";
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
 */
export default function ConsultationPage() {
  const router = useRouter();
  const [chatLawyer, setChatLawyer] = useState<DirectoryLawyer | null>(null);

  // «رزرو مشاوره» روی کارت وکیل → صفحهٔ اختصاصی رزرو با پیش‌پر کردن وکیل
  const bookWithLawyer = (lw: DirectoryLawyer) => {
    trackEvent("lawyer_picked_from_directory");
    router.push(`/consultation/book?lawyer=${encodeURIComponent(lw.slug)}`);
  };

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-surface-2/60 to-background py-8">
        <Container>
          <nav className="flex items-center gap-1.5 text-xs text-muted" aria-label="مسیر صفحه">
            <Link href="/" className="hover:text-primary">خانه</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <span className="text-foreground-soft">مشاوره حقوقی</span>
          </nav>
          <h1 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">رزرو مشاوره حقوقی آنلاین</h1>
          <p className="mt-2 text-sm leading-7 text-muted">
            وکیل متخصص خود را انتخاب کنید؛ وضعیت آنلاین بودن وکلا واقعی است — همین‌جا گفتگو کنید یا نوبت مشاوره بگیرید.
          </p>
        </Container>
      </section>

      {/* فهرست وکلا — انتخاب وکیل، وضعیت آنلاین/آفلاین، فیلتر نوع کار و شروع گفتگو */}
      <div className="border-b border-border bg-surface-2/30 py-10">
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
