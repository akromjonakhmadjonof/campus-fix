import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/environment.js";
import { PrismaService } from "../src/database/prisma.service.js";
import { digest, hashPassword } from "../src/campus/rules.js";
import { assertTestDatabase } from "./test-database.js";

const url = assertTestDatabase(process.env.NODE_ENV, process.env.DATABASE_URL);
const run = randomUUID();
const locationId = "test-" + run;
const childLocationId = "child-" + run;
const username = "test-" + run;
const password = "Test-only password " + run;
const guestHashes: string[] = [];
let uploads: string;
let app: NestFastifyApplication;
let http: FastifyInstance;
let db: PrismaService;
const mutation = { "x-campusfix-request": "1", origin: "http://localhost:3000" };
const headers = (cookie: string) => ({ ...mutation, cookie });
function cookieFrom(response: { headers: Record<string, unknown> }, name: string) {
  const raw = response.headers["set-cookie"];
  const values = Array.isArray(raw) ? raw : [raw];
  const value = values.map(String).find((item) => item.startsWith(name + "="));
  assert.ok(value);
  assert.match(value, /HttpOnly/i);
  assert.match(value, /SameSite=Strict/i);
  return value.split(";")[0] ?? "";
}
async function guest() {
  const response = await http.inject({
    method: "POST",
    url: "/api/v1/sessions",
    headers: mutation,
    payload: {},
  });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().id, undefined);
  const cookie = cookieFrom(response, "cf_guest");
  guestHashes.push(digest(cookie.slice("cf_guest=".length)));
  return cookie;
}
async function upload(cookie: string, body?: Buffer, mime = "image/png") {
  const boundary = "campus-" + randomUUID();
  const data =
    body ??
    (await sharp({ create: { width: 20, height: 20, channels: 3, background: "#4c7cf6" } })
      .png()
      .toBuffer());
  return http.inject({
    method: "POST",
    url: "/api/v1/photos",
    headers: { ...headers(cookie), "content-type": "multipart/form-data; boundary=" + boundary },
    payload: Buffer.concat([
      Buffer.from(
        "--" +
          boundary +
          '\r\nContent-Disposition: form-data; name="photo"; filename="test.png"\r\nContent-Type: ' +
          mime +
          "\r\n\r\n",
      ),
      data,
      Buffer.from("\r\n--" + boundary + "--\r\n"),
    ]),
  });
}
before(async () => {
  uploads = await mkdtemp(join(tmpdir(), "campus-photos-"));
  app = await createApp(
    parseEnvironment({
      NODE_ENV: "test",
      DATABASE_URL: url,
      UPLOAD_DIR: uploads,
      LOG_LEVEL: "silent",
      RATE_LIMIT_MAX: "1000",
    }),
  );
  http = app.getHttpAdapter().getInstance();
  db = app.get(PrismaService);
  await db.location.create({
    data: { id: locationId, name: "Test building", path: "Integration " + run },
  });
  await db.location.create({
    data: {
      id: childLocationId,
      name: "Test floor",
      path: "Integration " + run + " / Test floor",
      parentId: locationId,
    },
  });
  await db.staff.create({
    data: {
      username,
      displayName: "Fictional integration staff",
      passwordHash: await hashPassword(password),
    },
  });
});
after(async () => {
  try {
    if (db) {
      assertTestDatabase(process.env.NODE_ENV, url);
      const sessions = await db.guestSession.findMany({
        where: { tokenHash: { in: guestHashes } },
        select: { id: true },
      });
      const ids = sessions.map((s) => s.id);
      await db.report.deleteMany({ where: { guestId: { in: ids } } });
      await db.guestSession.deleteMany({ where: { id: { in: ids } } });
      await db.staff.deleteMany({ where: { username } });
      await db.location.deleteMany({ where: { id: childLocationId } });
      await db.location.deleteMany({ where: { id: locationId } });
    }
  } finally {
    if (app) await app.close();
    if (uploads) {
      for (const file of await readdir(uploads)) await unlink(join(uploads, file));
      await rmdir(uploads);
    }
  }
});
test("anonymous reports preserve ownership and staff workflow end to end", async (t) => {
  const owner = await guest();
  const other = await guest();
  const photo = await upload(owner);
  assert.equal(photo.statusCode, 201, photo.body);
  const attachmentId = photo.json().id as string;
  const input = {
    title: "Fountain leaking " + run,
    description: "Water is gathering below the fountain in the test corridor.",
    category: "PLUMBING",
    locationId: childLocationId,
    exactLocation: "Outside the test stairwell",
    attachmentId,
  };
  let reportId = "";
  await t.test("CSRF, real image validation and private unattached photos", async () => {
    assert.equal(
      (await http.inject({ method: "POST", url: "/api/v1/sessions", payload: {} })).statusCode,
      403,
    );
    assert.equal(
      (
        await http.inject({
          method: "POST",
          url: "/api/v1/sessions",
          headers: { ...mutation, origin: "https://untrusted.example" },
          payload: {},
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (await upload(owner, Buffer.from("<svg><script>alert(1)</script></svg>"), "image/svg+xml"))
        .statusCode,
      400,
    );
    assert.equal((await upload(owner, Buffer.from("not a png"))).statusCode, 400);
    assert.equal(
      (
        await http.inject({
          method: "GET",
          url: "/api/v1/photos/" + attachmentId,
          headers: { cookie: other },
        })
      ).statusCode,
      404,
    );
    const image = await http.inject({
      method: "GET",
      url: "/api/v1/photos/" + attachmentId,
      headers: { cookie: owner },
    });
    assert.equal(image.statusCode, 200);
    assert.match(String(image.headers["content-type"]), /image\/webp/);
  });
  await t.test("ownership fields rejected and stolen attachments roll back", async () => {
    const count = await db.report.count();
    assert.equal(
      (
        await http.inject({
          method: "POST",
          url: "/api/v1/reports",
          headers: headers(owner),
          payload: { ...input, guestId: randomUUID() },
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await http.inject({
          method: "POST",
          url: "/api/v1/reports",
          headers: headers(other),
          payload: input,
        })
      ).statusCode,
      400,
    );
    assert.equal(await db.report.count(), count);
    const created = await http.inject({
      method: "POST",
      url: "/api/v1/reports",
      headers: headers(owner),
      payload: input,
    });
    assert.equal(created.statusCode, 201, created.body);
    reportId = created.json().id;
    assert.equal(created.json().isMine, true);
    assert.equal(created.json().guestId, undefined);
    assert.equal(created.json().history[0].status, "REPORTED");
    assert.equal(
      (
        await http.inject({
          method: "POST",
          url: "/api/v1/reports",
          headers: headers(owner),
          payload: input,
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (await http.inject({ method: "GET", url: "/api/v1/photos/" + attachmentId })).statusCode,
      200,
    );
  });
  await t.test(
    "editing checks ownership, listing filters descendants and similar reports",
    async () => {
      const edit = {
        title: input.title,
        description: input.description,
        exactLocation: "Updated exact location",
      };
      assert.equal(
        (
          await http.inject({
            method: "PATCH",
            url: "/api/v1/reports/" + reportId,
            headers: headers(other),
            payload: edit,
          })
        ).statusCode,
        404,
      );
      assert.equal(
        (
          await http.inject({
            method: "PATCH",
            url: "/api/v1/reports/" + reportId,
            headers: headers(owner),
            payload: edit,
          })
        ).statusCode,
        200,
      );
      const list = await http.inject({
        method: "GET",
        url:
          "/api/v1/reports?locationId=" + locationId + "&category=PLUMBING&status=REPORTED&limit=1",
        headers: { cookie: owner },
      });
      assert.equal(list.statusCode, 200, list.body);
      assert.equal(list.json().total, 1);
      assert.equal(list.json().data[0].id, reportId);
      assert.equal(
        (
          await http.inject({
            method: "GET",
            url: "/api/v1/reports?activity=mine",
            headers: { cookie: other },
          })
        ).json().total,
        0,
      );
      assert.equal(
        (await http.inject({ method: "GET", url: "/api/v1/reports?activity=mine" })).statusCode,
        401,
      );
      assert.equal(
        (await http.inject({ method: "GET", url: "/api/v1/reports?limit=61" })).statusCode,
        400,
      );
      const similar = await http.inject({
        method: "POST",
        url: "/api/v1/reports/similar",
        headers: mutation,
        payload: {
          title: input.title,
          description: input.description,
          locationId: input.locationId,
          category: input.category,
        },
      });
      assert.equal(similar.statusCode, 200, similar.body);
      assert.equal(similar.json()[0].report.id, reportId);
      assert.equal(similar.json()[0].score, 1);
    },
  );
  await t.test("concurrent confirmations count once and appear in My Activity", async () => {
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        http.inject({
          method: "POST",
          url: "/api/v1/reports/" + reportId + "/confirm",
          headers: headers(other),
          payload: {},
        }),
      ),
    );
    for (const result of results) assert.equal(result.statusCode, 200, result.body);
    const detail = await http.inject({
      method: "GET",
      url: "/api/v1/reports/" + reportId,
      headers: { cookie: other },
    });
    assert.equal(detail.json().confirmationCount, 1);
    assert.equal(detail.json().confirmed, true);
    assert.equal(detail.json().isMine, false);
    assert.equal(detail.json().canEdit, false);
    const activity = await http.inject({
      method: "GET",
      url: "/api/v1/reports?activity=confirmed",
      headers: { cookie: other },
    });
    assert.equal(activity.json().data[0].id, reportId);
  });
  await t.test(
    "staff authentication, atomic transitions, immutable history and logout",
    async () => {
      const statusUrl = "/api/v1/staff/reports/" + reportId + "/status";
      const status = {
        status: "IN_PROGRESS",
        note: "The fictional technician is inspecting the drain.",
      };
      assert.equal(
        (
          await http.inject({
            method: "PATCH",
            url: statusUrl,
            headers: headers(owner),
            payload: status,
          })
        ).statusCode,
        401,
      );
      assert.equal(
        (
          await http.inject({
            method: "POST",
            url: "/api/v1/staff/login",
            headers: mutation,
            payload: { username, password: "wrong password long enough" },
          })
        ).statusCode,
        401,
      );
      const login = await http.inject({
        method: "POST",
        url: "/api/v1/staff/login",
        headers: mutation,
        payload: { username, password },
      });
      assert.equal(login.statusCode, 200, login.body);
      const staff = cookieFrom(login, "cf_staff");
      assert.equal(
        (
          await http.inject({
            method: "PATCH",
            url: statusUrl,
            headers: headers(staff),
            payload: { ...status, status: "RESOLVED" },
          })
        ).statusCode,
        409,
      );
      const competing = await Promise.all(
        [1, 2].map(() =>
          http.inject({
            method: "PATCH",
            url: statusUrl,
            headers: headers(staff),
            payload: status,
          }),
        ),
      );
      assert.deepEqual(competing.map((r) => r.statusCode).sort(), [200, 409]);
      assert.equal(
        (
          await http.inject({
            method: "PATCH",
            url: "/api/v1/reports/" + reportId,
            headers: headers(owner),
            payload: {
              title: input.title,
              description: input.description,
              exactLocation: input.exactLocation,
            },
          })
        ).statusCode,
        404,
      );
      const resolved = await http.inject({
        method: "PATCH",
        url: statusUrl,
        headers: headers(staff),
        payload: { status: "RESOLVED", note: "The drain is repaired and verified." },
      });
      assert.equal(resolved.statusCode, 200, resolved.body);
      assert.deepEqual(
        resolved.json().history.map((item: { status: string }) => item.status),
        ["REPORTED", "IN_PROGRESS", "RESOLVED"],
      );
      assert.equal(resolved.json().history[1].staffId, undefined);
      const summary = await http.inject({ method: "GET", url: "/api/v1/summary" });
      assert.equal(summary.json().days.length, 7);
      assert.ok(summary.json().counts.RESOLVED >= 1);
      assert.equal(
        (
          await http.inject({
            method: "POST",
            url: "/api/v1/staff/logout",
            headers: headers(staff),
            payload: {},
          })
        ).statusCode,
        200,
      );
      assert.equal(
        (
          await http.inject({
            method: "GET",
            url: "/api/v1/staff/session",
            headers: { cookie: staff },
          })
        ).json().staff,
        null,
      );
    },
  );
  await t.test("expired ownership cookie cannot edit or confirm", async () => {
    await db.guestSession.updateMany({
      where: { tokenHash: digest(owner.slice("cf_guest=".length)) },
      data: { expiresAt: new Date(0) },
    });
    assert.equal(
      (
        await http.inject({
          method: "POST",
          url: "/api/v1/reports/" + reportId + "/confirm",
          headers: headers(owner),
          payload: {},
        })
      ).statusCode,
      401,
    );
  });
});
