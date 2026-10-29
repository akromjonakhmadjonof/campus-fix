"use client";
import { Suspense, useEffect, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { Direction } from "radix-ui";
import { Toaster } from "sonner";
import { getQueryClient } from "@/lib/api/query-client";
import { connectPlatformBridge } from "@/lib/platform/runtime";
import { usePlatform } from "@/hooks/use-platform";
import { NavigationProgress } from "@/components/navigation-progress";
import { PreferencesProvider, usePreferences } from "./preferences";
function MotionPreferences({ children }: { children: ReactNode }) {
  const { reduce, theme } = usePreferences();
  const locale = useLocale();
  return (
    <MotionConfig reducedMotion={reduce ? "always" : "user"}>
      {children}
      <Toaster theme={theme} dir={locale === "ar" ? "rtl" : "ltr"} />
    </MotionConfig>
  );
}
export function AppProviders({ children }: { children: ReactNode }) {
  const locale = useLocale();
  useEffect(connectPlatformBridge, []);
  useEffect(() => {
    const receive = (event: Event) => {
      if (
        window.ReactNativeWebView &&
        event instanceof CustomEvent &&
        typeof event.detail?.active === "boolean"
      )
        focusManager.setFocused(event.detail.active);
    };
    window.addEventListener("campus-visibility", receive);
    return () => {
      window.removeEventListener("campus-visibility", receive);
      focusManager.setFocused(undefined);
    };
  }, []);
  const platform = usePlatform();
  useEffect(() => {
    document.documentElement.dataset.native = String(platform.isNative);
  }, [platform.isNative]);
  return (
    <QueryClientProvider client={getQueryClient()}>
      <Direction.Provider dir={locale === "ar" ? "rtl" : "ltr"}>
        <PreferencesProvider>
          <MotionPreferences>
            <Suspense fallback={null}>
              <NavigationProgress />
            </Suspense>
            {children}
          </MotionPreferences>
        </PreferencesProvider>
      </Direction.Provider>
    </QueryClientProvider>
  );
}
