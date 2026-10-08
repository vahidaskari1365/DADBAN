"use client";

import { createContext, useContext, type ReactNode } from "react";
import { makeT, type Locale, type TFn } from "./core";

/**
 * فراهم‌کنندهٔ زبان سمت کلاینت — layout ریشه، locale خوانده‌شده از کوکی را
 * از سرور تزریق می‌کند تا هیچ فلش زبانی رخ ندهد. کامپوننت‌های کلاینت با
 * useT() ترجمه می‌کنند؛ کامپوننت‌های سرور با getT() از i18n/server.
 */

const LocaleCtx = createContext<Locale>("fa");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleCtx.Provider value={locale}>{children}</LocaleCtx.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleCtx);
}

export function useT(): TFn {
  return makeT(useContext(LocaleCtx));
}
