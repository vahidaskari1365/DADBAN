"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Fires a lightweight page-view beacon on every route change. */
export function Tracker() {
  const pathname = usePathname();
  const last = useRef<string>("");
  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, [pathname]);
  return null;
}
