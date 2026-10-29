"use client";
import { useLocale, useTranslations } from "next-intl";
import type { IssueType } from "@/lib/campus-api";
export function useTaxonomyLabel() {
  const locale = useLocale();
  const t = useTranslations("app");
  return (item: Pick<IssueType, "code" | "labelEn" | "labelEs">) => {
    const key = `taxonomy.${item.code}` as Parameters<typeof t>[0];
    return t.has(key) ? t(key) : locale === "es" ? item.labelEs : item.labelEn;
  };
}
