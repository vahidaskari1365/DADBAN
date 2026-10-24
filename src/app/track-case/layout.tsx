import type { Metadata } from "next";

// صفحه /track-case کلاینت‌کامپوننت است؛ canonical در layout سروری تعریف می‌شود.
export const metadata: Metadata = {
  alternates: { canonical: "/track-case" },
};

export default function TrackCaseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
