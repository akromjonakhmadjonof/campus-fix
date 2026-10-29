"use client";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/campus/shared";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations("app");
  return (
    <>
      <PageHeader title="CampusFix" subtitle={t("tagline")} />
      <div className="empty-state" role="alert">
        <p>{t("error")}</p>
        <button className="button primary" onClick={reset}>
          {t("retry")}
        </button>
      </div>
    </>
  );
}
