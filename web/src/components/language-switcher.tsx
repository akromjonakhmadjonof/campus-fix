"use client";
import { hasLocale, useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname } from "@/i18n/navigation";
import { useRouter } from "@/hooks/use-router";
import { routing } from "@/i18n/routing";
import { finishNavigation } from "@/lib/navigation-progress";
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("shell");
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex flex-wrap items-center gap-3 text-sm">
      <span>{t("language")}</span>
      <select
        aria-label={t("language")}
        value={locale}
        disabled={pending}
        className="min-h-11 rounded-lg border bg-background px-3 text-foreground"
        onChange={(event) => {
          const nextLocale = event.target.value;
          if (!hasLocale(routing.locales, nextLocale) || nextLocale === locale) return;
          startTransition(async () => {
            try {
              router.replace(`${pathname}${window.location.search}${window.location.hash}`, {
                locale: nextLocale,
              });
            } catch (error) {
              finishNavigation();
              throw error;
            }
          });
        }}
      >
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </label>
  );
}
