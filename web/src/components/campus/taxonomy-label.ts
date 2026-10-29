"use client";
import { useLocale, useTranslations } from "next-intl";
import type { IssueGroup, IssueType } from "@/lib/campus-api";
export function useTaxonomyLabel() {
  const locale = useLocale();
  const t = useTranslations("app");
  return (item: IssueGroup | IssueType) => {
    const key = `taxonomy.${item.code}` as Parameters<typeof t>[0];
    return t.has(key) ? t(key) : locale === "es" ? item.labelEs : item.labelEn;
  };
}
