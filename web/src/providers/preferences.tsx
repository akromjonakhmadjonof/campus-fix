"use client";
import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  connectAppearance,
  readPreferences,
  writePreferences,
  type ThemePreference as Theme,
} from "@/lib/appearance";
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
  const value = useSyncExternalStore(subscribe, readPreferences, () => "system|false");
  const [raw, flag] = value.split("|");
  const theme: Theme = raw === "light" || raw === "dark" ? raw : "system";
  const reduce = flag === "true";
  useEffect(connectAppearance, []);
  const update = writePreferences;
  return <Context.Provider value={{ theme, reduce, update }}>{children}</Context.Provider>;
}
export function usePreferences() {
  const context = useContext(Context);
  if (!context) throw new Error("PreferencesProvider missing");
  return context;
}
