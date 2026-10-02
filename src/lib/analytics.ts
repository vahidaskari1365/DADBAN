// Minimal, privacy-conscious analytics events (no PII in event payloads).
// Events land in the `events` table via /api/track and power the funnel:
// Visitor → Problem Identified → Recommendation → Service View → Intent →
// Lead/Booking → Payment → Fulfillment → Review → Repeat.

export const EVENTS = [
  "landing_view",
  "quickstart_started",
  "quickstart_completed",
  "lawyer_viewed",
  "consultation_started",
  "booking_started",
  "payment_started",
  "payment_completed",
  "case_created",
  "contract_builder_started",
  "contract_completed",
  "ai_started",
  "ai_to_lawyer_clicked",
  "business_pricing_viewed",
  "lead_created",
  "availability_viewed",
  "slot_selected",
] as const;

export type AnalyticsEvent = (typeof EVENTS)[number];

/** Client-side beacon. Generates no PII — just the event name and path. */
export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, path: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics must never break UX */
  }
}
