import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, unlink, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import {
  digest,
  secret,
  hashPassword,
  verifyPassword,
  uuid,
  statuses,
  transitions,
  reportSchema,
  editSchema,
  similarSchema,
  similarity,
} from "./domain.js";
import type { Prisma, Session, Staff } from "./generated/prisma/client.js";

export function fail(statusCode: number, code: string): never {
  throw Object.assign(new Error(code), { statusCode, code });
}
const include = {
  location: true,
  issueType: { include: { group: true } },
  attachments: { include: { media: { select: { id: true } } }, orderBy: { sortOrder: "asc" } },
  history: {
    select: {
      id: true,
      status: true,
      fromStatus: true,
      note: true,
      actorType: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  _count: { select: { votes: true } },
} satisfies Prisma.ReportInclude;
type Row = Prisma.ReportGetPayload<{ include: typeof include }>;
function present(row: Row, profileId?: string, confirmed = false) {
  return {
    id: row.id,
    reference: "CF-" + String(row.reference).padStart(6, "0"),
    title: row.title,
    description: row.description,
    category: row.category,
    issueType: row.issueType,
    issueTypeId: row.issueTypeId,
    customIssueName: row.customIssueName,
    exactLocation: row.exactLocation,
    status: row.status,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    resolvedAt:
      row.status === "RESOLVED"
        ? ([...row.history].reverse().find((event) => event.status === "RESOLVED")?.createdAt ??
          null)
        : null,
    location: {
      id: row.location.id,
      name: row.location.name,
      path: row.location.path,
      parentId: row.location.parentId,
    },
    photos: row.attachments.map((a) => ({
      id: a.media.id,
      url: "/backend/media/" + a.media.id + "/content",
    })),
    history: row.history,
    confirmationCount: row._count.votes,
    isMine: row.profileId === profileId,
    confirmed,
    canEdit: row.profileId === profileId && row.status === "REPORTED",
  };
}
function resolvedBy(staffId: string): Prisma.ReportWhereInput {
  return {
    deletedAt: null,
    status: "RESOLVED",
    resolvedById: staffId,
    history: { some: { status: "RESOLVED", actorType: "staff", staffId } },
  };
}
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  q: z.string().max(120).optional(),
  status: z.enum(statuses).optional(),
  category: z.string().max(40).optional(),
  group: uuid.optional(),
  type: uuid.optional(),
  locationId: uuid.optional(),
  sort: z.enum(["newest", "oldest", "confirmed", "status"]).default("newest"),
  activity: z.enum(["mine", "confirmed"]).optional(),
  scope: z.enum(["mine", "all"]).optional(),
});
export async function campusRoutes(app: FastifyInstance) {
  await app.register(cookie);
  // Reads and media share the local Next proxy address; allow normal multi-page browsing.
  await app.register(rateLimit, { max: 600, timeWindow: 60000 });
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2 } });
  const root = resolve(process.env.MEDIA_STORAGE_DIR ?? "storage/media");
  await mkdir(root, { recursive: true });
  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((s) => s.trim());
  const db = () => app.database ?? fail(503, "DATABASE_UNAVAILABLE");
  const secure = process.env.NODE_ENV === "production";
  async function cleanupStagedMedia() {
    if (!app.database) return;
    const stale = await db().media.findMany({
      where: {
        createdAt: { lt: new Date(Date.now() - 86400000) },
        attachments: { none: {} },
        avatarProfiles: { none: {} },
      },
      take: 100,
    });
    for (const item of stale) {
      if (!/^[a-f0-9-]+\.webp$/.test(item.storageKey)) continue;
      const removed = await db().media.deleteMany({
        where: { id: item.id, attachments: { none: {} }, avatarProfiles: { none: {} } },
      });
      if (removed.count) await unlink(resolve(root, item.storageKey)).catch(() => {});
    }
  }
  const cleanupTimer = setInterval(() => {
    void cleanupStagedMedia().catch(() => app.log.warn("Staged media cleanup unavailable"));
  }, 3600000);
  cleanupTimer.unref();
  app.addHook("onClose", async () => {
    clearInterval(cleanupTimer);
  });
  app.addHook("onReady", async () => {
    void cleanupStagedMedia().catch(() => app.log.warn("Staged media cleanup unavailable"));
  });

  app.addHook("onRequest", async (req, reply) => {
    reply.header("cache-control", "private, no-store").header("x-content-type-options", "nosniff");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.headers["x-campusfix-request"] !== "1") fail(403, "CSRF_REJECTED");
      if (req.headers.origin && !origins.includes(req.headers.origin)) fail(403, "CSRF_REJECTED");
    }
  });
  async function session(req: FastifyRequest, required?: true): Promise<Session>;
  async function session(req: FastifyRequest, required: false): Promise<Session | null>;
  async function session(req: FastifyRequest, required = true) {
    const token = req.cookies.cf_guest;
    const row =
      token && /^[a-f0-9]{64}$/.test(token)
        ? await db().session.findUnique({ where: { tokenHash: digest(token) } })
        : null;
    if (row && !row.revokedAt && row.expiresAt > new Date()) return row;
    if (required) fail(401, "SESSION_REQUIRED");
    return null;
  }
  async function staff(req: FastifyRequest, required?: true): Promise<Staff>;
  async function staff(req: FastifyRequest, required: false): Promise<Staff | null>;
  async function staff(req: FastifyRequest, required = true) {
    const token = req.cookies.cf_staff;
    const row =
      token && /^[a-f0-9]{64}$/.test(token)
        ? await db().staffSession.findUnique({
            where: { tokenHash: digest(token) },
            include: { staff: true },
          })
        : null;
    if (row && row.expiresAt > new Date() && row.staff.active) return row.staff;
    if (required) fail(401, "STAFF_REQUIRED");
    return null;
  }
  function setCookie(reply: FastifyReply, name: string, token: string, maxAge: number) {
    reply.setCookie(name, token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge });
  }
  const dummy = hashPassword(secret());
  async function getReport(id: string, profileId?: string) {
    const row = await db().report.findFirst({ where: { id, deletedAt: null }, include });
    if (!row) fail(404, "REPORT_NOT_FOUND");
    const vote = profileId
      ? await db().vote.findUnique({ where: { reportId_profileId: { reportId: id, profileId } } })
      : null;
    return present(row, profileId, !!vote);
  }
  async function similar(input: z.infer<typeof similarSchema>) {
    const location = await db().location.findUnique({ where: { id: input.locationId } });
    if (!location) fail(400, "INVALID_LOCATION");
    const rows = await db().report.findMany({
      where: {
        deletedAt: null,
        status: { in: ["REPORTED", "ACCEPTED", "IN_PROGRESS"] },
        id: input.excludeId ? { not: input.excludeId } : undefined,
        OR: [{ locationId: input.locationId }, { issueTypeId: input.issueTypeId }],
      },
      include,
      take: 100,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    });
    return rows
      .map((row) => {
        const sameLocation = row.locationId === input.locationId,
          sameType = row.issueTypeId === input.issueTypeId;
        const nearby =
          !!location &&
          (row.location.path.startsWith(location.path + " / ") ||
            location.path.startsWith(row.location.path + " / "));
        const overlap = similarity(
          input.title + " " + (input.description ?? "") + " " + (input.exactLocation ?? ""),
          row.title + " " + row.description + " " + row.exactLocation,
        );
        const score = Math.round(
          (sameLocation ? 35 : nearby ? 10 : 0) + (sameType ? 25 : 0) + 35 * overlap + 5,
        );
        return {
          report: present(row),
          score,
          reasons: [
            ...(sameLocation ? ["same_location"] : nearby ? ["nearby_location"] : []),
            ...(sameType ? ["same_type"] : []),
            ...(overlap > 0.1 ? ["similar_description"] : []),
          ],
        };
      })
      .filter((r) => r.score >= 45)
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.report.confirmationCount - a.report.confirmationCount ||
          a.report.createdAt.getTime() - b.report.createdAt.getTime(),
      )
      .slice(0, 5);
  }
  const bootstrap = async (req: FastifyRequest, reply: FastifyReply) => {
    let current = await session(req, false);
    if (!current) {
      const token = secret();
      current = await db().session.create({
        data: {
          tokenHash: digest(token),
          expiresAt: new Date(Date.now() + 30 * 86400000),
          profile: { create: {} },
        },
      });
      setCookie(reply, "cf_guest", token, 30 * 86400);
    }
    return { active: true, expiresAt: current.expiresAt };
  };
  app.post(
    "/anonymous/session",
    { config: { rateLimit: { max: 60, timeWindow: 60000 } } },
    bootstrap,
  );
  // Existing web clients can upgrade without losing their route contract.
  app.post("/v1/sessions", { config: { rateLimit: { max: 60, timeWindow: 60000 } } }, bootstrap);
  async function presentProfile(req: FastifyRequest) {
    const current = await session(req);
    const profile = await db().profile.findUniqueOrThrow({
      where: { id: current.profileId },
      select: {
        id: true,
        displayName: true,
        avatarMediaId: true,
        createdAt: true,
        _count: { select: { reports: true } },
        sessions: {
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
          select: { id: true, createdAt: true },
        },
      },
    });
    return {
      alias: profile.displayName ?? "Guest Reporter",
      displayName: profile.displayName,
      avatar: profile.avatarMediaId
        ? { id: profile.avatarMediaId, url: "/backend/media/" + profile.avatarMediaId + "/content" }
        : null,
      createdAt: profile.createdAt,
      reportCount: profile._count.reports,
      linkedSessions: profile.sessions.length,
      sessions: profile.sessions.map((s) => ({
        id: s.id,
        current: s.id === current.id,
        createdAt: s.createdAt,
      })),
    };
  }
  app.get("/anonymous/me", presentProfile);
  app.patch(
    "/anonymous/me",
    { config: { rateLimit: { max: 20, timeWindow: 60000 } } },
    async (req) => {
      const current = await session(req);
      const input = z
        .object({
          displayName: z
            .string()
            .trim()
            .min(2)
            .max(60)
            .refine(
              (value) =>
                Array.from(value).every(
                  (char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127,
                ) && !/[\u202a-\u202e\u2066-\u2069]/.test(value),
            ),
          avatarMediaId: uuid.nullable(),
        })
        .strict()
        .parse(req.body);
      await db().$transaction(async (tx) => {
        if (input.avatarMediaId) {
          const image = await tx.media.findFirst({
            where: {
              id: input.avatarMediaId,
              profileId: current.profileId,
              attachments: { none: {} },
              OR: [
                { avatarProfiles: { some: { id: current.profileId } } },
                {
                  avatarProfiles: { none: {} },
                  createdAt: { gte: new Date(Date.now() - 86400000) },
                },
              ],
            },
          });
          if (!image) fail(400, "INVALID_MEDIA");
        }
        await tx.profile.update({ where: { id: current.profileId }, data: input });
        await tx.auditEvent.create({
          data: {
            actorType: "anonymous",
            actorId: current.profileId,
            action: "profile.edit",
            entityId: current.profileId,
          },
        });
      });
      return presentProfile(req);
    },
  );
  app.get("/locations", () =>
    db().location.findMany({
      select: { id: true, name: true, path: true, parentId: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
  );
  app.get("/issue-groups", () =>
    db().issueGroup.findMany({
      include: { types: { orderBy: { code: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
  );
  async function list(req: FastifyRequest, mode?: "queue" | "resolved") {
    const query = querySchema.parse(req.query),
      current = await session(req, false),
      worker = mode ? await staff(req) : null;
    if ((query.activity || query.scope === "mine") && !current) fail(401, "SESSION_REQUIRED");
    const selected = query.locationId
      ? await db().location.findUnique({ where: { id: query.locationId } })
      : null;
    if (query.locationId && !selected) fail(400, "INVALID_LOCATION");
    const where: Prisma.ReportWhereInput = {
      deletedAt: null,
      status:
        query.status ??
        (mode === "queue"
          ? { in: ["REPORTED", "ACCEPTED", "IN_PROGRESS"] }
          : mode === "resolved"
            ? "RESOLVED"
            : undefined),
      ...(mode === "resolved"
        ? {
            ...resolvedBy(worker?.id ?? fail(401, "STAFF_REQUIRED")),
            ...(query.status ? { AND: { status: query.status } } : {}),
          }
        : {}),
      ...(query.activity === "mine" || query.scope === "mine"
        ? { profileId: current?.profileId ?? fail(401, "SESSION_REQUIRED") }
        : {}),
      ...(query.activity === "confirmed"
        ? { votes: { some: { profileId: current?.profileId ?? fail(401, "SESSION_REQUIRED") } } }
        : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.type ? { issueTypeId: query.type } : {}),
      ...(query.group ? { issueType: { groupId: query.group } } : {}),
      ...(selected
        ? {
            location: {
              OR: [{ id: selected.id }, { path: { startsWith: selected.path + " / " } }],
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" } },
              { description: { contains: query.q, mode: "insensitive" } },
              { location: { path: { contains: query.q, mode: "insensitive" } } },
              { issueType: { labelEn: { contains: query.q, mode: "insensitive" } } },
              { issueType: { labelEs: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const sort =
      mode === "queue" && !(req.query as Record<string, unknown>).sort ? "confirmed" : query.sort;
    const orderBy: Prisma.ReportOrderByWithRelationInput[] =
      sort === "confirmed"
        ? [{ votes: { _count: "desc" } }, { createdAt: mode ? "asc" : "desc" }, { id: "asc" }]
        : sort === "status"
          ? [{ status: "asc" }, { createdAt: "asc" }, { id: "asc" }]
          : [
              {
                [mode === "resolved" ? "updatedAt" : "createdAt"]:
                  sort === "oldest" ? "asc" : "desc",
              },
              { id: "asc" },
            ];
    const [rows, total] = await db().$transaction(
      [
        db().report.findMany({
          where,
          include,
          orderBy,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        db().report.count({ where }),
      ],
      { isolationLevel: "RepeatableRead" },
    );
    const votes = current
      ? await db().vote.findMany({
          where: { profileId: current.profileId, reportId: { in: rows.map((r) => r.id) } },
          select: { reportId: true },
        })
      : [];
    return {
      data: rows.map((r) =>
        present(
          r,
          current?.profileId,
          votes.some((v) => v.reportId === r.id),
        ),
      ),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
  app.get("/reports", (req) => list(req));
  app.post(
    "/reports/similar",
    { config: { rateLimit: { max: 60, timeWindow: 60000 } } },
    async (req) => similar(similarSchema.parse(req.body)),
  );
  app.get("/reports/:id", async (req) =>
    getReport(
      uuid.parse((req.params as { id: string }).id),
      (await session(req, false))?.profileId,
    ),
  );
  app.post(
    "/reports",
    { config: { rateLimit: { max: 20, timeWindow: 60000 } } },
    async (req, reply) => {
      const current = await session(req),
        input = reportSchema.parse(req.body);
      const previous = await db().report.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (previous) {
        if (previous.profileId !== current.profileId) fail(409, "KEY_CONFLICT");
        return getReport(previous.id, current.profileId);
      }
      const type = await db().issueType.findUnique({ where: { id: input.issueTypeId } });
      if (!type) fail(400, "INVALID_TYPE");
      if (type.groupId !== input.issueGroupId) fail(400, "INVALID_GROUP_TYPE");
      if (!(await db().location.findUnique({ where: { id: input.locationId } })))
        fail(400, "INVALID_LOCATION");
      if (type.code.startsWith("other_") && !input.customIssueName?.trim())
        fail(400, "CUSTOM_ISSUE_REQUIRED");
      const matches = await similar(input);
      if (matches.some((m) => m.score >= 75) && !input.duplicateAcknowledged)
        return reply.code(409).send({ code: "DUPLICATE_REVIEW_REQUIRED", matches });
      const report = await db().$transaction(async (tx) => {
        const owned = await tx.media.count({
          where: {
            id: { in: input.attachmentIds },
            profileId: current.profileId,
            createdAt: { gte: new Date(Date.now() - 86400000) },
            attachments: { none: {} },
            avatarProfiles: { none: {} },
          },
        });
        if (owned !== new Set(input.attachmentIds).size || owned !== input.attachmentIds.length)
          fail(400, "INVALID_MEDIA");
        const row = await tx.report.create({
          data: {
            title: input.title,
            description: input.description,
            exactLocation: input.exactLocation,
            locationId: input.locationId,
            issueTypeId: input.issueTypeId,
            category: input.category,
            customIssueName: input.customIssueName,
            idempotencyKey: input.idempotencyKey,
            profileId: current.profileId,
            history: { create: { status: "REPORTED", actorType: "anonymous", note: "" } },
            attachments: {
              create: input.attachmentIds.map((mediaId, sortOrder) => ({ mediaId, sortOrder })),
            },
          },
        });
        await tx.auditEvent.create({
          data: {
            actorType: "anonymous",
            actorId: current.profileId,
            action: "report.create",
            entityId: row.id,
          },
        });
        return row;
      });
      return reply.code(201).send(await getReport(report.id, current.profileId));
    },
  );
  app.patch("/reports/:id", async (req) => {
    const current = await session(req),
      id = uuid.parse((req.params as { id: string }).id),
      input = editSchema.parse(req.body);
    await db().$transaction(async (tx) => {
      const report = await tx.report.findUnique({ where: { id } });
      if (!report) fail(404, "REPORT_NOT_FOUND");
      if (report.profileId !== current.profileId) fail(403, "NOT_OWNER");
      if (report.status !== "REPORTED" || report.version !== input.version)
        fail(409, "STALE_REPORT");
      if (input.locationId && !(await tx.location.findUnique({ where: { id: input.locationId } })))
        fail(400, "INVALID_LOCATION");
      const type = await tx.issueType.findUnique({
        where: { id: input.issueTypeId ?? report.issueTypeId },
      });
      if (!type) fail(400, "INVALID_TYPE");
      if (
        (input.issueTypeId && !input.issueGroupId) ||
        (input.issueGroupId && type.groupId !== input.issueGroupId)
      )
        fail(400, "INVALID_GROUP_TYPE");
      if (
        type.code.startsWith("other_") &&
        !(input.customIssueName ?? report.customIssueName)?.trim()
      )
        fail(400, "CUSTOM_ISSUE_REQUIRED");
      const { version, attachmentIds, ...fields } = input;
      const { issueGroupId, ...data } = fields;
      void issueGroupId;
      if (attachmentIds) {
        const allowed = await tx.media.count({
          where: {
            id: { in: attachmentIds },
            profileId: current.profileId,
            avatarProfiles: { none: {} },
            OR: [{ attachments: { none: {} } }, { attachments: { some: { reportId: id } } }],
          },
        });
        if (allowed !== attachmentIds.length) fail(400, "INVALID_MEDIA");
        await tx.reportMedia.deleteMany({ where: { reportId: id } });
        await tx.reportMedia.createMany({
          data: attachmentIds.map((mediaId, sortOrder) => ({ reportId: id, mediaId, sortOrder })),
        });
      }
      const changed = await tx.report.updateMany({
        where: { id, profileId: current.profileId, status: "REPORTED", version },
        data: { ...data, version: { increment: 1 } },
      });
      if (changed.count !== 1) fail(409, "STALE_REPORT");
      await tx.auditEvent.create({
        data: {
          actorType: "anonymous",
          actorId: current.profileId,
          action: "report.edit",
          entityId: id,
        },
      });
    });
    return getReport(id, current.profileId);
  });
  async function vote(req: FastifyRequest, remove = false) {
    if (await staff(req, false)) fail(403, "STAFF_VOTE_READ_ONLY");
    const current = await session(req),
      id = uuid.parse((req.params as { id: string }).id);
    await db().$transaction(
      async (tx) => {
        const report = await tx.report.findUnique({ where: { id } });
        if (!report) fail(404, "REPORT_NOT_FOUND");
        if (report.profileId === current.profileId) fail(403, "SELF_VOTE");
        if (remove)
          await tx.vote.deleteMany({ where: { reportId: id, profileId: current.profileId } });
        else
          await tx.vote.createMany({
            data: { reportId: id, profileId: current.profileId },
            skipDuplicates: true,
          });
      },
      { isolationLevel: "Serializable" },
    );
    return getReport(id, current.profileId);
  }
  app.post("/reports/:id/vote", { config: { rateLimit: { max: 40, timeWindow: 60000 } } }, (req) =>
    vote(req),
  );
  app.delete("/reports/:id/vote", (req) => vote(req, true));
  app.post("/media", { config: { rateLimit: { max: 15, timeWindow: 60000 } } }, async (req) => {
    const current = await session(req),
      part = await req.file();
    if (!part || !["image/png", "image/jpeg", "image/webp"].includes(part.mimetype))
      fail(400, "INVALID_IMAGE");
    const bytes = await part.toBuffer();
    let clean: Buffer;
    try {
      const metadata = await sharp(bytes, { limitInputPixels: 24_000_000 }).metadata();
      if (!["png", "jpeg", "webp"].includes(metadata.format ?? "")) fail(400, "INVALID_IMAGE");
      clean = await sharp(bytes, { limitInputPixels: 24_000_000 })
        .rotate()
        .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      return fail(400, "INVALID_IMAGE");
    }
    const storageKey = randomUUID() + ".webp",
      path = resolve(root, storageKey);
    await writeFile(path, clean, { flag: "wx" });
    try {
      const media = await db().$transaction(async (tx) => {
        const media = await tx.media.create({
          data: {
            profileId: current.profileId,
            storageKey,
            mime: "image/webp",
            bytes: clean.length,
            sha256: digest(clean),
          },
        });
        await tx.auditEvent.create({
          data: {
            actorType: "anonymous",
            actorId: current.profileId,
            action: "media.upload",
            entityId: media.id,
          },
        });
        return media;
      });
      return { id: media.id, url: "/backend/media/" + media.id + "/content" };
    } catch (error) {
      await unlink(path);
      throw error;
    }
  });
  app.get("/media/:id/content", async (req, reply) => {
    const id = uuid.parse((req.params as { id: string }).id),
      current = await session(req, false);
    const media = await db().media.findUnique({
      where: { id },
      include: { attachments: { where: { report: { deletedAt: null } }, take: 1 } },
    });
    if (!media || (!media.attachments.length && media.profileId !== current?.profileId))
      fail(404, "MEDIA_NOT_FOUND");
    if (!/^[a-f0-9-]+\.webp$/.test(media.storageKey)) fail(404, "MEDIA_NOT_FOUND");
    let bytes: Buffer;
    try {
      const path = await realpath(resolve(root, media.storageKey)),
        canonical = await realpath(root);
      if (!path.startsWith(canonical + sep)) fail(404, "MEDIA_NOT_FOUND");
      bytes = await readFile(path);
    } catch {
      return fail(404, "MEDIA_NOT_FOUND");
    }
    return reply
      .header("content-type", media.mime)
      .header("content-length", bytes.length)
      .header("content-disposition", 'inline; filename="report.webp"')
      .header("etag", '"' + media.sha256 + '"')
      .send(bytes);
  });
  app.post(
    "/anonymous/link/start",
    { config: { rateLimit: { max: 5, timeWindow: 60000 } } },
    async (req) => {
      const current = await session(req),
        code = randomBytes(6).toString("hex").toUpperCase();
      await db().linkRequest.updateMany({
        where: { sourceSessionId: current.id, state: { in: ["open", "awaiting_confirmation"] } },
        data: { state: "cancelled" },
      });
      const request = await db().linkRequest.create({
        data: {
          sourceSessionId: current.id,
          codeHash: digest(code),
          expiresAt: new Date(Date.now() + 300000),
        },
      });
      return { requestId: request.id, code, expiresAt: request.expiresAt };
    },
  );
  app.post(
    "/anonymous/link/request",
    { config: { rateLimit: { max: 5, timeWindow: 60000 } } },
    async (req) => {
      const current = await session(req),
        input = z
          .object({
            code: z
              .string()
              .trim()
              .length(12)
              .regex(/^[A-Fa-f0-9]+$/),
          })
          .strict()
          .parse(req.body);
      const request = await db().linkRequest.findUnique({
        where: { codeHash: digest(input.code.toUpperCase()) },
      });
      if (
        !request ||
        request.state !== "open" ||
        request.expiresAt <= new Date() ||
        request.sourceSessionId === current.id
      )
        fail(400, "INVALID_LINK_CODE");
      const changed = await db().linkRequest.updateMany({
        where: { id: request.id, state: "open" },
        data: { targetSessionId: current.id, state: "awaiting_confirmation" },
      });
      if (changed.count !== 1) fail(409, "LINK_UNAVAILABLE");
      return {
        requestId: request.id,
        state: "awaiting_confirmation",
        expiresAt: request.expiresAt,
      };
    },
  );
  app.get("/anonymous/link/status/:id", async (req) => {
    const current = await session(req),
      id = uuid.parse((req.params as { id: string }).id);
    const request = await db().linkRequest.findUnique({ where: { id } });
    if (!request || ![request.sourceSessionId, request.targetSessionId].includes(current.id))
      fail(403, "LINK_FORBIDDEN");
    return {
      requestId: id,
      state:
        request.expiresAt <= new Date() && request.state !== "confirmed"
          ? "expired"
          : request.state,
      canConfirm:
        request.sourceSessionId === current.id && request.state === "awaiting_confirmation",
      expiresAt: request.expiresAt,
    };
  });
  app.post("/anonymous/link/cancel", async (req) => {
    const current = await session(req),
      { requestId } = z.object({ requestId: uuid }).strict().parse(req.body);
    const result = await db().linkRequest.updateMany({
      where: {
        id: requestId,
        OR: [{ sourceSessionId: current.id }, { targetSessionId: current.id }],
        state: { in: ["open", "awaiting_confirmation"] },
      },
      data: { state: "cancelled" },
    });
    if (!result.count) fail(409, "LINK_UNAVAILABLE");
    return { ok: true };
  });
  app.post("/anonymous/link/confirm", async (req) => {
    const current = await session(req),
      { requestId } = z.object({ requestId: uuid }).strict().parse(req.body);
    await db().$transaction(
      async (tx) => {
        const link = await tx.linkRequest.findUnique({ where: { id: requestId } });
        if (
          !link ||
          link.sourceSessionId !== current.id ||
          link.state !== "awaiting_confirmation" ||
          link.expiresAt <= new Date() ||
          !link.targetSessionId
        )
          fail(403, "LINK_FORBIDDEN");
        const source = await tx.session.findUniqueOrThrow({ where: { id: current.id } });
        const target = await tx.session.findUniqueOrThrow({ where: { id: link.targetSessionId } });
        if (source.revokedAt || target.revokedAt || target.expiresAt <= new Date())
          fail(401, "SESSION_REQUIRED");
        const a = source.profileId,
          b = target.profileId;
        if (a !== b) {
          const sourceProfile = await tx.profile.findUniqueOrThrow({ where: { id: a } });
          const targetProfile = await tx.profile.findUniqueOrThrow({ where: { id: b } });
          await tx.profile.update({
            where: { id: a },
            data: {
              displayName: sourceProfile.displayName ?? targetProfile.displayName,
              avatarMediaId: sourceProfile.avatarMediaId ?? targetProfile.avatarMediaId,
            },
          });
          // The retired profile no longer pins an avatar after all sessions move.
          await tx.profile.update({ where: { id: b }, data: { avatarMediaId: null } });
          const votes = await tx.vote.findMany({ where: { profileId: b } });
          await tx.report.updateMany({ where: { profileId: b }, data: { profileId: a } });
          for (const v of votes) {
            const report = await tx.report.findUniqueOrThrow({
              where: { id: v.reportId },
              select: { profileId: true },
            });
            if (report.profileId !== a)
              await tx.vote.createMany({
                data: { reportId: v.reportId, profileId: a },
                skipDuplicates: true,
              });
          }
          await tx.vote.deleteMany({ where: { profileId: b } });
          const ownReports = await tx.report.findMany({
            where: { profileId: a },
            select: { id: true },
          });
          await tx.vote.deleteMany({
            where: { profileId: a, reportId: { in: ownReports.map((r) => r.id) } },
          });
          await tx.media.updateMany({ where: { profileId: b }, data: { profileId: a } });
          await tx.session.updateMany({ where: { profileId: b }, data: { profileId: a } });
        }
        const claimed = await tx.linkRequest.updateMany({
          where: { id: requestId, state: "awaiting_confirmation" },
          data: { state: "confirmed" },
        });
        if (!claimed.count) fail(409, "LINK_UNAVAILABLE");
        await tx.linkRequest.updateMany({
          where: {
            id: { not: requestId },
            state: { in: ["open", "awaiting_confirmation"] },
            OR: [
              { sourceSessionId: target.id },
              { targetSessionId: target.id },
              { sourceSessionId: source.id },
              { targetSessionId: source.id },
            ],
          },
          data: { state: "cancelled" },
        });
        await tx.auditEvent.create({
          data: {
            actorType: "anonymous",
            actorId: a,
            action: "profiles.link",
            entityId: requestId,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
    return { ok: true };
  });
  app.post("/anonymous/sessions/:id/revoke", async (req) => {
    const current = await session(req),
      id = uuid.parse((req.params as { id: string }).id);
    if (id === current.id) fail(400, "CANNOT_REVOKE_CURRENT");
    await db().session.updateMany({
      where: { id, profileId: current.profileId },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  });
  app.post(
    "/staff/login",
    { config: { rateLimit: { max: 5, timeWindow: 60000 } } },
    async (req, reply) => {
      const input = z
        .object({ username: z.email().max(254), password: z.string().min(1).max(128) })
        .strict()
        .parse(req.body);
      const worker = await db().staff.findUnique({
        where: { email: input.username.toLowerCase() },
      });
      const valid = await verifyPassword(input.password, worker?.passwordHash ?? (await dummy));
      if (!worker?.active || !valid) fail(401, "LOGIN_FAILED");
      if (req.cookies.cf_staff)
        await db().staffSession.deleteMany({ where: { tokenHash: digest(req.cookies.cf_staff) } });
      const token = secret();
      await db().staffSession.create({
        data: {
          staffId: worker.id,
          tokenHash: digest(token),
          expiresAt: new Date(Date.now() + 8 * 3600000),
        },
      });
      setCookie(reply, "cf_staff", token, 8 * 3600);
      return { displayName: worker.displayName };
    },
  );
  app.post("/staff/logout", async (req, reply) => {
    if (req.cookies.cf_staff)
      await db().staffSession.deleteMany({ where: { tokenHash: digest(req.cookies.cf_staff) } });
    reply.clearCookie("cf_staff", { path: "/" });
    return { ok: true };
  });
  app.get("/staff/session", async (req) => {
    const worker = await staff(req, false);
    return { staff: worker ? { displayName: worker.displayName, email: worker.email } : null };
  });
  app.get("/staff/me", async (req) => {
    const worker = await staff(req);
    const [open, resolved, recent] = await db().$transaction([
      db().report.count({
        where: { deletedAt: null, status: { in: ["REPORTED", "ACCEPTED", "IN_PROGRESS"] } },
      }),
      db().report.count({ where: resolvedBy(worker.id) }),
      db().report.findMany({
        where: resolvedBy(worker.id),
        include,
        take: 3,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      }),
    ]);
    return {
      displayName: worker.displayName,
      email: worker.email,
      open,
      resolved,
      recent: recent.map((r) => present(r)),
    };
  });
  app.get("/staff/requests", (req) => list(req, "queue"));
  app.get("/staff/resolved", (req) => list(req, "resolved"));
  app.get("/staff/requests/:id", async (req) => {
    await staff(req);
    const id = uuid.parse((req.params as { id: string }).id),
      report = await getReport(id);
    return {
      ...report,
      similar: await similar({
        locationId: report.location.id,
        issueTypeId: report.issueTypeId,
        title: report.title,
        description: report.description,
        exactLocation: report.exactLocation,
        excludeId: id,
      }),
    };
  });
  app.post("/staff/requests/:id/status", async (req) => {
    const worker = await staff(req),
      id = uuid.parse((req.params as { id: string }).id);
    const input = z
      .object({
        status: z.enum(statuses),
        note: z.string().trim().min(3).max(500),
        version: z.number().int().positive(),
      })
      .strict()
      .parse(req.body);
    await db().$transaction(async (tx) => {
      const report = await tx.report.findUnique({ where: { id } });
      if (!report) fail(404, "REPORT_NOT_FOUND");
      if (!(transitions[report.status] ?? []).includes(input.status))
        fail(409, "INVALID_TRANSITION");
      const result = await tx.report.updateMany({
        where: { id, status: report.status, version: input.version },
        data: {
          status: input.status,
          version: { increment: 1 },
          ...(input.status === "RESOLVED" ? { resolvedById: worker?.id } : {}),
        },
      });
      if (result.count !== 1) fail(409, "STALE_REPORT");
      await tx.statusEvent.create({
        data: {
          reportId: id,
          fromStatus: report.status,
          status: input.status,
          actorType: "staff",
          staffId: worker.id,
          note: input.note,
        },
      });
      await tx.auditEvent.create({
        data: {
          actorType: "staff",
          actorId: worker.id,
          action: "status." + input.status,
          entityId: id,
        },
      });
    });
    return getReport(id);
  });
}
