"use client";
import { api } from "./api/client";
import { ensureSession } from "./campus-api";
export interface InboxCursor {
  before: string;
  cursor: string;
}
export interface Notification {
  id: string;
  type: "UPVOTE" | "ACCEPTED" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
  actorKind: "REPORTER" | "STAFF";
  actorDisplayName: string | null;
  reportId: string;
  reportTitle: string;
  createdAt: string;
  readAt: string | null;
  note: string | null;
}
export interface InboxPage {
  data: Notification[];
  nextCursor: InboxCursor | null;
}
const mutation = { headers: { "X-CampusFix-Request": "1" }, withCredentials: true };
export const inbox = {
  list: async (limit = 20, cursor?: InboxCursor, signal?: AbortSignal) => {
    await ensureSession();
    return (await api.get<InboxPage>("/notifications", { params: { limit, ...cursor }, signal }))
      .data;
  },
  unread: async () => {
    await ensureSession();
    return (await api.get<{ count: number; asOf: string }>("/notifications/unread-count")).data;
  },
  read: async (id: string) =>
    (await api.patch<Notification>("/notifications/" + id + "/read", {}, mutation)).data,
  readAll: async (through: string) =>
    (await api.patch("/notifications/read-all", { through }, mutation)).data,
};

export type AnalyticsDays = 7 | 30 | 90;
export interface Analytics {
  period: { days: AnalyticsDays; start: string; end: string; timeZone: string };
  currentOpen: number;
  resolved: number;
  totalReports: number;
  totalUpvotes: number;
  averageResolutionMs: number | null;
  averageWaitingMs: number | null;
  resolutionSamples: number;
  waitingSamples: number;
  trends: { date: string; reports: number; resolutions: number }[];
  locations: { id: string; name: string; count: number }[];
  issues: { id: string; code: string; labelEn: string; labelEs: string; count: number }[];
  hotspots: {
    id: string;
    name: string;
    count: number;
    leadingGroup: { code: string; labelEn: string; labelEs: string; count: number };
  }[];
  attention: {
    id: string;
    title: string;
    location: string;
    status: "REPORTED" | "ACCEPTED" | "IN_PROGRESS";
    createdAt: string;
    confirmationCount: number;
    reasons: ("oldest" | "confirmed" | "waiting")[];
  }[];
}

export async function analytics(days: AnalyticsDays, signal?: AbortSignal) {
  return (await api.get<Analytics>("/staff/analytics", { params: { days }, signal })).data;
}
