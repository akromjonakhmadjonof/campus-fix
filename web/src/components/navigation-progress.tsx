"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { finishNavigation } from "@/lib/navigation-progress";
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    finishNavigation();
  }, [pathname, search]);
  useEffect(() => {
    window.addEventListener("pagehide", finishNavigation);
    return () => {
      window.removeEventListener("pagehide", finishNavigation);
      finishNavigation();
    };
  }, []);
  return null;
}
