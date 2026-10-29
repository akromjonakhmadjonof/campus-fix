"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, MapPin, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/hooks/use-router";
import { campus, categories, type ReportInput, type Report, type Similar } from "@/lib/campus-api";
import { updateReportCache } from "@/lib/report-cache";
import { Textarea } from "@/components/ui/textarea";
import { Choice } from "./choice";
import { useTaxonomyLabel } from "./taxonomy-label";
import { BackLink, ErrorState, IssueCard, LocationPicker, PageHeader, useFeedback } from "./shared";
export function ReportForm({
  report,
  onSaved,
  embedded = false,
}: { report?: Report; onSaved?: () => void; embedded?: boolean } = {}) {
  const t = useTranslations("app");
  const label = useTaxonomyLabel();
  const groups = useQuery({ queryKey: ["campus", "groups"], queryFn: campus.groups });
  const [suggestions, setSuggestions] = useState<{
    key: string;
    pending: boolean;
    matches: Similar[];
  }>({ key: "", pending: false, matches: [] });
  const requestKey = useRef(crypto.randomUUID());
  const router = useRouter();
  const client = useQueryClient();
  const feedback = useFeedback();
  const schema = z.object({
    title: z
      .string()
      .trim()
      .min(3, t("titleInvalid"))
      .max(120, t("titleInvalid"))
      .regex(/[\p{L}\p{N}]/u, t("titleInvalid")),
    description: z
      .string()
      .trim()
      .min(10, t("descriptionInvalid"))
      .max(4000, t("descriptionInvalid"))
      .regex(/[\p{L}\p{N}]/u, t("descriptionInvalid")),
    category: z.enum(categories),
    locationId: z.string().min(1, t("required")),
    exactLocation: z
      .string()
      .trim()
      .min(3, t("exactInvalid"))
      .max(300, t("exactInvalid"))
      .regex(/[\p{L}\p{N}]/u, t("exactInvalid")),
    issueGroupId: z.string().uuid(t("groupRequired")),
    attachmentIds: z.array(z.string().uuid()).min(1, t("photoRequired")).max(3, t("photoLimit")),
    issueTypeId: z.string().uuid(t("required")),
    customIssueName: z.string().max(120),
  });
  const form = useForm<ReportInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: report?.title ?? "",
      description: report?.description ?? "",
      category: report?.category ?? "OTHER",
      locationId: report?.location.id ?? "",
      exactLocation: report?.exactLocation ?? "",
      issueGroupId: report?.issueType.groupId ?? "",
      attachmentIds: report?.photos.map((p) => p.id) ?? [],
      issueTypeId: report?.issueTypeId ?? "",
      customIssueName: report?.customIssueName ?? "",
    },
  });
  const values = useWatch({ control: form.control });
  const groupId = useWatch({ control: form.control, name: "issueGroupId" });
  const locationId = useWatch({ control: form.control, name: "locationId" });
  const locations = useQuery({
    queryKey: ["campus", "locations"],
    queryFn: campus.locations,
    staleTime: 3600000,
  });
  const [preview, setPreview] = useState("");
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>(report?.photos ?? []);
  const [review, setReview] = useState<{ input: ReportInput; reports: Report[] } | null>(null);
  const [checking, setChecking] = useState(false);
  const duplicateInput = JSON.stringify({
    title: values.title ?? "",
    description: values.description ?? "",
    exactLocation: values.exactLocation ?? "",
    locationId: values.locationId ?? "",
    issueTypeId: values.issueTypeId ?? "",
  });
  const eligible =
    !!values.locationId && !!values.issueTypeId && (values.title?.trim().length ?? 0) >= 3;
  const matches = eligible && suggestions.key === duplicateInput ? suggestions.matches : [];
  const suggesting = eligible && suggestions.key === duplicateInput && suggestions.pending;
  useEffect(() => {
    if (!eligible) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setSuggestions({ key: duplicateInput, pending: true, matches: [] });
      const input = JSON.parse(duplicateInput) as Pick<
        ReportInput,
        "title" | "description" | "exactLocation" | "locationId" | "issueTypeId"
      >;
      void campus
        .similar(input, abort.signal)
        .then((matches) => {
          if (!abort.signal.aborted)
            setSuggestions({ key: duplicateInput, pending: false, matches });
        })
        .catch(() => {
          if (!abort.signal.aborted)
            setSuggestions({ key: duplicateInput, pending: false, matches: [] });
        });
    }, 450);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [duplicateInput, eligible]);
  const submitted = useRef(false);
  const uploadRevision = useRef(0);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const upload = useMutation({ mutationFn: campus.upload, onError: feedback });
  const create = useMutation({
    mutationFn: (input: ReportInput) =>
      report
        ? campus.edit(report.id, {
            title: input.title,
            description: input.description,
            exactLocation: input.exactLocation,
            locationId: input.locationId,
            issueGroupId: input.issueGroupId,
            issueTypeId: input.issueTypeId,
            category: input.category,
            customIssueName: input.customIssueName,
            attachmentIds: photos.map((p) => p.id),
            version: report.version,
          })
        : campus.create({
            ...input,
            attachmentIds: photos.map((p) => p.id),
            idempotencyKey: requestKey.current,
            duplicateAcknowledged: true,
          }),
    onSuccess: (report) => {
      updateReportCache(client, report);
      void client.invalidateQueries({ queryKey: ["campus", "me"] });
      toast.success(t("submitted"));
      if (onSaved) onSaved();
      else router.push(`/reports/${report.id}`);
    },
    onError: (error) => {
      submitted.current = false;
      feedback(error);
    },
  });
  const choose = async (file: File | undefined) => {
    if (!file || upload.isPending) return;
    if (photos.length >= 3) {
      form.setError("attachmentIds", { message: t("photoLimit") });
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      form.setError("attachmentIds", { message: t("photoError") });
      toast.error(t("photoError"));
      return;
    }
    const revision = ++uploadRevision.current;
    setPreview(URL.createObjectURL(file));
    try {
      const photo = await upload.mutateAsync(file);
      if (revision === uploadRevision.current) {
        form.setValue("attachmentIds", [...photos.map((p) => p.id), photo.id], {
          shouldValidate: true,
        });
        setPhotos((old) => [...old, photo]);
        setPreview("");
      }
    } catch {
      setPreview("");
      form.setError("attachmentIds", { message: t("photoError") });
    }
  };
  const check = form.handleSubmit(
    async (input) => {
      if (
        !groups.data
          ?.find((group) => group.id === input.issueGroupId)
          ?.types.some((type) => type.id === input.issueTypeId)
      ) {
        form.setError("issueTypeId", { message: t("required") }, { shouldFocus: true });
        return;
      }
      if (
        groups.data
          ?.flatMap((g) => g.types)
          .find((item) => item.id === input.issueTypeId)
          ?.code.startsWith("other_") &&
        !input.customIssueName.trim()
      ) {
        form.setError("customIssueName", { message: t("required") });
        return;
      }
      if (report) {
        create.mutate(input);
        return;
      }
      setChecking(true);
      try {
        const matches = await campus.similar(input);
        setReview({ input, reports: matches.map((x) => x.report) });
      } catch (error) {
        feedback(error);
      } finally {
        setChecking(false);
      }
    },
    (errors) => {
      toast.error(t("validation"));
      const order = [
        ["title", "report-title"],
        ["description", "report-description"],
        ["issueGroupId", "report-group"],
        ["issueTypeId", "report-type"],
        ["locationId", "report-location"],
        ["exactLocation", "report-exact"],
        ["attachmentIds", "report-photo"],
      ] as const;
      const first = order.find(([key]) => errors[key]);
      if (first)
        requestAnimationFrame(() => {
          const field = document.getElementById(first[1]);
          field?.focus({ preventScroll: true });
          field?.scrollIntoView({ block: "center" });
        });
    },
  );
  if (review)
    return (
      <div className="form-page">
        <BackLink
          onClick={() => {
            if (!create.isPending) setReview(null);
          }}
        />

        <PageHeader title={t("similarTitle")} subtitle={t("similarHint")} />
        {review.reports.length ? (
          <div className="issue-grid review-grid">
            {review.reports.map((report) => (
              <IssueCard report={report} key={report.id} />
            ))}
          </div>
        ) : (
          <div className="surface review-success">
            <CheckCircle2 size={30} />
            <h2>{t("noSimilar")}</h2>
          </div>
        )}
        <div className="surface submission-summary">
          <h2>{review.input.title}</h2>
          <p>{review.input.description}</p>
          <span>
            <MapPin size={15} />
            {locations.data?.find((l) => l.id === review.input.locationId)?.path}
          </span>
        </div>
        <button
          className="button primary full"
          disabled={create.isPending}
          onClick={() => {
            if (submitted.current) return;
            submitted.current = true;
            create.mutate(review.input);
          }}
        >
          {create.isPending
            ? t("saving")
            : review.reports.length
              ? t("differentIssue")
              : t("submit")}
        </button>
      </div>
    );
  return (
    <div className="form-page">
      {!embedded && <BackLink href={report ? `/reports/${report.id}` : "/"} />}
      {!embedded && (
        <PageHeader title={t(report ? "edit" : "newReport")} subtitle={t("describe")} />
      )}
      <form className="surface report-form" onSubmit={check} noValidate>
        <div className="field">
          <label htmlFor="report-title">{t("title")}</label>
          <input
            id="report-title"
            aria-required="true"
            aria-describedby="report-title-error"
            placeholder={t("titlePlaceholder")}
            maxLength={120}
            aria-invalid={!!form.formState.errors.title}
            {...form.register("title")}
          />
          <span id="report-title-error" className="field-error">
            {form.formState.errors.title?.message}
          </span>
        </div>
        <div className="field">
          <label htmlFor="report-description">{t("description")}</label>
          <Textarea
            id="report-description"
            aria-required="true"
            aria-describedby="report-description-error"
            rows={4}
            maxLength={4000}
            placeholder={t("descriptionPlaceholder")}
            aria-invalid={!!form.formState.errors.description}
            {...form.register("description")}
          />
          <span id="report-description-error" className="field-error">
            {form.formState.errors.description?.message}
          </span>
        </div>
        <div className="field">
          <label htmlFor="report-group">{t("issueGroup")}</label>
          {groups.isError ? (
            <ErrorState retry={groups.refetch} />
          ) : (
            <Choice
              id="report-group"
              label={t("issueGroup")}
              value={groupId}
              required
              triggerRef={form.register("issueGroupId").ref}
              invalid={!!form.formState.errors.issueGroupId}
              describedBy="report-group-error"
              onValueChange={(value) => {
                form.setValue("issueGroupId", value, { shouldValidate: true });
                const code = groups.data?.find((g) => g.id === value)?.code;
                form.setValue(
                  "category",
                  (
                    {
                      classroom_furniture: "FURNITURE",
                      it_computing: "IT",
                      plumbing: "PLUMBING",
                      electrical_lighting: "ELECTRICAL",
                      cleaning_safety: "SAFETY",
                    } as Record<string, ReportInput["category"]>
                  )[code ?? ""] ?? "OTHER",
                );
                form.setValue("issueTypeId", "", { shouldValidate: form.formState.isSubmitted });
              }}
              options={[
                { value: "", label: t("issueGroup") },
                ...(groups.data ?? []).map((g) => ({ value: g.id, label: label(g) })),
              ]}
            />
          )}
          <span id="report-group-error" className="field-error">
            {form.formState.errors.issueGroupId?.message}
          </span>
        </div>
        <div className="field">
          <label htmlFor="report-type">{t("issueType")}</label>
          <Choice
            id="report-type"
            label={t("issueType")}
            value={values.issueTypeId ?? ""}
            disabled={!groupId || groups.isPending}
            required
            triggerRef={form.register("issueTypeId").ref}
            describedBy="report-type-error"
            onValueChange={(value) => form.setValue("issueTypeId", value, { shouldValidate: true })}
            invalid={!!form.formState.errors.issueTypeId}
            options={[
              { value: "", label: t("issueType") },
              ...(groups.data?.find((g) => g.id === groupId)?.types ?? []).map((item) => ({
                value: item.id,
                label: label(item),
              })),
            ]}
          />

          <span id="report-type-error" className="field-error">
            {form.formState.errors.issueTypeId?.message}
          </span>
        </div>
        {groups.data
          ?.flatMap((g) => g.types)
          .find((item) => item.id === values.issueTypeId)
          ?.code.startsWith("other_") && (
          <div className="field">
            <label htmlFor="custom-issue">{t("customIssue")}</label>
            <input id="custom-issue" {...form.register("customIssueName")} />
            <span className="field-error">{form.formState.errors.customIssueName?.message}</span>
          </div>
        )}
        <div className="field">
          <label htmlFor="report-location">{t("location")}</label>
          {locations.isError ? (
            <ErrorState retry={locations.refetch} />
          ) : (
            <LocationPicker
              locations={locations.data ?? []}
              invalid={!!form.formState.errors.locationId}
              triggerRef={form.register("locationId").ref}
              value={locationId ?? ""}
              onChange={(id) => form.setValue("locationId", id, { shouldValidate: true })}
            />
          )}
          <span id="report-location-error" className="field-error">
            {form.formState.errors.locationId?.message}
          </span>
          <small>{t("locationHint")}</small>
        </div>
        <div className="field">
          <label htmlFor="report-exact">{t("exactLocation")}</label>
          <input
            id="report-exact"
            aria-required="true"
            aria-describedby="report-exact-error"
            maxLength={300}
            placeholder={t("exactPlaceholder")}
            aria-invalid={!!form.formState.errors.exactLocation}
            {...form.register("exactLocation")}
          />
          <span id="report-exact-error" className="field-error">
            {form.formState.errors.exactLocation?.message}
          </span>
        </div>
        <div className="field">
          <label htmlFor="report-photo">{t("photo")}</label>
          <div className="photo-gallery">
            {photos.map((photo) => (
              <div key={photo.id}>
                <Image
                  src={photo.url}
                  alt={t("photoPreview")}
                  unoptimized
                  width={160}
                  height={120}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t("removePhoto")}
                  onClick={() => {
                    const next = photos.filter((p) => p.id !== photo.id);
                    setPhotos(next);
                    form.setValue(
                      "attachmentIds",
                      next.map((p) => p.id),
                      { shouldValidate: true },
                    );
                  }}
                >
                  <X size={17} />
                </button>
              </div>
            ))}
          </div>
          <div
            className={`photo-input ${preview ? "has-photo" : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void choose(event.dataTransfer.files[0]);
            }}
          >
            {preview ? (
              <Image unoptimized width={1200} height={800} src={preview} alt={t("photoPreview")} />
            ) : (
              <>
                <Camera size={29} />
                <strong>{t("choosePhoto")}</strong>
                <small>{t("photoHint")}</small>
              </>
            )}
            <input
              id="report-photo"
              ref={(element) => form.register("attachmentIds").ref(element)}
              aria-required="true"
              aria-invalid={!!form.formState.errors.attachmentIds}
              aria-describedby="report-photo-error"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label={preview ? t("replacePhoto") : t("choosePhoto")}
              disabled={upload.isPending || photos.length >= 3}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void choose(file);
              }}
            />
            {preview && (
              <button
                type="button"
                className="icon-button remove-photo"
                aria-label={t("removePhoto")}
                onClick={() => {
                  uploadRevision.current++;
                  setPreview("");
                }}
              >
                <X size={17} />
              </button>
            )}
          </div>
          <label className="button secondary camera-choice">
            <Camera size={16} />
            {t("takePhoto")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              aria-label={t("takePhoto")}
              disabled={upload.isPending || photos.length >= 3}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void choose(file);
              }}
            />
          </label>
          {upload.isPending && (
            <small role="status">
              <Upload size={13} /> {t("uploading")}
            </small>
          )}
          <span id="report-photo-error" className="field-error">
            {form.formState.errors.attachmentIds?.message}
          </span>
        </div>
        {(suggesting || matches.length > 0) && (
          <section className="duplicate-panel" aria-live="polite">
            <h2>{t(suggesting ? "duplicateChecking" : "possibleMatch")}</h2>
            {matches.map((m) => (
              <div key={m.report.id}>
                <IssueCard report={m.report} />
                <small>{m.reasons.map((r) => t(r as "same_location")).join(" · ")}</small>
              </div>
            ))}
          </section>
        )}
        <button
          type="submit"
          className="button primary full"
          disabled={
            checking ||
            upload.isPending ||
            create.isPending ||
            locations.isPending ||
            groups.isPending
          }
        >
          {checking ? t("loading") : t(report ? "save" : "review")}
        </button>
      </form>
    </div>
  );
}
