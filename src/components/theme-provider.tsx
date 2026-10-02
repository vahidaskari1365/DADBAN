"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useMounted } from "@/lib/use-mounted";

type Theme = "light" | "dark";

interface ThemeCtx {
  theme: Theme;
  mounted: boolean;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

/** مقدار اولیه از روی کلاس اعمال‌شده توسط اسکریپت boot در <head> خوانده می‌شود (بدون effect). */
function readBootTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readBootTheme);
  const mounted = useMounted();

  const setTheme = useCallback((t: Theme) => {
    const d = document.documentElement;
    d.classList.toggle("dark", t === "dark");
    d.style.colorScheme = t;
    try {
      localStorage.setItem("dadban-theme", t);
    } catch {
      /* storage unavailable */
    }
    setThemeState(t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <Ctx.Provider value={{ theme, mounted, toggle, setTheme }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
