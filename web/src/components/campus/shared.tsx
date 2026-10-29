"use client";
import Image from "next/image";
import { useFormatter, useTranslations, useNow } from "next-intl";
import {
  ArrowLeft,
  AlertCircle,
  Check,
  ChevronRight,
  Clock3,
  Droplets,
  Laptop,
  Lightbulb,
  MessageSquare,
  ShieldAlert,
  Sofa,
  Sparkles,
  ThumbsUp,
  Wrench,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ReactNode, Ref } from "react";
import { usePathname } from "@/i18n/navigation";
import { NavigationLink as Link } from "@/components/navigation-link";
import { campus, type Category, type Location, type Report, type Status } from "@/lib/campus-api";
import { updateReportCache } from "@/lib/report-cache";
import { Choice } from "./choice";
import { useTaxonomyLabel } from "./taxonomy-label";
import { ApiError } from "@/lib/api/client";
export const categoryIcons = {
  ELECTRICAL: Lightbulb,
  PLUMBING: Droplets,
  FURNITURE: Sofa,
  IT: Laptop,
  CLEANING: Sparkles,
  SAFETY: ShieldAlert,
  OTHER: Wrench,
};
export function useFeedback() {
  const t = useTranslations("app");
  return (error: unknown) =>
    toast.error(
      error instanceof ApiError && error.status === 429
        ? t("rateLimited")
        : error instanceof ApiError && error.status === 401
          ? t("sessionExpired")
          : t("error"),
    );
}
export function BrandShield() {
  const t = useTranslations("app");
  return (
    <Image
      className="brand-shield"
      src="/brand/penn-state-shield.svg"
      alt={t("shieldAlt")}
      width={42}
      height={46}
      priority
    />
  );
}
export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="page-heading">
      <BrandShield />
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}
export function BackLink({ href, onClick }: { href?: string; onClick?: () => void }) {
  const t = useTranslations("app");
  return (
    <div className="back-row">
      {href ? (
        <Link href={href} className="back-control" aria-label={t("back")}>
          <ArrowLeft size={18} className="directional" />
          <span>{t("back")}</span>
        </Link>
      ) : (
        <button type="button" className="back-control" onClick={onClick} aria-label={t("back")}>
          <ArrowLeft size={18} className="directional" />
          <span>{t("back")}</span>
        </button>
      )}
    </div>
  );
}
export function SectionHeader({ title, href }: { title: string; href?: string }) {
  const t = useTranslations("app");
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {href && (
        <Link href={href}>
          {t("seeAll")}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  const t = useTranslations("app");
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <span />
      {t(`statuses.${status}`)}
    </span>
  );
}
export function CategoryIcon({ category }: { category: Category }) {
  const Icon = categoryIcons[category];
  return (
    <span className={`category-icon category-${category.toLowerCase()}`}>
      <Icon size={18} />
    </span>
  );
}
export function Time({ date }: { date: string }) {
  const format = useFormatter();
  const now = useNow({ updateInterval: 60000 });
  return <time dateTime={date}>{format.relativeTime(new Date(date), now)}</time>;
}
export function LoadingState() {
  const t = useTranslations("app");
  return (
    <div aria-label={t("loading")} role="status" className="loading-grid">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card">
          <div />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
export function EmptyState({
  message,
  hint,
  action,
}: {
  message?: string;
  hint?: string;
  action?: ReactNode;
}) {
  const t = useTranslations("app");
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <MessageSquare size={25} />
      </span>
      <h3>{message ?? t("empty")}</h3>
      <p>{hint ?? t("emptyHint")}</p>
      {action}
    </div>
  );
}
export function ErrorState({ retry }: { retry: () => unknown }) {
  const t = useTranslations("app");
  return (
    <div className="empty-state" role="alert">
      <AlertCircle size={24} />
      <p>{t("error")}</p>
      <button className="button secondary" onClick={() => retry()}>
        {t("retry")}
      </button>
    </div>
  );
}
export function ConfirmButton({ report, compact = false }: { report: Report; compact?: boolean }) {
  const t = useTranslations("app");
  const client = useQueryClient();
  const feedback = useFeedback();
  const confirm = useMutation({
    mutationFn: (remove: boolean) => campus.confirm(report.id, remove),
    onSuccess: (updated) => {
      updateReportCache(client, updated);
      toast.success(t("confirmedSuccess"));
    },
    onError: feedback,
  });
  const current = confirm.data ?? report;
  return (
    <button
      className={`button secondary ${compact ? "compact" : ""} ${current.confirmed ? "confirmed" : ""}`}
      onClick={() => confirm.mutate(current.confirmed)}
      disabled={report.isMine || confirm.isPending}
      aria-label={current.confirmed ? t("undoVote") : t("confirm")}
    >
      {current.confirmed ? <Check size={15} /> : <ThumbsUp size={15} />}
      <span>
        {compact ? current.confirmationCount : current.confirmed ? t("undoVote") : t("confirm")}
      </span>
    </button>
  );
}
export function IssueCard({
  report,
  returnTo,
  resolved = false,
}: {
  report: Report;
  returnTo?: string;
  resolved?: boolean;
}) {
  const path = usePathname();
  const label = useTaxonomyLabel(),
    format = useFormatter();
  const worker = useQuery({ queryKey: ["campus", "staff"], queryFn: campus.staff });
  const staff = path.startsWith("/staff") || !!worker.data?.staff;
  const base = staff ? `/staff/requests/${report.id}` : `/reports/${report.id}`;
  const destination = base + (returnTo ? "?from=" + encodeURIComponent(returnTo) : "");
  const t = useTranslations("app");
  return (
    <article className="issue-card">
      <Link href={destination} className="issue-image" aria-label={report.title}>
        {report.photos[0] ? (
          <Image
            unoptimized
            width={160}
            height={160}
            src={report.photos[0].url}
            alt={t("reportPhoto", { title: report.title })}
            loading="lazy"
          />
        ) : (
          <CategoryIcon category={report.category} />
        )}
      </Link>
      <div className="issue-card-content">
        <div className="issue-title-row">
          <h3>
            <Link href={destination}>{report.title}</Link>
          </h3>
          <StatusBadge status={report.status} />
        </div>
        <p className="location-line" title={report.location.path}>
          <bdi>{report.location.name}</bdi>
          {report.isMine && <span className="mine-label">{t("youReported")}</span>}
        </p>
        {staff && <p className="issue-taxonomy">{label(report.issueType)}</p>}
        <p className="issue-excerpt">{report.description}</p>
        <div className="card-meta">
          {staff ? (
            <span>
              <ThumbsUp size={14} />
              {report.confirmationCount}
            </span>
          ) : (
            <ConfirmButton report={report} compact />
          )}
          <span>
            <Clock3 size={13} />
            {resolved && report.resolvedAt ? (
              <time dateTime={report.resolvedAt} aria-label={t("resolvedDate")}>
                {format.dateTime(new Date(report.resolvedAt), { dateStyle: "medium" })}
              </time>
            ) : (
              <Time date={report.createdAt} />
            )}
          </span>
        </div>
      </div>
    </article>
  );
}
export function RecentReport({
  report,
  href,
  resolved = false,
}: {
  report: Report;
  href?: string;
  resolved?: boolean;
}) {
  const t = useTranslations("app"),
    format = useFormatter();
  return (
    <Link href={href ?? `/reports/${report.id}`} className="recent-row">
      <span className="recent-thumbnail">
        {report.photos[0] ? (
          <Image
            unoptimized
            width={72}
            height={72}
            src={report.photos[0].url}
            alt={t("reportPhoto", { title: report.title })}
          />
        ) : (
          <CategoryIcon category={report.category} />
        )}
      </span>
      <div>
        <h3>{report.title}</h3>
        <p title={report.location.path}>
          <bdi>{report.location.name}</bdi>
        </p>
        <div className="recent-footer">
          <span>
            <Clock3 size={12} />
            {resolved ? (
              report.resolvedAt && (
                <time dateTime={report.resolvedAt} aria-label={t("resolvedDate")}>
                  {format.dateTime(new Date(report.resolvedAt), { dateStyle: "medium" })}
                </time>
              )
            ) : (
              <Time date={report.createdAt} />
            )}
          </span>
          <StatusBadge status={report.status} />
        </div>
      </div>
    </Link>
  );
}
export function LocationPicker({
  locations,
  value,
  onChange,
  invalid,
  triggerRef,
}: {
  locations: Location[];
  value: string;
  onChange: (id: string) => void;
  invalid?: boolean;
  triggerRef?: Ref<HTMLButtonElement>;
}) {
  const t = useTranslations("app");
  const chain: Location[] = [];
  let current = locations.find((l) => l.id === value);
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.unshift(current);
    current = locations.find((l) => l.id === current?.parentId);
  }
  const levels: [Location | undefined, Location[]][] = [
    [undefined, locations.filter((l) => !l.parentId)],
  ];
  for (const parent of chain) {
    const children = locations.filter((l) => l.parentId === parent.id);
    if (children.length) levels.push([parent, children]);
  }
  return (
    <div className="location-picker">
      {levels.map(([parent, children], index) => (
        <Choice
          key={parent?.id ?? "root"}
          id={index === 0 ? "report-location" : undefined}
          invalid={index === 0 ? invalid : undefined}
          required={index === 0}
          describedBy={index === 0 ? "report-location-error" : undefined}
          triggerRef={index === 0 ? triggerRef : undefined}
          label={index === 0 ? t("location") : t("subLocation")}
          value={chain[index]?.id ?? ""}
          onValueChange={(id) => onChange(id || parent?.id || "")}
          options={[
            { value: "", label: parent ? t("thisLevel") : t("chooseLocation") },
            ...children.map((l) => ({ value: l.id, label: l.name })),
          ]}
        />
      ))}
    </div>
  );
}
