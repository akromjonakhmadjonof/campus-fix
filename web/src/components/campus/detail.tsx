"use client";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { reportReturnPath } from "@/lib/report-filters";
import { updateReportCache } from "@/lib/report-cache";
import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ReportForm } from "./report-form";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, Clock3, MapPin, Pencil, Wrench } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { campus, type Report, type Status } from "@/lib/campus-api";
import { useTaxonomyLabel } from "./taxonomy-label";
import {
  BackLink,
  PageHeader,
  RecentReport,
  ConfirmButton,
  ErrorState,
  LoadingState,
  StatusBadge,
  useFeedback,
} from "./shared";
function StaffAction({ report }: { report: Report }) {
  const t = useTranslations("app");
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const client = useQueryClient();
  const feedback = useFeedback();
  const next: Status =
    report.status === "REPORTED"
      ? "ACCEPTED"
      : report.status === "ACCEPTED"
        ? "IN_PROGRESS"
        : "RESOLVED";
  const change = useMutation({
    mutationFn: (target: Status) => campus.status(report.id, target, note.trim(), report.version),
    onSuccess: (updated) => {
      setNote("");
      setRejecting(false);
      updateReportCache(client, updated);
      toast.success(t("statusUpdated"));
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        void client.invalidateQueries({ queryKey: ["campus", "report", report.id] });
        toast.error(t("staffConflict"));
      } else feedback(error);
    },
  });
  if (report.status === "RESOLVED" || report.status === "REJECTED") return null;
  return (
    <>
      <form
        className="surface staff-action"
        onSubmit={(e) => {
          e.preventDefault();
          if (note.trim().length < 3) {
            toast.error(t("noteRequired"));
            return;
          }
          change.mutate(next);
        }}
      >
        <h2>{t("maintenance")}</h2>
        <p className="staff-action-hint">{t("staffActionHint")}</p>
        <label htmlFor="status-note">{t("statusNote")}</label>
        <Textarea
          id="status-note"
          rows={3}
          value={note}
          maxLength={500}
          placeholder={t("statusNotePlaceholder")}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="button primary" disabled={change.isPending || note.trim().length < 3}>
          {t(
            change.isPending
              ? "savingStatus"
              : next === "ACCEPTED"
                ? "accept"
                : next === "IN_PROGRESS"
                  ? "startWork"
                  : "resolve",
          )}
        </button>
        {["REPORTED", "ACCEPTED"].includes(report.status) && (
          <button
            type="button"
            className="button secondary"
            disabled={change.isPending}
            onClick={() => setRejecting(true)}
          >
            {t("reject")}
          </button>
        )}
      </form>
      <Dialog
        open={rejecting}
        onOpenChange={(open) => {
          if (!change.isPending) setRejecting(open);
        }}
      >
        <DialogContent closeLabel={t("close")} className="staff-reject-dialog">
          <DialogHeader>
            <DialogTitle>{t("rejectConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("rejectConfirmHint")}</DialogDescription>
          </DialogHeader>
          <p className="rejection-report-title">{report.title}</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (note.trim().length >= 3 && !change.isPending) change.mutate("REJECTED");
            }}
          >
            <label htmlFor="reject-note">{t("statusNote")}</label>
            <Textarea
              id="reject-note"
              autoFocus
              aria-required="true"
              minLength={3}
              maxLength={500}
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <div className="inline-actions">
              <button
                type="button"
                className="button secondary"
                disabled={change.isPending}
                onClick={() => setRejecting(false)}
              >
                {t("cancel")}
              </button>
              <button
                className="button danger"
                disabled={change.isPending || note.trim().length < 3}
              >
                {t(change.isPending ? "savingStatus" : "rejectConfirmAction")}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function ReportDetail({
  id,
  staffView = false,
  edit = false,
}: {
  id: string;
  staffView?: boolean;
  edit?: boolean;
}) {
  const t = useTranslations("app");
  const params = useSearchParams();
  const format = useFormatter();
  const label = useTaxonomyLabel();
  const [editing, setEditing] = useState(edit);
  const [photoIndex, setPhotoIndex] = useState(0);
  const query = useQuery({
    queryKey: ["campus", "report", id, staffView],
    queryFn: () => (staffView ? campus.workbench(id) : campus.report(id)),
  });
  const staff = useQuery({ queryKey: ["campus", "staff"], queryFn: campus.staff });
  const header = (
    <>
      <BackLink href={reportReturnPath(params.get("from"), staffView)} />
      <PageHeader
        title={t(edit ? "edit" : "reportDetailsTitle")}
        subtitle={t("reportDetailsSubtitle")}
      />
    </>
  );
  if (query.isPending)
    return (
      <>
        {header}
        <LoadingState />
      </>
    );
  if (query.isError)
    return (
      <>
        {header}
        <ErrorState retry={query.refetch} />
      </>
    );
  const report = query.data;
  if (edit && !report.canEdit)
    return (
      <>
        {header}
        <div role="alert">{t("noPermission")}</div>
      </>
    );
  return (
    <div className="detail-page">
      {header}
      <div className="detail-grid">
        <div>
          {report.photos.length > 0 && (
            <>
              <div className="detail-photo">
                <Image
                  unoptimized
                  width={1200}
                  height={800}
                  src={(report.photos[photoIndex] ?? report.photos[0]).url}
                  alt={t("reportPhoto", { title: report.title })}
                />
              </div>
              {report.photos.length > 1 && (
                <div className="detail-thumbnails">
                  {report.photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      type="button"
                      aria-label={t("photoNumber", {
                        number: index + 1,
                        count: report.photos.length,
                      })}
                      aria-pressed={photoIndex === index}
                      onClick={() => setPhotoIndex(index)}
                    >
                      <Image unoptimized width={96} height={72} src={photo.url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="detail-heading">
            <StatusBadge status={report.status} />
            <h2 className="report-title">{report.title}</h2>
            <p>
              <MapPin size={15} />
              {report.location.path}
            </p>
            <small>
              {t("reportedOn", {
                date: format.dateTime(new Date(report.createdAt), {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              })}
            </small>
            {report.isMine && (
              <span className="soft-pill">
                <Check size={13} />
                {t("youReported")}
              </span>
            )}
          </div>
          {editing && report.canEdit ? (
            <ReportForm embedded report={report} onSaved={() => setEditing(false)} />
          ) : (
            <section className="surface detail-description">
              <div className="section-heading">
                <h2>{t("descriptionHeading")}</h2>
                {report.canEdit && (
                  <button className="text-button" onClick={() => setEditing(true)}>
                    <Pencil size={14} />
                    {t("edit")}
                  </button>
                )}
              </div>
              <p>{report.description}</p>
              <h3>{t("issueType")}</h3>
              <p>{report.customIssueName || label(report.issueType)}</p>
              <h3>{t("exactHeading")}</h3>
              <p>{report.exactLocation}</p>
            </section>
          )}
        </div>
        <div className="detail-aside">
          <section className="surface timeline-card">
            <h2>{t("timeline")}</h2>
            {report.status === "REJECTED" ? (
              <div className="rejected-banner">
                <StatusBadge status="REJECTED" />
                <p>{report.history.find((h) => h.status === "REJECTED")?.note}</p>
                {report.history
                  .filter((h) => h.status === "REJECTED")
                  .map((event) => (
                    <time key={event.id} dateTime={event.createdAt}>
                      {event.actorDisplayName && (
                        <span className="timeline-actor">
                          {t("actionBy", { name: event.actorDisplayName })}
                        </span>
                      )}
                      {format.dateTime(new Date(event.createdAt), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  ))}
              </div>
            ) : (
              <progress
                aria-label={t("progress")}
                max={3}
                value={["REPORTED", "ACCEPTED", "IN_PROGRESS", "RESOLVED"].indexOf(report.status)}
              />
            )}

            <ol>
              {(["REPORTED", "ACCEPTED", "IN_PROGRESS", "RESOLVED"] as const).map(
                (status, index) => {
                  const change = report.history.find((h) => h.status === status);
                  const Icon = index === 0 ? Clock3 : index === 1 ? Wrench : CheckCircle2;
                  return (
                    <li
                      key={status}
                      className={`${change ? "complete" : ""} ${report.status === status ? "current" : ""}`}
                    >
                      <span>
                        <Icon size={16} />
                      </span>
                      <div>
                        <strong>{t(`statuses.${status}`)}</strong>
                        {change && (
                          <>
                            <small>
                              {format.dateTime(new Date(change.createdAt), {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </small>
                            {change.actorDisplayName && (
                              <p className="timeline-actor">
                                {t("actionBy", { name: change.actorDisplayName })}
                              </p>
                            )}
                            {change.note && <p>{change.note}</p>}
                          </>
                        )}
                      </div>
                    </li>
                  );
                },
              )}
            </ol>
          </section>
          <section className="surface confirmation-card">
            <h2>{t("confirmations", { count: report.confirmationCount })}</h2>
            {!staffView && !staff.data?.staff && (
              <>
                <p>{t("helpConfirm")}</p>
                <ConfirmButton report={report} />
              </>
            )}
          </section>
          {staffView && staff.data?.staff && <StaffAction report={report} />}
          {staffView && "similar" in report && (
            <section className="staff-related">
              <h2>{t("possibleMatch")}</h2>
              {(report as Report & { similar: import("@/lib/campus-api").Similar[] }).similar
                .length ? (
                <div className="recent-list">
                  {(
                    report as Report & { similar: import("@/lib/campus-api").Similar[] }
                  ).similar.map((match) => (
                    <div key={match.report.id}>
                      <RecentReport
                        report={match.report}
                        href={`/staff/requests/${match.report.id}`}
                      />
                      <p className="duplicate-reasons">
                        {match.reasons.map((reason) => t(reason as "same_location")).join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="section-context">{t("noSimilar")}</p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
