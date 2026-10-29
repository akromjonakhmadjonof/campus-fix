"use client";
import { useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Code2,
  Globe2,
  Info,
  Moon,
  ShieldCheck,
  Sparkles,
  Link2,
} from "lucide-react";
import { NavigationLink as Link } from "@/components/navigation-link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { usePreferences } from "@/providers/preferences";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { campus } from "@/lib/campus-api";
import { BackLink, PageHeader, useFeedback } from "./shared";
import { Choice } from "./choice";
import { Pairing } from "./home";
import { ProfileCard } from "./profile";
import { StaffProfile } from "./staff-profile";
import { StaffSignOut, useStaffSession } from "./staff-session";
function Row({
  icon,
  label,
  children,
  id,
}: {
  icon: ReactNode;
  label: string;
  children?: ReactNode;
  id?: string;
}) {
  return (
    <div className="settings-row" id={id}>
      <span className="settings-icon">{icon}</span>
      <span>{label}</span>
      <div className="settings-value">{children}</div>
    </div>
  );
}
export function SettingsScreen({ staff = false }: { staff?: boolean }) {
  const t = useTranslations("app"),
    format = useFormatter(),
    client = useQueryClient(),
    feedback = useFeedback();
  const { theme, reduce, update } = usePreferences();
  const worker = useStaffSession();
  const [info, setInfo] = useState<"aboutText" | "privacyText" | "softwareText" | null>(null);
  const [linking, setLinking] = useState(false);
  const me = useQuery({ queryKey: ["campus", "me"], queryFn: campus.me, enabled: !staff });
  const revoke = useMutation({
    mutationFn: campus.revoke,
    onSuccess: () => void client.invalidateQueries({ queryKey: ["campus", "me"] }),
    onError: feedback,
  });
  return (
    <div className="narrow-page settings-page">
      <BackLink href={staff ? "/staff" : "/"} />
      <PageHeader
        title={t("settings")}
        subtitle={t(staff ? "staffSettingsSubtitle" : "settingsSubtitle")}
      />
      {!staff && me.data && (
        <>
          <h2 className="group-label">{t("account")}</h2>
          <ProfileCard profile={me.data} />
        </>
      )}
      {staff && worker.data?.staff && (
        <>
          <h2 className="group-label">{t("account")}</h2>
          <StaffProfile staff={worker.data.staff} showEmail />
          <p className="staff-account-managed">{t("staffAccountManaged")}</p>
        </>
      )}
      <h2 className="group-label">{t("preferences")}</h2>
      <div className="settings-group">
        <Row id="language" icon={<Globe2 size={19} />} label={t("language")}>
          <LanguageSwitcher />
        </Row>
        <Row id="appearance" icon={<Moon size={19} />} label={t("appearance")}>
          <Choice
            label={t("appearance")}
            value={theme}
            onValueChange={(value) => update(value as typeof theme, reduce)}
            options={(["light", "dark", "system"] as const).map((value) => ({
              value,
              label: t(value),
            }))}
          />
        </Row>
        <Row icon={<Sparkles size={19} />} label={t("reduceMotion")}>
          <button
            role="switch"
            aria-checked={reduce}
            aria-label={t("reduceMotion")}
            className={`toggle ${reduce ? "on" : ""}`}
            onClick={() => update(theme, !reduce)}
          >
            <span />
          </button>
        </Row>
      </div>
      {!staff && (
        <>
          <h2 className="group-label">{t("connections")}</h2>
          <div className="settings-group" id="linking">
            <button className="settings-row" onClick={() => setLinking(true)}>
              <Link2 size={19} />
              <span>{t("linkTitle")}</span>
              <ChevronRight className="row-chevron directional" size={17} />
            </button>
          </div>
          {me.data && me.data.linkedSessions > 1 && (
            <div className="settings-group linked-list">
              {me.data.sessions.map((s, index) => (
                <div className="settings-row" key={s.id}>
                  <span>
                    <strong>
                      {t(s.current ? "currentConnection" : "linkedConnection", {
                        number: index + 1,
                      })}
                    </strong>
                    <small>{format.dateTime(new Date(s.createdAt), { dateStyle: "medium" })}</small>
                  </span>
                  {!s.current && (
                    <button
                      className="text-button"
                      disabled={revoke.isPending}
                      onClick={() => revoke.mutate(s.id)}
                    >
                      {t("revoke")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <h2 className="group-label">{t("about")}</h2>
      <div className="settings-group">
        {(
          [
            { value: "aboutText", label: "aboutCampus", Icon: Info },
            { value: "privacyText", label: "privacy", Icon: ShieldCheck },
            { value: "softwareText", label: "openSource", Icon: Code2 },
          ] as const
        ).map(({ value, label, Icon }) => (
          <button className="settings-row" key={value} onClick={() => setInfo(value)}>
            <Icon size={19} />
            <span>{t(label)}</span>
            <ChevronRight className="row-chevron directional" size={17} />
          </button>
        ))}
      </div>
      {staff && (
        <>
          <h2 className="group-label">{t("sessionSettings")}</h2>
          <div className="settings-group">
            <StaffSignOut />
          </div>
        </>
      )}
      <p className="settings-footer">
        CampusFix
        <br />
        {t("tagline")}
        <br />
        {t("version")} 0.1.0
        {!staff && (
          <>
            <br />
            <Link href="/staff">{t("staffEntry")}</Link>
          </>
        )}
      </p>
      <Dialog
        open={info !== null}
        onOpenChange={(open) => {
          if (!open) setInfo(null);
        }}
      >
        <DialogContent closeLabel={t("close")} className="info-dialog">
          <DialogHeader>
            <DialogTitle>
              {t(
                info === "privacyText"
                  ? "privacy"
                  : info === "softwareText"
                    ? "openSource"
                    : "aboutCampus",
              )}
            </DialogTitle>
            <DialogDescription>{info ? t(info) : ""}</DialogDescription>
          </DialogHeader>
          <button className="button primary" onClick={() => setInfo(null)}>
            {t("close")}
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={linking} onOpenChange={setLinking}>
        <DialogContent closeLabel={t("close")} className="link-dialog">
          <DialogHeader>
            <DialogTitle>{t("linkTitle")}</DialogTitle>
            <DialogDescription>{t("cookieWarning")}</DialogDescription>
          </DialogHeader>
          <Pairing />
        </DialogContent>
      </Dialog>
    </div>
  );
}
