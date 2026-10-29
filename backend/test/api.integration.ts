import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/environment.js";
import { PrismaService } from "../src/database/prisma.service.js";
import { assertTestDatabase } from "./test-database.js";

const url = assertTestDatabase(process.env.NODE_ENV, process.env.DATABASE_URL);
const owner = `test-${randomUUID()}`;
const stranger = `test-${randomUUID()}`;
const pair = await generateKeyPair("RS256");
const foreignPair = await generateKeyPair("RS256");
const jwk = {
  ...(await exportJWK(pair.publicKey)),
  kid: "integration-key",
  alg: "RS256",
  use: "sig",
};
const jwks = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ keys: [jwk] }));
});
let app: NestFastifyApplication;
let http: FastifyInstance;
let issuer: string;
let token: string;
let db: PrismaService;
function settings() {
  return parseEnvironment({
    NODE_ENV: "test",
    DATABASE_URL: url,
    LOG_LEVEL: "silent",
    OIDC_ISSUER: issuer,
    OIDC_AUDIENCE: "campus-test",
    OIDC_JWKS_URI: `${issuer}/jwks`,
    RATE_LIMIT_MAX: "1000",
    DB_CONNECT_TIMEOUT_MS: "300",
    DB_QUERY_TIMEOUT_MS: "500",
  });
}
async function accessToken(
  options: {
    subject?: string;
    scope?: string;
    expiration?: string;
    audience?: string;
    issuer?: string;
    foreign?: boolean;
    algorithm?: string;
    omitExpiry?: boolean;
  } = {},
) {
  let jwt = new SignJWT({ scope: options.scope ?? "projects:read projects:write" })
    .setProtectedHeader({ alg: options.algorithm ?? "RS256", kid: "integration-key" })
    .setSubject(options.subject ?? owner)
    .setIssuer(options.issuer ?? issuer)
    .setAudience(options.audience ?? "campus-test")
    .setIssuedAt();
  if (!options.omitExpiry) jwt = jwt.setExpirationTime(options.expiration ?? "5m");
  return jwt.sign(options.foreign ? foreignPair.privateKey : pair.privateKey);
}
const headers = () => ({ authorization: `Bearer ${token}` });
before(async () => {
  jwks.listen(0, "127.0.0.1");
  await once(jwks, "listening");
  const address = jwks.address();
  assert.ok(address && typeof address !== "string");
  issuer = `http://127.0.0.1:${address.port}`;
  app = await createApp(settings());
  http = app.getHttpAdapter().getInstance();
  db = app.get(PrismaService);
  // Fail, rather than silently skip, if committed migrations have not been applied.
  await db.project.count();
  token = await accessToken();
});
after(async () => {
  try {
    if (db) {
      assertTestDatabase(process.env.NODE_ENV, url);
      // Only delete this run's records; never truncate/drop/reset a database.
      await db.project.deleteMany({ where: { ownerId: { in: [owner, stranger] } } });
    }
  } finally {
    if (app) await app.close();
    jwks.close();
    jwks.closeAllConnections();
  }
});

test("liveness, readiness and frontend compatibility", async () => {
  for (const path of ["/health/live", "/health/ready", "/api/health"]) {
    const response = await http.inject({ method: "GET", url: path });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: "ok" });
    assert.match(String(response.headers["x-request-id"]), /^[a-f\d-]{36}$/);
  }
});
test("missing, expired, invalid signature, issuer, audience, algorithm and exp are rejected", async () => {
  const missing = await http.inject({ method: "GET", url: "/api/v1/projects" });
  assert.equal(missing.statusCode, 401);
  const invalidTokens = [
    "broken",
    await accessToken({ expiration: "-1m" }),
    await accessToken({ foreign: true }),
    await accessToken({ issuer: "https://wrong.example" }),
    await accessToken({ audience: "wrong-api" }),
    await accessToken({ omitExpiry: true }),
  ];
  // HS256 must never be confused with an RSA public key.
  invalidTokens.push(
    await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("test-only-integration-key-32-bytes")),
  );
  for (const invalid of invalidTokens) {
    const response = await http.inject({
      method: "GET",
      url: "/api/v1/projects",
      headers: { authorization: `Bearer ${invalid}` },
    });
    assert.equal(response.statusCode, 401);
    assert.equal(response.json().code, "UNAUTHORIZED");
  }
  const denied = await http.inject({
    method: "POST",
    url: "/api/v1/projects",
    headers: { authorization: `Bearer ${await accessToken({ scope: "projects:read" })}` },
    payload: { name: "One", slug: "one" },
  });
  assert.equal(denied.statusCode, 403);
});
test("CRUD, atomic uniqueness and owner isolation", async () => {
  const input = { name: "Library", slug: "library", description: "Repairs" };
  const create = () =>
    http.inject({ method: "POST", url: "/api/v1/projects", headers: headers(), payload: input });
  const concurrent = await Promise.all([create(), create()]);
  assert.deepEqual(concurrent.map((r) => r.statusCode).sort(), [201, 409]);
  const created = concurrent.find((r) => r.statusCode === 201)?.json();
  assert.ok(created);
  assert.equal(created.ownerId, undefined);
  const path = `/api/v1/projects/${created.id}`;
  assert.equal(
    (await http.inject({ method: "GET", url: path, headers: headers() })).json().name,
    "Library",
  );
  const otherHeaders = { authorization: `Bearer ${await accessToken({ subject: stranger })}` };
  for (const method of ["GET", "PATCH", "DELETE"] as const) {
    const response = await http.inject({
      method,
      url: path,
      headers: otherHeaders,
      ...(method === "PATCH" ? { payload: { name: "Stolen" } } : {}),
    });
    assert.equal(response.statusCode, 404);
  }
  assert.deepEqual(
    (await http.inject({ method: "GET", url: "/api/v1/projects", headers: otherHeaders })).json()
      .data,
    [],
  );
  assert.equal(
    (
      await http.inject({
        method: "PATCH",
        url: path,
        headers: headers(),
        payload: { name: "Updated" },
      })
    ).json().name,
    "Updated",
  );
  const second = await http.inject({
    method: "POST",
    url: "/api/v1/projects",
    headers: headers(),
    payload: { name: "Second", slug: "second" },
  });
  assert.equal(second.statusCode, 201);
  const conflict = await http.inject({
    method: "PATCH",
    url: path,
    headers: headers(),
    payload: { name: "Must roll back", slug: "second" },
  });
  assert.equal(conflict.statusCode, 409);
  assert.equal(
    (await http.inject({ method: "GET", url: path, headers: headers() })).json().name,
    "Updated",
  );
  const page = await http.inject({
    method: "GET",
    url: "/api/v1/projects?limit=1&page=1",
    headers: headers(),
  });
  const next = await http.inject({
    method: "GET",
    url: "/api/v1/projects?limit=1&page=2",
    headers: headers(),
  });
  assert.equal(page.json().data.length, 1);
  assert.notEqual(page.json().data[0].id, next.json().data[0].id);
  assert.equal(
    (await http.inject({ method: "DELETE", url: path, headers: headers() })).statusCode,
    204,
  );
  for (const method of ["GET", "PATCH", "DELETE"] as const) {
    assert.equal(
      (
        await http.inject({
          method,
          url: path,
          headers: headers(),
          ...(method === "PATCH" ? { payload: { name: "Gone" } } : {}),
        })
      ).statusCode,
      404,
    );
  }
});
test("validation rejects protected fields, nulls, blank names, oversized bodies and malformed pagination", async () => {
  for (const payload of [
    { name: " ", slug: "valid" },
    { name: "One", slug: "INVALID" },
    { name: "One", slug: "valid", ownerId: "someone" },
    { name: null, slug: "valid" },
    { name: "One", slug: "valid", role: "admin" },
  ]) {
    assert.equal(
      (await http.inject({ method: "POST", url: "/api/v1/projects", headers: headers(), payload }))
        .statusCode,
      400,
    );
  }
  for (const query of [
    "limit=101",
    "page=0",
    "limit=1e2",
    "page=",
    "unknown=1",
    "limit=2&limit=3",
  ]) {
    assert.equal(
      (await http.inject({ method: "GET", url: `/api/v1/projects?${query}`, headers: headers() }))
        .statusCode,
      400,
    );
  }
  assert.equal(
    (await http.inject({ method: "GET", url: "/api/v1/projects/not-a-uuid", headers: headers() }))
      .statusCode,
    400,
  );
  for (const payload of [{}, { name: null }, { description: null }]) {
    assert.equal(
      (
        await http.inject({
          method: "PATCH",
          url: `/api/v1/projects/${randomUUID()}`,
          headers: headers(),
          payload,
        })
      ).statusCode,
      400,
    );
  }
  const large = await http.inject({
    method: "POST",
    url: "/api/v1/projects",
    headers: headers(),
    payload: { name: "x".repeat(20000) },
  });
  assert.equal(large.statusCode, 413);
  assert.equal(large.json().code, "PAYLOAD_TOO_LARGE");
});
test("CORS, security headers and per-process rate limits", async () => {
  const trusted = await http.inject({
    method: "GET",
    url: "/health/live",
    headers: { origin: "http://localhost:3000" },
  });
  assert.equal(trusted.headers["access-control-allow-origin"], "http://localhost:3000");
  assert.equal(trusted.headers["x-content-type-options"], "nosniff");
  const untrusted = await http.inject({
    method: "GET",
    url: "/health/live",
    headers: { origin: "https://untrusted.example" },
  });
  assert.equal(untrusted.headers["access-control-allow-origin"], undefined);
  const limited = await createApp({ ...settings(), RATE_LIMIT_MAX: 1 });
  try {
    const server: FastifyInstance = limited.getHttpAdapter().getInstance();
    await server.inject({ method: "GET", url: "/api/v1/projects", headers: headers() });
    const result = await server.inject({
      method: "GET",
      url: "/api/v1/projects",
      headers: headers(),
    });
    assert.equal(result.statusCode, 429);
    assert.equal(result.json().code, "RATE_LIMITED");
  } finally {
    await limited.close();
  }
});
test("business routes fail closed without an identity provider", async () => {
  const closed = await createApp({
    ...settings(),
    OIDC_ISSUER: undefined,
    OIDC_AUDIENCE: undefined,
    OIDC_JWKS_URI: undefined,
  });
  try {
    const server: FastifyInstance = closed.getHttpAdapter().getInstance();
    assert.equal(
      (await server.inject({ method: "GET", url: "/api/v1/projects", headers: headers() }))
        .statusCode,
      401,
    );
  } finally {
    await closed.close();
  }
});
test("database outage affects readiness, with bounded response time, while liveness stays healthy", async () => {
  const outage = new URL(url);
  outage.hostname = "127.0.0.1";
  outage.port = "1";
  const unavailable = await createApp({ ...settings(), DATABASE_URL: outage.toString() });
  try {
    const server: FastifyInstance = unavailable.getHttpAdapter().getInstance();
    assert.equal((await server.inject({ method: "GET", url: "/health/live" })).statusCode, 200);
    const start = Date.now();
    const ready = await server.inject({ method: "GET", url: "/health/ready" });
    assert.equal(ready.statusCode, 503);
    assert.ok(Date.now() - start < 5000);
    assert.doesNotMatch(ready.body, /postgresql|password|SELECT|stack/);
  } finally {
    await unavailable.close();
  }
});
test("runtime database role cannot create tables or edit migration history", async () => {
  await assert.rejects(db.$executeRaw`CREATE TABLE public.forbidden_test_table (id integer)`);
  await assert.rejects(db.$queryRaw`SELECT * FROM "_prisma_migrations"`);
});
