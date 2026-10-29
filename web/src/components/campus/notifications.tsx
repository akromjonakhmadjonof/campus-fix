"use client";
import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useNow, useTranslations } from "next-intl";
import {
  Bell,
  Check,
  CheckCheck,
  ClipboardCheck,
  LoaderCircle,
  ThumbsUp,
  Wrench,
  XCircle,
} from "lucide-react";
import { NavigationLink as Link } from "@/components/navigation-link";
import { inbox, type InboxCursor, type Notification } from "@/lib/insights-api";
import {
  BackLink,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionHeader,
  useFeedback,
} from "./shared";
import { useStaffSession } from "./staff-session";

const refresh = {
  staleTime: 15000,
  refetchInterval: 30000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
} as const;
export function useUnreadNotifications(enabled = true) {
  return useQuery({
    queryKey: ["campus", "notifications", "unread"],
    queryFn: inbox.unread,
    enabled,
    ...refresh,
  });
}
function useReadNotifications() {
  const client = useQueryClient(),
    feedback = useFeedback();
  return useMutation({
    mutationFn: ({ id, through }: { id?: string; through?: string }) =>
      id ? inbox.read(id) : inbox.readAll(through ?? new Date().toISOString()),
    onSuccess: () => client.invalidateQueries({ queryKey: ["campus", "notifications"] }),
    onError: feedback,
  });
}
const icons = {
  UPVOTE: ThumbsUp,
  ACCEPTED: ClipboardCheck,
  IN_PROGRESS: Wrench,
  RESOLVED: CheckCheck,
  REJECTED: XCircle,
};
function NotificationRow({
  notification,
  onRead,
  pending,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  pending: boolean;
}) {
  const t = useTranslations("app"),
    format = useFormatter(),
    now = useNow({ updateInterval: 60000 });
  const Icon = icons[notification.type];
  return (
    <article
      className={`notification-row surface ${notification.readAt ? "is-read" : "is-unread"}`}
      data-notification-id={notification.id}
    >
      <span className="notification-icon">
        <Icon size={19} aria-hidden="true" />
      </span>
      <div className="notification-content">
        <p>
          <strong className="notification-actor">
            {notification.actorDisplayName || t("guest")}
          </strong>{" "}
          {t(`notificationActions.${notification.type}`)}
        </p>
        <Link
          className="notification-report"
          href={`/reports/${notification.reportId}`}
          onClick={() => {
            if (!notification.readAt) onRead(notification.id);
          }}
        >
          {notification.reportTitle}
        </Link>
        {notification.note && <p className="notification-note">{notification.note}</p>}
        <time dateTime={notification.createdAt}>
          {format.relativeTime(new Date(notification.createdAt), now)}
        </time>
      </div>
      {!notification.readAt && (
        <button
          className="notification-read"
          aria-label={t("markNotificationRead", { title: notification.reportTitle })}
          title={t("markRead")}
          disabled={pending}
          onClick={() => onRead(notification.id)}
        >
          <Check size={18} />
          <span className="unread-dot" />
        </button>
      )}
    </article>
  );
}
export function NotificationPreview() {
  const t = useTranslations("app"),
    staff = useStaffSession();
  const query = useQuery({
    queryKey: ["campus", "notifications", "preview"],
    queryFn: ({ signal }) => inbox.list(4, undefined, signal),
    enabled: !staff.data?.staff,
    ...refresh,
  });
  const read = useReadNotifications();
  if (staff.data?.staff) return null;
  return (
    <section className="notification-preview">
      <SectionHeader title={t("notifications")} href="/notifications" />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState retry={query.refetch} />
      ) : query.data.data.length ? (
        <div className="notification-list">
          {query.data.data.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              pending={read.isPending}
              onRead={(id) => read.mutate({ id })}
            />
          ))}
        </div>
      ) : (
        <div className="notification-empty surface">
          <Bell size={22} />
          <div>
            <h3>{t("notificationsEmpty")}</h3>
            <p>{t("notificationsEmptyHint")}</p>
          </div>
        </div>
      )}
    </section>
  );
}
export function NotificationsScreen() {
  const t = useTranslations("app");
  const [cursors, setCursors] = useState<(InboxCursor | undefined)[]>([undefined]);
  const cursor = cursors.at(-1);
  const query = useQuery({
    queryKey: ["campus", "notifications", "inbox", cursor],
    queryFn: ({ signal }) => inbox.list(20, cursor, signal),
    placeholderData: keepPreviousData,
    ...refresh,
    refetchInterval: cursor ? false : 30000,
  });
  const unread = useUnreadNotifications(),
    read = useReadNotifications();
  return (
    <div className="notifications-page">
      <BackLink href="/" />
      <PageHeader title={t("notifications")} subtitle={t("notificationsSubtitle")} />
      <div className="inbox-toolbar">
        <span>{t("unreadNotifications", { count: unread.data?.count ?? 0 })}</span>
        <button
          className="button secondary compact"
          disabled={!unread.data?.count || read.isPending || !query.data?.data.length}
          onClick={() => read.mutate({ through: unread.data?.asOf })}
        >
          <CheckCheck size={17} />
          {t("markAllRead")}
        </button>
        {query.isFetching && !query.isPending && (
          <LoaderCircle className="pending-icon" size={16} aria-label={t("updatingResults")} />
        )}
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState retry={query.refetch} />
      ) : query.data.data.length ? (
        <div className="notification-list">
          {query.data.data.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              pending={read.isPending}
              onRead={(id) => read.mutate({ id })}
            />
          ))}
        </div>
      ) : (
        <EmptyState message={t("notificationsEmpty")} hint={t("notificationsEmptyHint")} />
      )}
      <div className="pagination">
        <button
          className="button secondary compact"
          disabled={cursors.length === 1 || query.isPlaceholderData}
          onClick={() => setCursors((old) => old.slice(0, -1))}
        >
          {t("previous")}
        </button>
        <span>{t("page", { page: cursors.length })}</span>
        <button
          className="button secondary compact"
          disabled={!query.data?.nextCursor || query.isPlaceholderData}
          onClick={() => {
            const next = query.data?.nextCursor;
            if (next) setCursors((old) => [...old, next]);
          }}
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}
