"use client";
import { useTranslations } from "next-intl";
import { usePlatform } from "@/hooks/use-platform";

export function PlatformStatus() {
  const { platform, bridgeState } = usePlatform();
  const t = useTranslations("shell");
  return (
    <div className="space-y-1 text-sm text-muted-foreground" role="status">
      <p data-testid="platform">{t("platform", { platform })}</p>
      <p>{t("bridge", { state: t(`states.${bridgeState}`) })}</p>
    </div>
  );
}
