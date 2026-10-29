"use client";
import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
type Theme = "light" | "dark" | "system";
const key = "campusfix.preferences";
const read = () => {
  try {
    return localStorage.getItem(key) ?? "system|false";
  } catch {
    return "system|false";
  }
};
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("campus-preferences", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("campus-preferences", callback);
  };
};
const Context = createContext<{
  theme: Theme;
  reduce: boolean;
  update: (theme: Theme, reduce: boolean) => void;
} | null>(null);
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const value = useSyncExternalStore(subscribe, read, () => "system|false");
  const [raw, flag] = value.split("|");
  const theme: Theme = raw === "light" || raw === "dark" ? raw : "system";
  const reduce = flag === "true";
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.classList.toggle("light", !dark);
      document.documentElement.dataset.reduceMotion = String(reduce);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, reduce]);
  const update = (next: Theme, motion: boolean) => {
    try {
      localStorage.setItem(key, `${next}|${motion}`);
    } catch {
      /* The UI already reports upload errors; storage may be unavailable. */
    }
    window.dispatchEvent(new Event("campus-preferences"));
  };
  return <Context.Provider value={{ theme, reduce, update }}>{children}</Context.Provider>;
}
export function usePreferences() {
  const context = useContext(Context);
  if (!context) throw new Error("PreferencesProvider missing");
  return context;
}
