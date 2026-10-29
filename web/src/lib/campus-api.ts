"use client";
import { api } from "@/lib/api/client";
export const categories = [
  "ELECTRICAL",
  "PLUMBING",
  "FURNITURE",
  "IT",
  "CLEANING",
  "SAFETY",
  "OTHER",
] as const;
export type Category = (typeof categories)[number];
export type Status = "REPORTED" | "ACCEPTED" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
export interface Location {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
}
export interface Photo {
  id: string;
  url: string;
}
export interface IssueType {
  id: string;
  code: string;
  labelEn: string;
  labelEs: string;
  groupId: string;
}
export interface IssueGroup {
  id: string;
  code: string;
  labelEn: string;
  labelEs: string;
  types: IssueType[];
}
export interface Report {
  id: string;
  reference: string;
  title: string;
  description: string;
  category: Category;
  exactLocation: string;
  status: Status;
  version: number;
  issueTypeId: string;
  issueType: IssueType;
  customIssueName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  location: Location;
  photos: Photo[];
  history: { id: string; status: Status; note: string; createdAt: string }[];
  confirmationCount: number;
  isMine: boolean;
  confirmed: boolean;
  canEdit: boolean;
}
export interface ReportPage {
  data: Report[];
  total: number;
  page: number;
  limit: number;
}
export interface Summary {
  counts: Record<Status, number>;
  days: { date: string; count: number }[];
}
export interface ReportInput {
  title: string;
  description: string;
  category: Category;
  locationId: string;
  exactLocation: string;
  issueGroupId: string;
  attachmentIds: string[];
  issueTypeId: string;
  customIssueName: string;
}
export interface Profile {
  displayName: string | null;
  avatar: Photo | null;
  alias: string;
  createdAt: string;
  reportCount: number;
  linkedSessions: number;
  sessions: { id: string; current: boolean; createdAt: string }[];
}
export interface LinkState {
  requestId: string;
  state: string;
  canConfirm?: boolean;
  expiresAt: string;
  code?: string;
}
export interface Similar {
  report: Report;
  score: number;
  reasons: string[];
}
export interface StaffProfile {
  displayName: string;
  email: string;
  open: number;
  resolved: number;
  recent: Report[];
}
const mutation = { headers: { "X-CampusFix-Request": "1" }, withCredentials: true };
let session: Promise<unknown> | undefined;
export function ensureSession() {
  session ??= api.post("/anonymous/session", {}, mutation).catch((error) => {
    session = undefined;
    throw error;
  });
  return session;
}
export const campus = {
  updateProfile: async (input: { displayName: string; avatarMediaId: string | null }) => {
    await ensureSession();
    return (await api.patch<Profile>("/anonymous/me", input, mutation)).data;
  },
  locations: async () => (await api.get<Location[]>("/locations")).data,
  groups: async () => (await api.get<IssueGroup[]>("/issue-groups")).data,
  summary: async () => (await api.get<Summary>("/summary")).data,
  me: async () => {
    await ensureSession();
    return (await api.get<Profile>("/anonymous/me")).data;
  },
  reports: async (params: Record<string, string | number> = {}, signal?: AbortSignal) => {
    await ensureSession();
    return (await api.get<ReportPage>("/reports", { params, signal })).data;
  },
  report: async (id: string) => {
    await ensureSession();
    return (await api.get<Report>("/reports/" + id)).data;
  },
  create: async (
    input: ReportInput & { idempotencyKey?: string; duplicateAcknowledged?: boolean },
  ) => {
    await ensureSession();
    const { idempotencyKey, duplicateAcknowledged, ...fields } = input;
    return (
      await api.post<Report>(
        "/reports",
        {
          ...fields,
          idempotencyKey: idempotencyKey ?? crypto.randomUUID(),
          duplicateAcknowledged: duplicateAcknowledged ?? false,
        },
        mutation,
      )
    ).data;
  },
  edit: async (
    id: string,
    input: {
      title: string;
      description: string;
      exactLocation: string;
      version: number;
      locationId?: string;
      issueGroupId?: string;
      issueTypeId?: string;
      category?: Category;
      customIssueName?: string;
      attachmentIds?: string[];
    },
  ) => (await api.patch<Report>("/reports/" + id, input, mutation)).data,
  confirm: async (id: string, remove = false) => {
    await ensureSession();
    return (
      remove
        ? await api.delete<Report>("/reports/" + id + "/vote", mutation)
        : await api.post<Report>("/reports/" + id + "/vote", {}, mutation)
    ).data;
  },
  similar: async (
    {
      title,
      description,
      locationId,
      issueTypeId,
      exactLocation,
    }: Pick<ReportInput, "title" | "description" | "locationId" | "issueTypeId" | "exactLocation">,
    signal?: AbortSignal,
  ) =>
    (
      await api.post<Similar[]>(
        "/reports/similar",
        {
          title,
          locationId,
          issueTypeId,
          ...(description.trim().length >= 10 ? { description } : {}),
          ...(exactLocation.trim().length >= 3 ? { exactLocation } : {}),
        },
        { ...mutation, signal },
      )
    ).data,
  upload: async (file: File) => {
    await ensureSession();
    const data = new FormData();
    data.append("photo", file);
    return (await api.post<Photo>("/media", data, mutation)).data;
  },
  staff: async () =>
    (await api.get<{ staff: { displayName: string; email: string } | null }>("/staff/session"))
      .data,
  staffMe: async () => (await api.get<StaffProfile>("/staff/me")).data,
  queue: async (
    params: Record<string, string | number> = {},
    resolved = false,
    signal?: AbortSignal,
  ) =>
    (
      await api.get<ReportPage>(resolved ? "/staff/resolved" : "/staff/requests", {
        params,
        signal,
      })
    ).data,
  workbench: async (id: string) =>
    (await api.get<Report & { similar: Similar[] }>("/staff/requests/" + id)).data,
  login: async (input: { username: string; password: string }) =>
    (await api.post("/staff/login", input, mutation)).data,
  logout: async () => (await api.post("/staff/logout", {}, mutation)).data,
  status: async (id: string, status: Status, note: string, version: number) =>
    (
      await api.post<Report>(
        "/staff/requests/" + id + "/status",
        { status, note, version },
        mutation,
      )
    ).data,
  linkStart: async () => (await api.post<LinkState>("/anonymous/link/start", {}, mutation)).data,
  linkRequest: async (code: string) =>
    (await api.post<LinkState>("/anonymous/link/request", { code }, mutation)).data,
  linkStatus: async (id: string) => (await api.get<LinkState>("/anonymous/link/status/" + id)).data,
  linkConfirm: async (requestId: string) =>
    (await api.post("/anonymous/link/confirm", { requestId }, mutation)).data,
  linkCancel: async (requestId: string) =>
    (await api.post("/anonymous/link/cancel", { requestId }, mutation)).data,
  revoke: async (id: string) =>
    (await api.post("/anonymous/sessions/" + id + "/revoke", {}, mutation)).data,
};
