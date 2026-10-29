"use client";
import { useTranslations } from "next-intl";
import { ProfileSummary } from "./profile";
export function StaffProfile({
  staff,
  showEmail = false,
}: {
  staff: { displayName: string; email: string };
  showEmail?: boolean;
}) {
  const t = useTranslations("app");
  return (
    <ProfileSummary
      name={staff.displayName}
      avatar={null}
      subtitle={t("staffRole")}
      detail={
        <small className="staff-profile-detail">
          {showEmail ? <bdi>{staff.email}</bdi> : t("staffIdentityHint")}
        </small>
      }
    />
  );
}
