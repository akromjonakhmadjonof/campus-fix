"use client";
import { Suspense, useEffect, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { getQueryClient } from "@/lib/api/query-client";
import { connectPlatformBridge } from "@/lib/platform/runtime";
import { NavigationProgress } from "@/components/navigation-progress";
export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(connectPlatformBridge, []);
  return (
    <QueryClientProvider client={getQueryClient()}>
      <MotionConfig reducedMotion="user">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
        <Toaster
          theme="system"
          toastOptions={{
            style: {
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              borderColor: "var(--border)",
            },
          }}
        />
      </MotionConfig>
    </QueryClientProvider>
  );
}
