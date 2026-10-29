/* Test fixture assertions follow explicit setup and HTTP status expectations. */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { buildApp } from "./app.js";
import { createDatabase } from "./lib/database.js";
import {
  flattenLocations,
  hashPassword,
  verifyPassword,
  similarity,
  transitions,
} from "./domain.js";
import { readFile, readdir } from "node:fs/promises";
describe("business rules", () => {
  it("validates owner hierarchy and sibling identity", async () => {
    const rows = flattenLocations(JSON.parse(await readFile("../seed.json", "utf8")));
    expect(rows).toHaveLength(281);
    expect(rows.filter((r) => !r.parentKey)).toHaveLength(38);
    expect(() => flattenLocations([{ name: "A" }, { name: "A" }])).toThrow("Duplicate sibling");
    expect(() => flattenLocations([{ name: "A", children: {} }])).toThrow();
    expect(
      flattenLocations([
        { name: "A", children: [{ name: "Room 1" }] },
        { name: "B", children: [{ name: "Room 1" }] },
      ]),
    ).toHaveLength(4);
  });
  it("hashes staff passwords with salted Argon2id and rejects wrong passwords", async () => {
    const first = await hashPassword("Fictional test password");
    const second = await hashPassword("Fictional test password");
    expect(first.startsWith("$argon2id$")).toBe(true);
    expect(first).not.toBe(second);
    expect(await verifyPassword("Fictional test password", first)).toBe(true);
    expect(await verifyPassword("Incorrect password", first)).toBe(false);
  });
  it("uses actual workflow states and deterministic similarity", () => {
    expect(transitions.REPORTED).toEqual(["ACCEPTED", "REJECTED"]);
    expect(transitions.RESOLVED).toEqual([]);
    expect(similarity("pipe leaking window", "pipe leaking window")).toBe(1);
    expect(similarity("pipe dripping", "computer keyboard")).toBe(0);
  });
});
const enabled = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS === "1";
describe.skipIf(!enabled)("real PostgreSQL API acceptance", () => {
  const url = process.env.DATABASE_URL!;
  const app = buildApp({ NODE_ENV: "test", HOST: "127.0.0.1", PORT: 4000, DATABASE_URL: url });
  const db = enabled ? createDatabase(url) : null;
  let a = "",
    b = "",
    staff = "",
    locationId = "",
    issueTypeId = "",
    issueGroupId = "",
    reportId = "",
    otherId = "",
    mediaId = "";
  const email = "worker-" + randomUUID() + "@example.invalid",
    password = randomUUID() + randomUUID();
  const headers = (cookie = "") => ({
    "x-campusfix-request": "1",
    origin: "http://localhost:3000",
    cookie,
  });
  const request = (
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    cookie = "",
    payload?: Record<string, unknown>,
  ) => app.inject({ method, url: "/api" + path, headers: headers(cookie), payload });
  beforeAll(async () => {
    if (!url.includes("campus_fix_test"))
      throw new Error("Tests require isolated campus_fix_test database");
    const location = await db!.location.findFirstOrThrow({ where: { parentId: { not: null } } }),
      type = await db!.issueType.findFirstOrThrow({ where: { group: { code: "plumbing" } } });
    locationId = location.id;
    issueTypeId = type.id;
    issueGroupId = type.groupId;
    await db!.staff.create({
      data: {
        email,
        displayName: "Fictional Test Worker",
        passwordHash: await hashPassword(password),
      },
    });
    a = (await request("POST", "/anonymous/session")).headers["set-cookie"]!.toString().split(
      ";",
    )[0]!;
    b = (await request("POST", "/anonymous/session")).headers["set-cookie"]!.toString().split(
      ";",
    )[0]!;
  });
  afterAll(async () => {
    await app.close();
    await db?.$disconnect();
  });
  const upload = async (cookie = a) => {
    const bytes = await sharp({
      create: { width: 24, height: 24, channels: 3, background: "#304c75" },
    })
      .png()
      .toBuffer();
    const boundary = "required-photo-fixture";
    const result = await app.inject({
      method: "POST",
      url: "/api/media",
      headers: { ...headers(cookie), "content-type": "multipart/form-data; boundary=" + boundary },
      payload: Buffer.concat([
        Buffer.from(
          "--" +
            boundary +
            '\r\nContent-Disposition: form-data; name="photo"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n',
        ),
        bytes,
        Buffer.from("\r\n--" + boundary + "--\r\n"),
      ]),
    });
    expect(result.statusCode).toBe(200);
    return result.json().id as string;
  };
  const form = async (cookie = a) => ({
    title: "Fictional fountain leak " + randomUUID(),
    description: "A synthetic puddle below the second fountain for automated testing.",
    exactLocation: "Second fountain by the window",
    locationId,
    issueTypeId,
    category: "PLUMBING",
    issueGroupId,
    attachmentIds: [await upload(cookie)],
    idempotencyKey: randomUUID(),
    duplicateAcknowledged: true,
  });
  it("enforces all seven required fields, valid taxonomy, location and photo ownership", async () => {
    const input = await form();
    const count = await db!.report.count();
    const submit = (payload: Record<string, unknown>) =>
      app.inject({
        method: "POST",
        url: "/api/reports",
        remoteAddress: "127.0.0.2",
        headers: headers(a),
        payload,
      });
    for (const field of [
      "title",
      "description",
      "issueGroupId",
      "issueTypeId",
      "locationId",
      "exactLocation",
      "attachmentIds",
    ]) {
      const payload: Record<string, unknown> = { ...input };
      delete payload[field];
      expect((await submit(payload)).statusCode, field).toBe(400);
    }
    const mismatched = await db!.issueGroup.findFirstOrThrow({
      where: { id: { not: issueGroupId } },
    });
    for (const patch of [
      { title: "   " },
      { description: "............." },
      { exactLocation: "   " },
      { issueGroupId: randomUUID() },
      { issueTypeId: randomUUID() },
      { locationId: randomUUID() },
      { issueGroupId: mismatched.id },
      { attachmentIds: [] },
      { attachmentIds: [randomUUID()] },
      { attachmentIds: [await upload(b)] },
    ])
      expect([400, 403]).toContain((await submit({ ...input, ...patch })).statusCode);
    expect(await db!.report.count()).toBe(count);
  });
  it("bootstraps once and denies CSRF", async () => {
    expect((await request("POST", "/anonymous/session", a)).headers["set-cookie"]).toBeUndefined();
    expect((await app.inject({ method: "POST", url: "/api/anonymous/session" })).statusCode).toBe(
      403,
    );
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/anonymous/session",
          headers: { "x-campusfix-request": "1", origin: "https://evil.invalid" },
        })
      ).statusCode,
    ).toBe(403);
  });
  it("creates idempotently and ignores no privilege fields", async () => {
    const input = await form();
    const created = await request("POST", "/reports", a, input);
    expect(created.statusCode).toBe(201);
    reportId = created.json().id;
    expect(created.json().history).toHaveLength(1);
    expect((await request("POST", "/reports", a, input)).json().id).toBe(reportId);
    expect(
      (
        await request("POST", "/reports", b, {
          ...(await form()),
          profileId: randomUUID(),
          status: "RESOLVED",
        })
      ).statusCode,
    ).toBe(400);
    otherId = (await request("POST", "/reports", b, await form(b))).json().id;
  });
  it("denies other owners and stale edits; mine stays private", async () => {
    expect(
      (await request("PATCH", "/reports/" + reportId, b, { title: "Stolen report", version: 1 }))
        .statusCode,
    ).toBe(403);
    expect(
      (
        await request("PATCH", "/reports/" + reportId, a, {
          title: "Updated fictional fountain",
          version: 1,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await request("PATCH", "/reports/" + reportId, a, { title: "Stale update", version: 1 }))
        .statusCode,
    ).toBe(409);
    const own = (await request("GET", "/reports?scope=mine", b)).json();
    expect(own.data.some((r: { id: string }) => r.id === reportId)).toBe(false);
  });
  it("rejects nonexistent locations and preserves required custom issue names", async () => {
    expect(
      (await request("POST", "/reports", a, { ...(await form()), locationId: randomUUID() }))
        .statusCode,
    ).toBe(400);
    expect(
      (await request("PATCH", "/reports/" + reportId, a, { locationId: randomUUID(), version: 2 }))
        .statusCode,
    ).toBe(400);
    const other = await db!.issueType.findFirstOrThrow({
      where: { code: { startsWith: "other_" } },
    });
    expect(
      (
        await request("POST", "/reports", a, {
          ...(await form()),
          issueTypeId: other.id,
          issueGroupId: other.groupId,
        })
      ).statusCode,
    ).toBe(400);
    const created = await request("POST", "/reports", a, {
      ...(await form()),
      issueTypeId: other.id,
      issueGroupId: other.groupId,
      customIssueName: "Fictional custom fixture",
    });
    expect(created.statusCode).toBe(201);
    expect(
      (
        await request("PATCH", "/reports/" + created.json().id, a, {
          customIssueName: "  ",
          version: 1,
        })
      ).statusCode,
    ).toBe(400);
  });
  it("supports unique votes, undo, and blocks self votes", async () => {
    expect((await request("POST", "/reports/" + reportId + "/vote", a, {})).statusCode).toBe(403);
    await request("POST", "/reports/" + reportId + "/vote", b, {});
    expect(
      (await request("POST", "/reports/" + reportId + "/vote", b, {})).json().confirmationCount,
    ).toBe(1);
    expect(
      (await request("DELETE", "/reports/" + reportId + "/vote", b)).json().confirmationCount,
    ).toBe(0);
    await request("POST", "/reports/" + reportId + "/vote", b, {});
  });
  it("finds active likely duplicates with reasons", async () => {
    const matches = await request("POST", "/reports/similar", a, {
      title: "Updated fictional fountain",
      description: "synthetic puddle below the second fountain",
      exactLocation: "Second fountain by the window",
      locationId,
      issueTypeId,
    });
    expect(matches.statusCode).toBe(200);
    expect(
      matches
        .json()
        .some(
          (m: { report: { id: string }; reasons: string[] }) =>
            m.report.id === reportId && m.reasons.includes("same_location"),
        ),
    ).toBe(true);
  });
  it("requires source confirmation then merges reports/votes; no replay", async () => {
    const start = (await request("POST", "/anonymous/link/start", a, {})).json();
    expect(
      (await request("POST", "/anonymous/link/request", b, { code: start.code })).statusCode,
    ).toBe(200);
    expect(
      (await request("POST", "/anonymous/link/confirm", b, { requestId: start.requestId }))
        .statusCode,
    ).toBe(403);
    expect((await request("GET", "/reports/" + reportId, b)).json().canEdit).toBe(false);
    expect(
      (await request("POST", "/anonymous/link/confirm", a, { requestId: start.requestId }))
        .statusCode,
    ).toBe(200);
    expect((await request("GET", "/reports/" + reportId, b)).json().canEdit).toBe(true);
    expect((await request("GET", "/reports/" + otherId, a)).json().canEdit).toBe(true);
    expect((await request("GET", "/reports/" + reportId, a)).json().confirmationCount).toBe(0);
    expect(
      (await request("POST", "/anonymous/link/confirm", a, { requestId: start.requestId }))
        .statusCode,
    ).toBe(403);
    expect(
      (await request("POST", "/anonymous/link/request", b, { code: start.code })).statusCode,
    ).toBe(400);
  });
  it("uploads actual image bytes, strips metadata, guards paths and MIME", async () => {
    const image = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "#4679ea" },
    })
      .png()
      .toBuffer();
    const boundary = "campusfix-test-boundary";
    const payload = Buffer.concat([
      Buffer.from(
        "--" +
          boundary +
          '\r\nContent-Disposition: form-data; name="photo"; filename="fixture.png"\r\nContent-Type: image/png\r\n\r\n',
      ),
      image,
      Buffer.from("\r\n--" + boundary + "--\r\n"),
    ]);
    const uploaded = await app.inject({
      method: "POST",
      url: "/api/media",
      headers: { ...headers(a), "content-type": "multipart/form-data; boundary=" + boundary },
      payload,
    });
    expect(uploaded.statusCode).toBe(200);
    mediaId = uploaded.json().id;
    expect(uploaded.json().storageKey).toBeUndefined();
    expect(
      (await request("GET", "/media/" + mediaId + "/content", a)).headers["content-type"],
    ).toBe("image/webp");
    expect((await request("GET", "/media/not-a-uuid/content", a)).statusCode).toBe(400);
    expect((await request("GET", "/media/" + randomUUID() + "/content", a)).statusCode).toBe(404);
    const saved = await request("POST", "/reports", a, {
      ...(await form()),
      attachmentIds: [mediaId],
    });
    expect(saved.statusCode).toBe(201);
    const second = buildApp({ NODE_ENV: "test", HOST: "127.0.0.1", PORT: 4000, DATABASE_URL: url });
    try {
      expect((await second.inject({ url: "/api/media/" + mediaId + "/content" })).statusCode).toBe(
        200,
      );
    } finally {
      await second.close();
    }
  });
  it("persists private profile identity, validates ownership, and shares it after approved linking", async () => {
    const c = (await request("POST", "/anonymous/session")).headers["set-cookie"]!.toString().split(
      ";",
    )[0]!;
    const d = (await request("POST", "/anonymous/session")).headers["set-cookie"]!.toString().split(
      ";",
    )[0]!;
    const initial = (await request("GET", "/anonymous/me", c)).json();
    expect(initial.alias).toBe("Guest Reporter");
    expect(initial.displayName).toBeNull();
    expect(initial.avatar).toBeNull();
    for (const displayName of [" ", "a", "x".repeat(61), "name\u0000", "name\u202e"]) {
      expect(
        (await request("PATCH", "/anonymous/me", c, { displayName, avatarMediaId: null }))
          .statusCode,
      ).toBe(400);
    }
    expect(
      (
        await request("PATCH", "/anonymous/me", c, {
          displayName: "Reporter",
          avatarMediaId: null,
          profileId: randomUUID(),
        })
      ).statusCode,
    ).toBe(400);
    const image = await sharp({
      create: { width: 48, height: 48, channels: 3, background: "#1f3c6c" },
    })
      .png()
      .toBuffer();
    const boundary = "profile-image";
    const payload = Buffer.concat([
      Buffer.from(
        "--" +
          boundary +
          '\r\nContent-Disposition: form-data; name="photo"; filename="profile.png"\r\nContent-Type: image/png\r\n\r\n',
      ),
      image,
      Buffer.from("\r\n--" + boundary + "--\r\n"),
    ]);
    const uploaded = await app.inject({
      method: "POST",
      url: "/api/media",
      headers: { ...headers(c), "content-type": "multipart/form-data; boundary=" + boundary },
      payload,
    });
    expect(uploaded.statusCode).toBe(200);
    const avatarMediaId = uploaded.json().id;
    expect(
      (await request("PATCH", "/anonymous/me", d, { displayName: "Stranger", avatarMediaId }))
        .statusCode,
    ).toBe(400);
    expect(
      (
        await request("PATCH", "/anonymous/me", c, {
          displayName: "  Campus Reporter  ",
          avatarMediaId,
        })
      ).statusCode,
    ).toBe(200);
    const saved = (await request("GET", "/anonymous/me", c)).json();
    expect(saved.displayName).toBe("Campus Reporter");
    expect(saved.avatar.id).toBe(avatarMediaId);
    expect((await request("GET", "/media/" + avatarMediaId + "/content", d)).statusCode).toBe(404);
    expect((await request("GET", "/media/" + avatarMediaId + "/content")).statusCode).toBe(404);
    expect(
      (await request("POST", "/reports", c, { ...(await form()), attachmentIds: [avatarMediaId] }))
        .statusCode,
    ).toBe(400);
    const ownReport = (await request("POST", "/reports", c, await form(c))).json();
    expect(
      (
        await request("PATCH", "/reports/" + ownReport.id, c, {
          version: 1,
          attachmentIds: [avatarMediaId],
        })
      ).statusCode,
    ).toBe(400);
    await db!.media.update({
      where: { id: avatarMediaId },
      data: { createdAt: new Date(Date.now() - 172800000) },
    });
    const second = buildApp({ NODE_ENV: "test", HOST: "127.0.0.1", PORT: 4000, DATABASE_URL: url });
    try {
      await second.ready();
      const reloaded = await second.inject({ url: "/api/anonymous/me", headers: headers(c) });
      expect(reloaded.json().avatar.id).toBe(avatarMediaId);
      expect(
        (
          await second.inject({
            url: "/api/media/" + avatarMediaId + "/content",
            headers: headers(c),
          })
        ).statusCode,
      ).toBe(200);
    } finally {
      await second.close();
    }
    await request("PATCH", "/anonymous/me", d, {
      displayName: "Other Reporter",
      avatarMediaId: null,
    });
    const start = (await request("POST", "/anonymous/link/start", c, {})).json();
    expect(
      (await request("POST", "/anonymous/link/request", d, { code: start.code })).statusCode,
    ).toBe(200);
    expect((await request("GET", "/anonymous/me", d)).json().displayName).toBe("Other Reporter");
    expect(
      (await request("POST", "/anonymous/link/confirm", c, { requestId: start.requestId }))
        .statusCode,
    ).toBe(200);
    expect((await request("GET", "/anonymous/me", d)).json().displayName).toBe("Campus Reporter");
    expect((await request("GET", "/media/" + avatarMediaId + "/content", d)).statusCode).toBe(200);
    expect(
      (
        await request("PATCH", "/anonymous/me", d, {
          displayName: "Shared Reporter",
          avatarMediaId,
        })
      ).statusCode,
    ).toBe(200);
    expect((await request("GET", "/anonymous/me", c)).json().displayName).toBe("Shared Reporter");
    expect(
      (
        await request("PATCH", "/anonymous/me", c, {
          displayName: "Shared Reporter",
          avatarMediaId: null,
        })
      ).statusCode,
    ).toBe(200);
    expect((await request("GET", "/anonymous/me", d)).json().avatar).toBeNull();
  });
  it("staff login protects queue; creates no public signup", async () => {
    expect((await request("GET", "/staff/requests", a)).statusCode).toBe(401);
    expect((await request("POST", "/staff/register", a, {})).statusCode).toBe(404);
    expect(
      (await request("POST", "/staff/login", "", { username: email, password: "wrong" }))
        .statusCode,
    ).toBe(401);
    const login = await request("POST", "/staff/login", "", { username: email, password });
    expect(login.statusCode).toBe(200);
    staff = login.headers["set-cookie"]!.toString().split(";")[0]!;
    expect((await request("GET", "/staff/requests", staff)).statusCode).toBe(200);
    expect(
      (await request("POST", "/reports/" + reportId + "/vote", staff + "; " + a, {})).statusCode,
    ).toBe(403);
  });
  it("completes accepted/start/resolved with persisted timeline and worker history", async () => {
    let version = (await request("GET", "/reports/" + reportId, a)).json().version;
    expect(
      (
        await request("POST", "/staff/requests/" + reportId + "/status", a, {
          status: "RESOLVED",
          note: "fake",
          version,
        })
      ).statusCode,
    ).toBe(401);
    for (const status of ["ACCEPTED", "IN_PROGRESS", "RESOLVED"]) {
      const result = await request("POST", "/staff/requests/" + reportId + "/status", staff, {
        status,
        note: "Fictional test work verified.",
        version,
      });
      expect(result.statusCode).toBe(200);
      version = result.json().version;
    }
    const final = (await request("GET", "/reports/" + reportId, a)).json();
    expect(final.history.map((h: { status: string }) => h.status)).toEqual([
      "REPORTED",
      "ACCEPTED",
      "IN_PROGRESS",
      "RESOLVED",
    ]);
    expect(
      (await request("GET", "/staff/requests", staff))
        .json()
        .data.some((r: { id: string }) => r.id === reportId),
    ).toBe(false);
    expect(
      (await request("GET", "/staff/resolved", staff))
        .json()
        .data.some((r: { id: string }) => r.id === reportId),
    ).toBe(true);
    expect(
      (await request("PATCH", "/reports/" + reportId, a, { title: "After resolution", version }))
        .statusCode,
    ).toBe(409);
  });
  it("attributes completed work to the resolving actor and logout preserves reporter identity", async () => {
    const secondEmail = "worker-" + randomUUID() + "@example.invalid";
    await db!.staff.create({
      data: {
        email: secondEmail,
        displayName: "Second Test Worker",
        passwordHash: await hashPassword(password),
      },
    });
    const signedIn = await request("POST", "/staff/login", "", { username: secondEmail, password });
    expect(signedIn.statusCode).toBe(200);
    const secondCookie = signedIn.headers["set-cookie"]!.toString().split(";")[0]!;
    const empty = (await request("GET", "/staff/me", secondCookie)).json();
    expect(empty.resolved).toBe(0);
    expect(empty.recent).toEqual([]);
    const firstBefore = (await request("GET", "/staff/me", staff)).json();
    expect(firstBefore.resolved).toBe(1);
    expect(firstBefore.recent[0].id).toBe(reportId);
    expect(firstBefore.recent[0].resolvedAt).toBe(
      firstBefore.recent[0].history.find((event: { status: string }) => event.status === "RESOLVED")
        .createdAt,
    );
    const created = await request("POST", "/reports", a, await form());
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    let version = 1;
    for (const status of ["ACCEPTED", "IN_PROGRESS", "RESOLVED"]) {
      const response = await request(
        "POST",
        "/staff/requests/" + id + "/status",
        status === "ACCEPTED" ? staff : secondCookie,
        { status, note: "Fictional second worker completed the repair.", version },
      );
      expect(response.statusCode).toBe(200);
      version = response.json().version;
    }
    expect((await request("GET", "/staff/me", staff)).json().resolved).toBe(1);
    const second = (await request("GET", "/staff/me", secondCookie)).json();
    expect(second.resolved).toBe(1);
    expect(
      (await request("GET", "/staff/resolved?status=REJECTED", secondCookie)).json().total,
    ).toBe(0);
    expect(second.recent.map((report: { id: string }) => report.id)).toEqual([id]);
    expect(
      (await request("GET", "/staff/resolved", secondCookie))
        .json()
        .data.map((report: { id: string }) => report.id),
    ).toEqual([id]);
    const before = (await request("GET", "/anonymous/me", a)).json();
    const logout = await request("POST", "/staff/logout", secondCookie + "; " + a, {});
    expect(logout.statusCode).toBe(200);
    expect(logout.headers["set-cookie"]!.toString()).toContain("cf_staff=");
    expect(logout.headers["set-cookie"]!.toString()).not.toContain("cf_session=");
    expect((await request("GET", "/staff/me", secondCookie)).statusCode).toBe(401);
    expect((await request("GET", "/anonymous/me", a)).json()).toEqual(before);
  });
  it("rejection requires a note and remains terminal", async () => {
    const version = (await request("GET", "/reports/" + otherId, a)).json().version;
    expect(
      (
        await request("POST", "/staff/requests/" + otherId + "/status", staff, {
          status: "REJECTED",
          note: "",
          version,
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await request("POST", "/staff/requests/" + otherId + "/status", staff, {
          status: "REJECTED",
          note: "Fictional item cannot be identified.",
          version,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await request("POST", "/staff/requests/" + otherId + "/status", staff, {
          status: "ACCEPTED",
          note: "Try reopening",
          version: version + 1,
        })
      ).statusCode,
    ).toBe(409);
  });

  it("expires pairing codes, rejects outsiders, and throttles guesses", async () => {
    const start = (await request("POST", "/anonymous/link/start", a, {})).json();
    await db!.linkRequest.update({
      where: { id: start.requestId },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    expect(
      (await request("POST", "/anonymous/link/request", b, { code: start.code })).statusCode,
    ).toBe(400);
    expect((await request("GET", "/anonymous/link/status/" + start.requestId, b)).statusCode).toBe(
      403,
    );
    let response;
    for (let i = 0; i < 6; i++)
      response = await request("POST", "/anonymous/link/request", b, { code: "000000000000" });
    expect(response!.statusCode).toBe(429);
  });
  it("blocks inactive staff even with a previously valid session", async () => {
    await db!.staff.update({ where: { email }, data: { active: false } });
    expect((await request("GET", "/staff/requests", staff)).statusCode).toBe(401);
    expect(
      (await request("POST", "/staff/login", "", { username: email, password })).statusCode,
    ).toBe(401);
    await db!.staff.update({ where: { email }, data: { active: true } });
  });
  it("rejects script images and oversized uploads", async () => {
    const mediaBefore = await db!.media.count();
    const filesBefore = (await readdir(process.env.MEDIA_STORAGE_DIR ?? "storage/media")).sort();
    const boundary = "security-fixture";
    for (const [mime, bytes] of [
      ["image/svg+xml", Buffer.from("<svg/>")],
      ["image/png", Buffer.from("not an image despite its declared MIME")],
      ["image/png", Buffer.alloc(5 * 1024 * 1024 + 1)],
    ] as const) {
      const payload = Buffer.concat([
        Buffer.from(
          "--" +
            boundary +
            '\r\nContent-Disposition: form-data; name="photo"; filename="test"\r\nContent-Type: ' +
            mime +
            "\r\n\r\n",
        ),
        bytes,
        Buffer.from("\r\n--" + boundary + "--\r\n"),
      ]);
      const result = await app.inject({
        method: "POST",
        url: "/api/media",
        remoteAddress: "127.0.0.3",
        headers: { ...headers(a), "content-type": "multipart/form-data; boundary=" + boundary },
        payload,
      });
      expect([400, 413]).toContain(result.statusCode);
    }
    expect(await db!.media.count()).toBe(mediaBefore);
    expect((await readdir(process.env.MEDIA_STORAGE_DIR ?? "storage/media")).sort()).toEqual(
      filesBefore,
    );
  });
  it("sorts the open queue by votes then age and enforces immutable events", async () => {
    const rows = (await request("GET", "/staff/requests?limit=50", staff)).json().data;
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].confirmationCount).toBeGreaterThanOrEqual(rows[i].confirmationCount);
      if (rows[i - 1].confirmationCount === rows[i].confirmationCount)
        expect(new Date(rows[i - 1].createdAt).getTime()).toBeLessThanOrEqual(
          new Date(rows[i].createdAt).getTime(),
        );
    }
    expect(
      rows.every((r: { status: string }) =>
        ["REPORTED", "ACCEPTED", "IN_PROGRESS"].includes(r.status),
      ),
    ).toBe(true);
    const event = await db!.statusEvent.findFirstOrThrow({ where: { reportId } });
    await expect(
      db!.statusEvent.update({ where: { id: event.id }, data: { note: "Forbidden rewrite" } }),
    ).rejects.toThrow();
  });
});
