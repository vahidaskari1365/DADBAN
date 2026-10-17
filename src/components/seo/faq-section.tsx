import { FaqAccordion } from "@/components/amazon/faq-accordion";
import { safeJsonLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";
import type { FaqItem } from "@/lib/seo-landings";

/**
 * بخش سوالات متداول + FAQPage schema — استاندارد AEO نقشه راه سئو.
 * سوال به‌صورت تیتر مستقل و پاسخ خودکفا رندر می‌شود و در کنارش
 * JSON-LD معتبر (FAQPage) تزریق می‌گردد تا گوگل و AI Overviews
 * بتوانند پرسش/پاسخ را مستقیم بردارند.
 */
export function FaqSection({
  items,
  title = "پرسش‌های متداول",
  canonicalPath,
}: {
  items: FaqItem[];
  title?: string;
  canonicalPath: string;
}) {
  if (!items?.length) return null;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}${canonicalPath}#faq`,
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      text: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }}
      />
      <FaqAccordion items={items} title={title} />
    </>
  );
}
