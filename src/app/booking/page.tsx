import { permanentRedirect } from "next/navigation";

/**
 * /booking was a six-step marketing explainer that promised an online payment
 * flow which didn't exist. The real, working booking flow lives in
 * /consultation (request → real slot selection → honest payment handling).
 * This legacy URL now redirects permanently, preserving query params via the
 * browser (e.g. ?lawyer=…) is intentionally dropped: /consultation owns them.
 */
export default function BookingPage() {
  permanentRedirect("/consultation");
}
