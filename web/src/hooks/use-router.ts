"use client";
import { useLocale } from "next-intl";
import { useRouter as useIntlRouter, getPathname } from "@/i18n/navigation";
import { startNavigation } from "@/lib/navigation-progress";
export function useRouter() {
  const router = useIntlRouter();
  const locale = useLocale();
  return {
    ...router,
    push: (...args: Parameters<typeof router.push>) => {
      startNavigation(getPathname({ href: args[0], locale: args[1]?.locale ?? locale }));
      router.push(...args);
    },
    replace: (...args: Parameters<typeof router.replace>) => {
      startNavigation(getPathname({ href: args[0], locale: args[1]?.locale ?? locale }));
      router.replace(...args);
    },
  };
}
