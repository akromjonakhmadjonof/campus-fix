"use client";
import { hasLocale, useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname } from "@/i18n/navigation";
import { useRouter } from "@/hooks/use-router";
import { routing, languageNames } from "@/i18n/routing";
import { finishNavigation } from "@/lib/navigation-progress";
import { Choice } from "@/components/campus/choice";
export function LanguageSwitcher() {
  const locale = useLocale(),
    t = useTranslations("app"),
    pathname = usePathname(),
    router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Choice
      label={t("language")}
      value={locale}
      disabled={pending}
      options={Object.entries(languageNames).map(([value, label]) => ({ value, label }))}
      onValueChange={(next) => {
        if (!hasLocale(routing.locales, next) || next === locale) return;
        startTransition(() => {
          try {
            router.replace(`${pathname}${window.location.search}${window.location.hash}`, {
              locale: next,
            });
          } catch (error) {
            finishNavigation();
            throw error;
          }
        });
      }}
    />
  );
}
