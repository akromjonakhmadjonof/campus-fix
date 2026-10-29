import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { getAnalytics } from "./analytics.js";
import { createDatabase } from "./lib/database.js";
import { buildApp } from "./app.js";
import { digest, secret } from "./domain.js";
const enabled = process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_URL;
describe.skipIf(!enabled)("PostgreSQL operational analytics", () => {
  const url = process.env.DATABASE_URL ?? "";
  const db = enabled ? createDatabase(url) : null;
  const app = buildApp({ NODE_ENV: "test", HOST: "127.0.0.1", PORT: 4000, DATABASE_URL: url });
  let reportId = "",
    profileId = "",
    workerId = "",
    workerTwo = "",
    cookie = "",
    rootId = "",
    typeId = "",
    groupCode = "";
  const ids: string[] = [];
  const now = new Date("2035-03-12T16:00:00Z");
  beforeAll(async () => {
    if (!db || !url.includes("campus_fix_test")) throw new Error("Isolated test database required");
    profileId = (await db.profile.create({ data: {} })).id;
    const token = secret();
    workerId = (
      await db.staff.create({
        data: {
          email: randomUUID() + "@example.invalid",
          displayName: "Analytics Worker A",
          passwordHash: "disabled-test-login",
          sessions: {
            create: { tokenHash: digest(token), expiresAt: new Date(Date.now() + 3600000) },
          },
        },
      })
    ).id;
    workerTwo = (
      await db.staff.create({
        data: {
          email: randomUUID() + "@example.invalid",
          displayName: "Analytics Worker B",
          passwordHash: "disabled-test-login",
        },
      })
    ).id;
    cookie = "cf_staff=" + token;
    const location = await db.location.findFirstOrThrow({
      where: { parent: { parentId: { not: null } } },
      include: { parent: { include: { parent: true } } },
    });
    rootId = location.parent?.parent?.id ?? "";
    const type = await db.issueType.findFirstOrThrow({ include: { group: true } });
    typeId = type.id;
    groupCode = type.group.code;
    const createdAt = new Date("2035-03-10T13:00:00Z");
    const row = await db.report.create({
      data: {
        idempotencyKey: randomUUID(),
        title: "Fictional deterministic analytics",
        description: "Analytics test only",
        exactLocation: "Fixture",
        category: "OTHER",
        profileId,
        locationId: location.id,
        issueTypeId: type.id,
        status: "RESOLVED",
        resolvedById: workerTwo,
        createdAt,
        history: {
          create: [
            { status: "REPORTED", actorType: "anonymous", note: "Created", createdAt },
            {
              status: "ACCEPTED",
              fromStatus: "REPORTED",
              actorType: "staff",
              staffId: workerId,
              note: "Accepted",
              createdAt: new Date("2035-03-10T14:00:00Z"),
            },
            {
              status: "IN_PROGRESS",
              fromStatus: "ACCEPTED",
              actorType: "staff",
              staffId: workerTwo,
              note: "Started",
              createdAt: new Date("2035-03-10T15:00:00Z"),
            },
            {
              status: "RESOLVED",
              fromStatus: "IN_PROGRESS",
              actorType: "staff",
              staffId: workerTwo,
              note: "Resolved",
              createdAt: new Date("2035-03-10T18:30:00Z"),
            },
          ],
        },
      },
    });
    reportId = row.id;
    ids.push(row.id);
    await db.voteEvent.createMany({
      data: [
        { reportId, profileId, createdAt: new Date("2035-03-10T15:00:00Z") },
        { reportId, profileId, createdAt: new Date("2035-03-10T16:00:00Z") },
      ],
    });
  });
  afterAll(async () => {
    if (db)
      await db.report.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
    await app.close();
    await db?.$disconnect();
  });

  it("computes 2h waiting and 3h30m work time from events, with root rollups and real votes", async () => {
    if (!db) throw new Error("Database required");
    const data = await getAnalytics(db, 7, now);
    expect(data.averageWaitingMs).toBe(2 * 3600000);
    expect(data.averageResolutionMs).toBe(3.5 * 3600000);
    expect(data.resolved).toBe(1);
    expect(data.totalReports).toBe(1);
    expect(data.totalUpvotes).toBe(2);
    expect(data.locations).toMatchObject([{ id: rootId, count: 1 }]);
    expect(data.issues).toMatchObject([{ id: typeId, count: 1 }]);
    expect(data.hotspots[0]?.leadingGroup).toMatchObject({ code: groupCode, count: 1 });
    expect(data.trends).toHaveLength(7);
    expect(data.trends.reduce((n, d) => n + d.reports, 0)).toBe(data.totalReports);
    expect(data.trends.reduce((n, d) => n + d.resolutions, 0)).toBe(data.resolved);
    expect(data.currentOpen).toBe(
      await db.report.count({
        where: { deletedAt: null, status: { in: ["REPORTED", "ACCEPTED", "IN_PROGRESS"] } },
      }),
    );
  });

  it("uses the latest resolved cycle once and never pairs work across an earlier terminal event", async () => {
    if (!db) throw new Error("Database required");
    await db.statusEvent.createMany({
      data: [
        {
          reportId,
          status: "REPORTED",
          fromStatus: "RESOLVED",
          actorType: "staff",
          staffId: workerId,
          note: "Historical imported reopen fixture",
          createdAt: new Date("2035-03-11T13:00:00Z"),
        },
        {
          reportId,
          status: "IN_PROGRESS",
          fromStatus: "ACCEPTED",
          actorType: "staff",
          staffId: workerId,
          note: "Second cycle",
          createdAt: new Date("2035-03-11T15:00:00Z"),
        },
        {
          reportId,
          status: "RESOLVED",
          fromStatus: "IN_PROGRESS",
          actorType: "staff",
          staffId: workerId,
          note: "Second completion",
          createdAt: new Date("2035-03-11T16:00:00Z"),
        },
      ],
    });
    const data = await getAnalytics(db, 30, now);
    expect(data.resolved).toBe(1);
    expect(data.averageResolutionMs).toBe(3600000);
    expect(data.averageWaitingMs).toBe(7200000);
    expect(data.trends.find((d) => d.date === "2035-03-10")?.resolutions).toBe(0);
    expect(data.trends.find((d) => d.date === "2035-03-11")?.resolutions).toBe(1);
    await db.statusEvent.create({
      data: {
        reportId,
        status: "RESOLVED",
        actorType: "system",
        note: "Incomplete historical cycle",
        createdAt: new Date("2035-03-11T17:00:00Z"),
      },
    });
    const incomplete = await getAnalytics(db, 30, now);
    expect(incomplete.resolved).toBe(1);
    expect(incomplete.averageResolutionMs).toBeNull();
    expect(incomplete.resolutionSamples).toBe(0);
  });

  it("excludes rejected/deleted completions and returns truthful empty periods", async () => {
    if (!db) throw new Error("Database required");
    await db.report.update({ where: { id: reportId }, data: { status: "REJECTED" } });
    const rejected = await getAnalytics(db, 7, now);
    expect(rejected.resolved).toBe(0);
    expect(rejected.averageResolutionMs).toBeNull();
    expect(rejected.attention.some((r) => r.id === reportId)).toBe(false);
    const empty = await getAnalytics(db, 90, new Date("2050-05-01T16:00:00Z"));
    expect(empty.totalReports).toBe(0);
    expect(empty.resolved).toBe(0);
    expect(empty.totalUpvotes).toBe(0);
    expect(empty.locations).toEqual([]);
    expect(empty.issues).toEqual([]);
    expect(empty.hotspots).toEqual([]);
    expect(empty.averageWaitingMs).toBeNull();
    expect(empty.averageResolutionMs).toBeNull();
    expect(empty.trends).toHaveLength(90);
    expect(
      empty.attention.every((r) => ["REPORTED", "ACCEPTED", "IN_PROGRESS"].includes(r.status)),
    ).toBe(true);
    expect(empty.attention.every((r, i, a) => i === 0 || a[i - 1].createdAt <= r.createdAt)).toBe(
      true,
    );
    expect(empty.attention.some((r) => r.reasons.includes("confirmed"))).toBe(true);
  });

  it.each([
    ["2026-03-10T12:00:00Z", "2026-03-04T05:00:00.000Z", "2026-03-10"],
    ["2026-11-03T12:00:00Z", "2026-10-28T04:00:00.000Z", "2026-11-03"],
  ])(
    "includes today with correct New York daylight-saving boundaries at %s",
    async (instant, start, today) => {
      if (!db) throw new Error("Database required");
      const data = await getAnalytics(db, 7, new Date(instant));
      expect(data.period.start).toBe(start);
      expect(data.period.end).toBe(new Date(instant).toISOString());
      expect(data.trends).toHaveLength(7);
      expect(data.trends.at(-1)?.date).toBe(today);
    },
  );

  it("counts today's received, completed and voted requests, includes the start and excludes the cutoff", async () => {
    if (!db) throw new Error("Database required");
    const instant = new Date("2036-06-21T16:00:00Z");
    const times = [
      "2036-06-15T03:59:59.999Z",
      "2036-06-15T04:00:00Z",
      "2036-06-21T04:00:00Z",
      instant.toISOString(),
    ];
    for (const [index, time] of times.entries()) {
      const createdAt = new Date(time);
      const row = await db.report.create({
        data: {
          idempotencyKey: randomUUID(),
          title: "Fictional live analytics boundary",
          description: "Isolated boundary regression fixture.",
          exactLocation: "Fixture",
          category: "OTHER",
          profileId,
          locationId: rootId,
          issueTypeId: typeId,
          createdAt,
          status: index === 2 ? "RESOLVED" : "REPORTED",
          history: {
            create:
              index === 2
                ? [
                    {
                      status: "IN_PROGRESS",
                      actorType: "staff",
                      staffId: workerId,
                      note: "Started today",
                      createdAt: new Date("2036-06-21T05:00:00Z"),
                    },
                    {
                      status: "RESOLVED",
                      actorType: "staff",
                      staffId: workerId,
                      note: "Finished today",
                      createdAt: new Date("2036-06-21T06:00:00Z"),
                    },
                  ]
                : [],
          },
        },
      });
      ids.push(row.id);
      if (index === 2)
        await db.voteEvent.create({
          data: { reportId: row.id, profileId, createdAt: new Date("2036-06-21T07:00:00Z") },
        });
    }
    const data = await getAnalytics(db, 7, instant);
    expect(data.totalReports).toBe(2);
    expect(data.resolved).toBe(1);
    expect(data.totalUpvotes).toBe(1);
    expect(data.averageWaitingMs).toBe(3600000);
    expect(data.averageResolutionMs).toBe(3600000);
    expect(data.trends.at(-1)).toEqual({ date: "2036-06-21", reports: 1, resolutions: 1 });
    expect(data.trends.reduce((sum, day) => sum + day.reports, 0)).toBe(data.totalReports);
    expect(data.trends.reduce((sum, day) => sum + day.resolutions, 0)).toBe(data.resolved);
  });

  it("authenticates the campus-wide endpoint and rejects invalid periods", async () => {
    const req = (query: string, auth = "") =>
      app.inject({ method: "GET", url: "/api/staff/analytics" + query, headers: { cookie: auth } });
    expect((await req("?days=7")).statusCode).toBe(401);
    expect((await req("?days=8", cookie)).statusCode).toBe(400);
    expect((await req("?days=30&staffId=" + workerId, cookie)).statusCode).toBe(400);
    const result = await req("?days=30", cookie);
    expect(result.statusCode).toBe(200);
    expect(result.headers["cache-control"]).toBe("private, no-store");
    expect(result.json().period.days).toBe(30);
  });
});
