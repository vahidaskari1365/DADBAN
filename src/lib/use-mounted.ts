"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** حالت hydration امن: در سرور و اولین رندر کلاینت false، سپس true. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
