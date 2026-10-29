"use client";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Pencil, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { campus, type Photo, type Profile } from "@/lib/campus-api";
import { useFeedback } from "./shared";

export function ProfileAvatar({
  profile,
  large = false,
}: {
  profile: Pick<Profile, "avatar" | "displayName">;
  large?: boolean;
}) {
  const t = useTranslations("app");
  return (
    <span className={`profile-avatar ${large ? "large" : ""}`}>
      {profile.avatar ? (
        <Image unoptimized src={profile.avatar.url} alt={t("avatarAlt")} width={96} height={96} />
      ) : profile.displayName ? (
        <bdi>
          {profile.displayName
            .trim()
            .split(/\s+/u)
            .slice(0, 2)
            .map((s) => Array.from(s)[0])
            .join("")
            .toLocaleUpperCase()}
        </bdi>
      ) : (
        <UserRound size={large ? 38 : 29} strokeWidth={1.5} />
      )}
    </span>
  );
}
export function ProfileSummary({
  name,
  avatar,
  subtitle,
  detail,
  action,
}: {
  name: string;
  avatar: Photo | null;
  subtitle: string;
  detail?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="surface profile-summary">
      <ProfileAvatar profile={{ displayName: name, avatar }} />
      <div>
        <h2>
          <bdi>{name}</bdi>
        </h2>
        <p>{subtitle}</p>
        {detail}
      </div>
      {action}
    </section>
  );
}
export function ProfileCard({ profile }: { profile: Profile }) {
  const t = useTranslations("app");
  const [editing, setEditing] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  return (
    <>
      <ProfileSummary
        name={profile.displayName || t("guest")}
        avatar={profile.avatar}
        subtitle={t("profileSupport")}
        action={
          <button
            type="button"
            ref={editButton}
            className="profile-edit"
            aria-label={t("editProfile")}
            onClick={() => setEditing(true)}
          >
            <Pencil size={16} />
          </button>
        }
      />
      {editing && (
        <ProfileEditor
          profile={profile}
          close={() => {
            setEditing(false);
            requestAnimationFrame(() => editButton.current?.focus());
          }}
        />
      )}
    </>
  );
}
function ProfileEditor({ profile, close }: { profile: Profile; close: () => void }) {
  const t = useTranslations("app"),
    feedback = useFeedback(),
    client = useQueryClient();
  const [name, setName] = useState(profile.displayName ?? t("guest"));
  const [avatar, setAvatar] = useState<Photo | null>(profile.avatar);
  const [preview, setPreview] = useState("");
  const [invalid, setInvalid] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const upload = useMutation({ mutationFn: campus.upload, onError: feedback });
  const save = useMutation({
    mutationFn: () =>
      campus.updateProfile({ displayName: name.trim(), avatarMediaId: avatar?.id ?? null }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["campus", "me"] });
      toast.success(t("profileSaved"));
      close();
    },
    onError: feedback,
  });
  const choose = async (file: File | undefined) => {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      toast.error(t("avatarError"));
      return;
    }
    setPreview(URL.createObjectURL(file));
    try {
      setAvatar(await upload.mutateAsync(file));
    } catch {
      setPreview("");
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) close();
      }}
    >
      <DialogContent className="profile-dialog" closeLabel={t("close")}>
        <DialogHeader>
          <DialogTitle>{t("editProfile")}</DialogTitle>
          <DialogDescription>{t("profileEditHint")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length < 2 || name.trim().length > 60) {
              setInvalid(true);
              return;
            }
            save.mutate();
          }}
        >
          <div className="avatar-editor">
            <ProfileAvatar
              large
              profile={{
                displayName: name,
                avatar: preview ? { id: "preview", url: preview } : avatar,
              }}
            />
            <label className="button secondary avatar-upload">
              <Camera size={16} />
              {t("chooseAvatar")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={t("chooseAvatar")}
                disabled={upload.isPending || save.isPending}
                onChange={(e) => {
                  void choose(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {avatar && (
              <button
                type="button"
                className="text-button"
                disabled={upload.isPending || save.isPending}
                onClick={() => {
                  setAvatar(null);
                  setPreview("");
                }}
              >
                {t("removeAvatar")}
              </button>
            )}
            {upload.isPending && <span role="status">{t("uploading")}</span>}
          </div>
          <div className="field">
            <label htmlFor="profile-name">{t("displayName")}</label>
            <input
              id="profile-name"
              value={name}
              maxLength={60}
              autoComplete="nickname"
              dir="auto"
              aria-invalid={invalid}
              aria-describedby="profile-name-hint"
              onChange={(e) => {
                setName(e.target.value);
                setInvalid(false);
              }}
            />
            <small id="profile-name-hint" className={invalid ? "field-error" : ""}>
              {t(invalid ? "nameInvalid" : "nameHint")}
            </small>
          </div>
          <div className="dialog-actions">
            <button
              type="button"
              className="button secondary"
              disabled={save.isPending}
              onClick={close}
            >
              {t("cancel")}
            </button>
            <button className="button primary" disabled={upload.isPending || save.isPending}>
              {t(save.isPending ? "saving" : "save")}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
