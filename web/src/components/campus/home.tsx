"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NavigationLink as Link } from "@/components/navigation-link";
import { NotificationPreview } from "./notifications";
import { ProfileCard } from "./profile";
import { campus, type LinkState } from "@/lib/campus-api";
import {
  EmptyState,
  ErrorState,
  RecentReport,
  LoadingState,
  PageHeader,
  SectionHeader,
  useFeedback,
} from "./shared";
export function Pairing() {
  const t = useTranslations("app"),
    client = useQueryClient(),
    feedback = useFeedback();
  const [link, setLink] = useState<LinkState | null>(null),
    [code, setCode] = useState("");
  const poll = useQuery({
    queryKey: ["campus", "link", link?.requestId],
    queryFn: () => campus.linkStatus(link?.requestId ?? ""),
    enabled: !!link,
    refetchInterval: (query) =>
      ["confirmed", "expired", "cancelled"].includes(query.state.data?.state ?? "") ? false : 2000,
  });
  const action = useMutation({
    mutationFn: async (kind: "start" | "request" | "confirm" | "cancel") => {
      if (kind === "start") setLink(await campus.linkStart());
      if (kind === "request") setLink(await campus.linkRequest(code));
      if (kind === "confirm") {
        await campus.linkConfirm(link?.requestId ?? "");
        await client.invalidateQueries({ queryKey: ["campus"] });
      }
      if (kind === "cancel") {
        await campus.linkCancel(link?.requestId ?? "");
        setLink(null);
      }
    },
    onError: feedback,
  });
  const state = poll.data?.state ?? link?.state;
  return (
    <section className="surface pairing-card">
      <h2>{t("linkTitle")}</h2>
      <p>{t("linkHint")}</p>
      {state === "confirmed" ? (
        <p role="status">
          {t("linkConfirmed")}{" "}
          <button
            className="text-button"
            onClick={() => {
              setLink(null);
              void client.invalidateQueries({ queryKey: ["campus"] });
            }}
          >
            {t("retry")}
          </button>
        </p>
      ) : state === "expired" || state === "cancelled" ? (
        <p role="status">{t("linkExpired")}</p>
      ) : null}
      {link?.code && (
        <p className="pairing-code">
          <strong>{link.code}</strong>
          <small>{new Date(link.expiresAt).toLocaleTimeString()}</small>
        </p>
      )}
      {state === "awaiting_confirmation" && <p role="status">{t("linkPending")}</p>}
      {poll.data?.canConfirm && (
        <button
          className="button primary"
          disabled={action.isPending}
          onClick={() => action.mutate("confirm")}
        >
          {t("linkApprove")}
        </button>
      )}
      <div className="inline-actions">
        <button
          className="button secondary"
          disabled={action.isPending}
          onClick={() => action.mutate("start")}
        >
          {t("linkStart")}
        </button>
        {link && (
          <button
            className="text-button"
            disabled={action.isPending}
            onClick={() => action.mutate("cancel")}
          >
            {t("cancel")}
          </button>
        )}
      </div>
      <form
        className="pairing-form"
        onSubmit={(e) => {
          e.preventDefault();
          action.mutate("request");
        }}
      >
        <label htmlFor="pair-code">{t("linkCode")}</label>
        <input
          id="pair-code"
          maxLength={12}
          autoComplete="off"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button className="button secondary" disabled={code.length !== 12 || action.isPending}>
          {t("linkExisting")}
        </button>
      </form>
    </section>
  );
}
export function HomeScreen() {
  const t = useTranslations("app");
  const me = useQuery({ queryKey: ["campus", "me"], queryFn: campus.me });
  const reports = useQuery({
    queryKey: ["campus", "recent-own"],
    queryFn: () => campus.reports({ scope: "mine", limit: 3 }),
  });
  return (
    <div className="account-page">
      <PageHeader title={t("welcome")} subtitle={t("accountSubtitle")} />
      {me.isPending ? (
        <LoadingState />
      ) : me.isError ? (
        <ErrorState retry={me.refetch} />
      ) : (
        <ProfileCard profile={me.data} />
      )}
      <NotificationPreview />
      <section className="account-recent">
        <SectionHeader title={t("recentOwn")} href="/reports?scope=mine" />
        {reports.isPending ? (
          <LoadingState />
        ) : reports.isError ? (
          <ErrorState retry={reports.refetch} />
        ) : reports.data.data.length ? (
          <div className="recent-list">
            {reports.data.data.map((r) => (
              <RecentReport key={r.id} report={r} />
            ))}
          </div>
        ) : (
          <EmptyState
            message={t("recentEmpty")}
            action={
              <Link className="text-button" href="/reports/new">
                {t("report")}
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
