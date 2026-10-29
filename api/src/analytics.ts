import type { PrismaClient } from "./generated/prisma/client.js";

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

/** One PostgreSQL statement gives every series the same MVCC snapshot.
 * See codex/UPDATE_06_METRICS.md for cohort, cycle and calendar definitions.
 */
export async function getAnalytics(
  db: PrismaClient,
  days: AnalyticsDays,
  now = new Date(),
): Promise<Analytics> {
  const [row] = await db.$queryRaw<{ data: Analytics }[]>`
    WITH RECURSIVE
    calendar AS (
      SELECT date_trunc('day', ${now}::timestamptz AT TIME ZONE 'America/New_York') AS end_local
    ), bounds AS (
      SELECT end_local - ${days}::int * INTERVAL '1 day' AS start_local, end_local,
        ((end_local - ${days}::int * INTERVAL '1 day') AT TIME ZONE 'America/New_York') AT TIME ZONE 'UTC' AS start_at,
        (end_local AT TIME ZONE 'America/New_York') AT TIME ZONE 'UTC' AS end_at
      FROM calendar
    ), roots AS (
      SELECT id, id AS root_id, name AS root_name FROM "Location" WHERE "parentId" IS NULL
      UNION ALL
      SELECT l.id, r.root_id, r.root_name FROM "Location" l JOIN roots r ON l."parentId" = r.id
    ), visible AS (
      SELECT * FROM "Report" WHERE "deletedAt" IS NULL
    ), incoming AS (
      SELECT r.* FROM visible r, bounds b WHERE r."createdAt" >= b.start_at AND r."createdAt" < b.end_at
    ), latest_resolution AS (
      SELECT DISTINCT ON (e."reportId") e."reportId", e.id, e."createdAt", r."createdAt" AS reported_at
      FROM "StatusEvent" e JOIN visible r ON r.id = e."reportId", bounds b
      WHERE e.status = 'RESOLVED' AND r.status <> 'REJECTED'
        AND e."createdAt" >= b.start_at AND e."createdAt" < b.end_at AND e."createdAt" >= r."createdAt"
      ORDER BY e."reportId", e."createdAt" DESC, e.id DESC
    ), resolution_cycles AS (
      SELECT e.*, (
        SELECT MAX(s."createdAt") FROM "StatusEvent" s
        WHERE s."reportId" = e."reportId" AND s.status = 'IN_PROGRESS'
          AND s."createdAt" <= e."createdAt" AND s."createdAt" >= e.reported_at
          AND NOT EXISTS (
            SELECT 1 FROM "StatusEvent" t WHERE t."reportId" = e."reportId"
              AND t.status IN ('RESOLVED', 'REJECTED') AND t.id <> e.id
              AND t."createdAt" >= s."createdAt" AND t."createdAt" < e."createdAt"
          )
      ) AS start_at FROM latest_resolution e
    ), first_start AS (
      SELECT e."reportId", MIN(e."createdAt") AS started_at
      FROM "StatusEvent" e JOIN visible r ON r.id = e."reportId"
      WHERE e.status = 'IN_PROGRESS' GROUP BY e."reportId"
    ), waiting AS (
      SELECT r.id, EXTRACT(EPOCH FROM (s.started_at - r."createdAt")) * 1000 AS milliseconds
      FROM first_start s JOIN visible r ON r.id = s."reportId", bounds b
      WHERE s.started_at >= b.start_at AND s.started_at < b.end_at AND s.started_at >= r."createdAt"
    ), report_days AS (
      SELECT (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York')::date AS day, COUNT(*)::int AS count
      FROM incoming GROUP BY day
    ), resolution_days AS (
      SELECT (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York')::date AS day, COUNT(*)::int AS count
      FROM latest_resolution GROUP BY day
    ), days AS (
      SELECT generate_series(start_local, end_local - INTERVAL '1 day', INTERVAL '1 day')::date AS day FROM bounds
    ), location_counts AS (
      SELECT roots.root_id AS id, roots.root_name AS name, COUNT(*)::int AS count
      FROM incoming r JOIN roots ON roots.id = r."locationId" GROUP BY roots.root_id, roots.root_name
    ), group_counts AS (
      SELECT roots.root_id, g.code, g."labelEn", g."labelEs", COUNT(*)::int AS count,
        ROW_NUMBER() OVER (PARTITION BY roots.root_id ORDER BY COUNT(*) DESC, g.code) AS rank
      FROM incoming r JOIN roots ON roots.id = r."locationId"
      JOIN "IssueType" t ON t.id = r."issueTypeId" JOIN "IssueGroup" g ON g.id = t."groupId"
      GROUP BY roots.root_id, g.code, g."labelEn", g."labelEs"
    ), issue_counts AS (
      SELECT t.id, t.code, t."labelEn", t."labelEs", COUNT(*)::int AS count
      FROM incoming r JOIN "IssueType" t ON t.id = r."issueTypeId" GROUP BY t.id
    ), vote_counts AS (
      SELECT "reportId", COUNT(*)::int AS count FROM "Vote" GROUP BY "reportId"
    ), open_reports AS (
      SELECT r.*, COALESCE(v.count, 0) AS votes FROM visible r LEFT JOIN vote_counts v ON v."reportId" = r.id
      WHERE r.status IN ('REPORTED','ACCEPTED','IN_PROGRESS')
    ), attention_candidates AS (
      (SELECT id, 'oldest' AS reason FROM open_reports ORDER BY "createdAt", id LIMIT 3)
      UNION ALL
      (SELECT id, 'confirmed' FROM open_reports WHERE votes > 0 ORDER BY votes DESC, "createdAt", id LIMIT 3)
      UNION ALL
      (SELECT id, 'waiting' FROM open_reports WHERE status IN ('REPORTED','ACCEPTED') ORDER BY "createdAt", id LIMIT 3)
    ), attention_reasons AS (
      SELECT id, jsonb_agg(reason ORDER BY reason) AS reasons FROM attention_candidates GROUP BY id
    )
    SELECT jsonb_build_object(
      'period', jsonb_build_object('days', ${days}::int, 'start', to_char(b.start_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'end', to_char(b.end_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'timeZone', 'America/New_York'),
      'currentOpen', (SELECT COUNT(*)::int FROM open_reports),
      'totalReports', (SELECT COUNT(*)::int FROM incoming),
      'resolved', (SELECT COUNT(*)::int FROM latest_resolution),
      'totalUpvotes', (SELECT COUNT(*)::int FROM "VoteEvent" v JOIN visible r ON r.id = v."reportId" WHERE v."createdAt" >= b.start_at AND v."createdAt" < b.end_at),
      'averageResolutionMs', (SELECT AVG(EXTRACT(EPOCH FROM ("createdAt" - start_at)) * 1000)::float8 FROM resolution_cycles WHERE start_at IS NOT NULL),
      'resolutionSamples', (SELECT COUNT(*)::int FROM resolution_cycles WHERE start_at IS NOT NULL),
      'averageWaitingMs', (SELECT AVG(milliseconds)::float8 FROM waiting),
      'waitingSamples', (SELECT COUNT(*)::int FROM waiting),
      'trends', (SELECT jsonb_agg(jsonb_build_object('date', to_char(d.day, 'YYYY-MM-DD'), 'reports', COALESCE(r.count, 0), 'resolutions', COALESCE(s.count, 0)) ORDER BY d.day)
        FROM days d LEFT JOIN report_days r ON r.day = d.day LEFT JOIN resolution_days s ON s.day = d.day),
      'locations', COALESCE((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.count DESC, l.name) FROM (SELECT * FROM location_counts ORDER BY count DESC, name LIMIT 6) l), '[]'::jsonb),
      'issues', COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.count DESC, i.code) FROM (SELECT * FROM issue_counts ORDER BY count DESC, code LIMIT 6) i), '[]'::jsonb),
      'hotspots', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'count', l.count,
          'leadingGroup', jsonb_build_object('code', g.code, 'labelEn', g."labelEn", 'labelEs', g."labelEs", 'count', g.count)) ORDER BY l.count DESC, l.name)
        FROM (SELECT * FROM location_counts ORDER BY count DESC, name LIMIT 5) l JOIN group_counts g ON g.root_id = l.id AND g.rank = 1), '[]'::jsonb),
      'attention', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'location', l.path, 'status', r.status,
          'createdAt', to_char(r."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'confirmationCount', r.votes, 'reasons', a.reasons) ORDER BY r."createdAt", r.id)
        FROM attention_reasons a JOIN open_reports r ON r.id = a.id JOIN "Location" l ON l.id = r."locationId"), '[]'::jsonb)
    ) AS data FROM bounds b
  `;
  if (!row) throw new Error("Analytics snapshot unavailable");
  return row.data;
}
