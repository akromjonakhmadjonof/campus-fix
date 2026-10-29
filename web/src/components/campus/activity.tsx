"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, ClipboardList, ShieldCheck, ThumbsUp } from "lucide-react";
import { NavigationLink as Link } from "@/components/navigation-link";
import { BackLink, PageHeader } from "./shared";
import { ExploreScreen } from "./explore";
export function ActivityScreen() {
  const t = useTranslations("app");
  const [view, setView] = useState<"mine" | "confirmed" | null>(null);
  if (view)
    return (
      <>
        <BackLink onClick={() => setView(null)} />
        <ExploreScreen activity={view} />
      </>
    );
  return (
    <div className="narrow-page">
      <PageHeader title={t("activity")} subtitle={t("deviceActivity")} />
      <div className="surface pairing-card">
        <p>{t("device")}</p>
        <Link href="/reports/new" className="button primary compact">
          {t("report")}
        </Link>
      </div>
      <h2 className="group-label">{t("deviceActivity")}</h2>
      <div className="settings-group">
        <button onClick={() => setView("mine")} className="profile-row">
          <ClipboardList size={19} />
          <div>
            <strong>{t("myReports")}</strong>
            <small>{t("viewReports")}</small>
          </div>
          <ChevronRight className="directional" size={17} />
        </button>
        <button onClick={() => setView("confirmed")} className="profile-row">
          <ThumbsUp size={19} />
          <div>
            <strong>{t("confirmedIssues")}</strong>
            <small>{t("viewConfirmed")}</small>
          </div>
          <ChevronRight className="directional" size={17} />
        </button>
      </div>
      <h2 className="group-label">{t("maintenance")}</h2>
      <div className="settings-group">
        <Link href="/staff" className="profile-row">
          <ShieldCheck size={19} />
          <div>
            <strong>{t("staffEntry")}</strong>
            <small>{t("staffDescription")}</small>
          </div>
          <ChevronRight className="directional" size={17} />
        </Link>
      </div>
      <p className="privacy-note">
        <ShieldCheck size={17} />
        {t("privacyShort")}
      </p>
    </div>
  );
}
