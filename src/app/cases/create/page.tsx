import { permanentRedirect } from "next/navigation";

/**
 * /cases/create was a duplicate, less complete case-intake form whose success
 * screen linked to a hardcoded fake dashboard case (/dashboard/cases/1258-0001).
 * The single, real intake flow lives in /case/new (real caseNumber +
 * trackingToken + stage timeline). This legacy URL redirects permanently.
 */
export default function CreateCasePage() {
  permanentRedirect("/case/new");
}
