import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApp } from "./app.js";
import { createDatabase } from "./lib/database.js";
import { digest, hashPassword, secret } from "./domain.js";

const enabled = process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_URL;
describe.skipIf(!enabled)("persistent notifications and multiple workers", () => {
  const url = process.env.DATABASE_URL ?? "";
  const db = enabled ? createDatabase(url) : null;
  const app = buildApp({ NODE_ENV: "test", HOST: "127.0.0.1", PORT: 4000, DATABASE_URL: url });
  const fixture = {
    owner: "",
    voter: "",
    workerA: "",
    workerB: "",
    ownerId: "",
    voterId: "",
    aId: "",
    bId: "",
    report: "",
    race: "",
  };
  const request = (
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    cookie = "",
    payload?: Record<string, unknown>,
  ) =>
    app.inject({
      method,
      url: "/api" + path,
      payload,
      headers: { cookie, origin: "http://localhost:3000", "x-campusfix-request": "1" },
    });
  beforeAll(async () => {
    if (!db || !url.includes("campus_fix_test")) throw new Error("Isolated test database required");
    const profile = async (displayName: string | null) => {
      const token = secret();
      const row = await db.session.create({
        data: {
          tokenHash: digest(token),
          expiresAt: new Date(Date.now() + 3600000),
          profile: { create: { displayName } },
        },
      });
      return { cookie: "cf_guest=" + token, id: row.profileId };
    };
    const owner = await profile(null),
      voter = await profile("Alex Test");
    Object.assign(fixture, {
      owner: owner.cookie,
      ownerId: owner.id,
      voter: voter.cookie,
      voterId: voter.id,
    });
    const passwordHash = await hashPassword(randomUUID());
    for (const [key, displayName] of [
      ["A", "Daniel Test"],
      ["B", "Sarah Test"],
    ] as const) {
      const token = secret();
      const worker = await db.staff.create({
        data: {
          email: randomUUID() + "@example.invalid",
          displayName,
          passwordHash,
          sessions: {
            create: { tokenHash: digest(token), expiresAt: new Date(Date.now() + 3600000) },
          },
        },
      });
      fixture[key === "A" ? "workerA" : "workerB"] = "cf_staff=" + token;
      fixture[key === "A" ? "aId" : "bId"] = worker.id;
    }
    const location = await db.location.findFirstOrThrow(),
      type = await db.issueType.findFirstOrThrow();
    for (const key of ["report", "race"] as const) {
      const report = await db.report.create({
        data: {
          idempotencyKey: randomUUID(),
          profileId: owner.id,
          locationId: location.id,
          issueTypeId: type.id,
          title: "Fictional notification fixture",
          description: "Deterministic integration fixture only.",
          exactLocation: "Test location",
          category: "OTHER",
          history: { create: { status: "REPORTED", actorType: "anonymous", note: "Test report" } },
        },
      });
      fixture[key] = report.id;
    }
  }, 15000);
  afterAll(async () => {
    await app.close();
    await db?.$disconnect();
  });

  it("notifies only the owner once under concurrent vote retries; stores verified names", async () => {
    const path = "/reports/" + fixture.report + "/vote";
    expect((await request("POST", path, fixture.owner, {})).statusCode).toBe(403);
    const results = await Promise.all(
      Array.from({ length: 3 }, () => request("POST", path, fixture.voter, {})),
    );
    expect(results.map((r) => r.statusCode)).toEqual([200, 200, 200]);
    const inbox = (await request("GET", "/notifications", fixture.owner)).json();
    expect(inbox.data).toHaveLength(1);
    expect(inbox.data[0]).toMatchObject({
      type: "UPVOTE",
      actorDisplayName: "Alex Test",
      reportId: fixture.report,
      readAt: null,
    });
    expect(inbox.data[0]).not.toHaveProperty("actorProfileId");
    expect(inbox.data[0]).not.toHaveProperty("recipientId");
    expect((await request("GET", "/notifications", fixture.voter)).json().data).toEqual([]);
    expect((await request("GET", "/notifications", fixture.workerA)).statusCode).toBe(401);
    expect(
      (await request("GET", "/notifications?recipientId=" + fixture.ownerId, fixture.voter))
        .statusCode,
    ).toBe(400);
    const id = inbox.data[0].id;
    expect(
      (await request("PATCH", "/notifications/" + id + "/read", fixture.voter, {})).statusCode,
    ).toBe(404);
    const read = await request("PATCH", "/notifications/" + id + "/read", fixture.owner, {});
    expect(read.statusCode).toBe(200);
    expect(read.json().readAt).toBeTruthy();
    expect(
      (await request("PATCH", "/notifications/" + id + "/read", fixture.owner, {})).json().readAt,
    ).toBe(read.json().readAt);
    expect((await request("GET", "/notifications/unread-count", fixture.owner)).json().count).toBe(
      0,
    );
    await db?.profile.update({ where: { id: fixture.voterId }, data: { displayName: null } });
    await request("DELETE", path, fixture.voter);
    await request("POST", path, fixture.voter, {});
    const again = (await request("GET", "/notifications", fixture.owner)).json().data;
    expect(again).toHaveLength(2);
    expect(again[0].actorDisplayName).toBeNull();
    expect(again[1].actorDisplayName).toBe("Alex Test");
    expect(await db?.voteEvent.count({ where: { reportId: fixture.report } })).toBe(2);
  });

  it("preserves each worker's historical name and personal credit, with one event per transition", async () => {
    let version = 1;
    for (const [status, cookie] of [
      ["ACCEPTED", fixture.workerA],
      ["IN_PROGRESS", fixture.workerB],
      ["RESOLVED", fixture.workerB],
    ]) {
      const result = await request(
        "POST",
        "/staff/requests/" + fixture.report + "/status",
        cookie,
        { status, version, note: "Fictional work verified" },
      );
      expect(result.statusCode).toBe(200);
      version++;
    }
    expect(
      (
        await request("POST", "/staff/requests/" + fixture.report + "/status", fixture.workerB, {
          status: "RESOLVED",
          version,
          note: "No-op retry",
        })
      ).statusCode,
    ).toBe(409);
    await db?.staff.update({ where: { id: fixture.bId }, data: { displayName: "Sarah Renamed" } });
    const report = (await request("GET", "/reports/" + fixture.report, fixture.owner)).json();
    expect(
      report.history.slice(1).map((e: { actorDisplayName: string }) => e.actorDisplayName),
    ).toEqual(["Daniel Test", "Sarah Test", "Sarah Test"]);
    expect((await request("GET", "/staff/me", fixture.workerA)).json().resolved).toBe(0);
    expect((await request("GET", "/staff/me", fixture.workerB)).json().resolved).toBe(1);
    const inbox = (await request("GET", "/notifications?limit=2", fixture.owner)).json();
    expect(inbox.data.map((e: { type: string }) => e.type)).toEqual(["RESOLVED", "IN_PROGRESS"]);
    expect(inbox.data[0].actorDisplayName).toBe("Sarah Test");
    const older = (
      await request(
        "GET",
        "/notifications?limit=2&before=" +
          encodeURIComponent(inbox.nextCursor.before) +
          "&cursor=" +
          inbox.nextCursor.cursor,
        fixture.owner,
      )
    ).json();
    expect(older.data[0].type).toBe("ACCEPTED");
    expect(older.data.some((e: { id: string }) => e.id === inbox.data[1].id)).toBe(false);
    expect((await request("PATCH", "/notifications/read-all", fixture.owner, {})).statusCode).toBe(
      200,
    );
    expect((await request("GET", "/notifications/unread-count", fixture.owner)).json().count).toBe(
      0,
    );
  });

  it("rejects a losing concurrent transition without duplicate history or notifications", async () => {
    const results = await Promise.all(
      [fixture.workerA, fixture.workerB].map((cookie) =>
        request("POST", "/staff/requests/" + fixture.race + "/status", cookie, {
          status: "ACCEPTED",
          version: 1,
          note: "Concurrent fixture",
        }),
      ),
    );
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    expect(
      await db?.statusEvent.count({ where: { reportId: fixture.race, status: "ACCEPTED" } }),
    ).toBe(1);
    expect(await db?.notification.count({ where: { reportId: fixture.race } })).toBe(1);
    const rejected = await request(
      "POST",
      "/staff/requests/" + fixture.race + "/status",
      fixture.workerB,
      { status: "REJECTED", version: 2, note: "Fixture is not actionable" },
    );
    expect(rejected.statusCode).toBe(200);
    expect((await request("GET", "/notifications", fixture.owner)).json().data[0]).toMatchObject({
      type: "REJECTED",
      actorDisplayName: "Sarah Renamed",
      note: "Fixture is not actionable",
    });
  });
  it("mark-all leaves notifications newer than the observed server cutoff unread", async () => {
    const cutoff = (await request("GET", "/notifications/unread-count", fixture.owner)).json().asOf;
    const path = "/reports/" + fixture.report + "/vote";
    await request("DELETE", path, fixture.voter);
    expect((await request("POST", path, fixture.voter, {})).statusCode).toBe(200);
    expect(
      (await request("PATCH", "/notifications/read-all", fixture.owner, { through: cutoff }))
        .statusCode,
    ).toBe(200);
    const rows = (await request("GET", "/notifications", fixture.owner)).json().data;
    expect(rows[0].createdAt > cutoff).toBe(true);
    expect(rows[0].readAt).toBeNull();
    expect(rows.slice(1).every((row: { readAt: string | null }) => !!row.readAt)).toBe(true);
  });

  it("moves the inbox on approved device linking while preserving historical actor snapshots", async () => {
    const before = (await request("GET", "/notifications", fixture.owner)).json().data;
    const started = await request("POST", "/anonymous/link/start", fixture.voter, {});
    expect(started.statusCode).toBe(200);
    const { requestId, code } = started.json();
    expect(
      (await request("POST", "/anonymous/link/request", fixture.owner, { code })).statusCode,
    ).toBe(200);
    expect(
      (await request("POST", "/anonymous/link/confirm", fixture.voter, { requestId })).statusCode,
    ).toBe(200);
    expect((await request("GET", "/notifications", fixture.voter)).json().data).toEqual(before);
    expect((await request("GET", "/notifications", fixture.owner)).json().data).toEqual(before);
    expect(await db?.notification.count({ where: { recipientId: fixture.ownerId } })).toBe(0);
    expect(await db?.voteEvent.count({ where: { reportId: fixture.report } })).toBe(3);
  });
});
