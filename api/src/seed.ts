import "dotenv/config";
import sharp from "sharp";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createDatabase } from "./lib/database.js";
import { flattenLocations } from "./domain.js";
import { taxonomy } from "./taxonomy.js";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const db = createDatabase(process.env.DATABASE_URL);
try {
  const source = resolve("../seed.json");
  const rows = flattenLocations(JSON.parse(await readFile(source, "utf8")));
  let inserted = 0,
    updated = 0,
    unchanged = 0;
  for (const row of rows) {
    const parent = row.parentKey
      ? await db.location.findUniqueOrThrow({ where: { sourceKey: row.parentKey } })
      : null;
    const data = {
      name: row.name,
      path: row.path,
      sortOrder: row.sortOrder,
      parentId: parent?.id ?? null,
    };
    const old = await db.location.findUnique({ where: { sourceKey: row.sourceKey } });
    if (!old) inserted++;
    else if (
      old.path === data.path &&
      old.sortOrder === data.sortOrder &&
      old.parentId === data.parentId
    )
      unchanged++;
    else updated++;
    await db.location.upsert({
      where: { sourceKey: row.sourceKey },
      create: { sourceKey: row.sourceKey, ...data },
      update: data,
    });
  }
  for (const [sortOrder, [code, labelEn, labelEs, types]] of taxonomy.entries()) {
    const group = await db.issueGroup.upsert({
      where: { code },
      create: { code, labelEn, labelEs, sortOrder },
      update: { labelEn, labelEs, sortOrder },
    });
    for (const label of types) {
      const [en, es] = label.split("|") as [string, string];
      const typeCode = code + "_" + en.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      await db.issueType.upsert({
        where: { code: typeCode },
        create: { code: typeCode, labelEn: en, labelEs: es, groupId: group.id },
        update: { labelEn: en, labelEs: es, groupId: group.id },
      });
    }
  }
  console.log({
    source,
    roots: rows.filter((r) => !r.parentKey).length,
    total: rows.length,
    depth: Math.max(...rows.map((r) => JSON.parse(r.sourceKey).length)),
    inserted,
    updated,
    unchanged,
    staleCandidates: (await db.location.count()) - rows.length,
  });
  if (process.argv.includes("--demo")) {
    if (process.env.NODE_ENV === "production") throw new Error("Demo seed disabled in production");
    const profile = await db.profile.upsert({
      where: { id: "00000000-0000-4000-8000-000000000001" },
      create: { id: "00000000-0000-4000-8000-000000000001" },
      update: {},
    });
    const location = await db.location.findFirstOrThrow({ where: { parentId: null } });
    const type = await db.issueType.findFirstOrThrow({ where: { group: { code: "plumbing" } } });
    for (let i = 0; i < 4; i++)
      await db.report.upsert({
        where: { fixtureKey: "demo-" + i },
        update: {},
        create: {
          fixtureKey: "demo-" + i,
          idempotencyKey: "demo-" + i,
          profileId: profile.id,
          locationId: location.id,
          issueTypeId: type.id,
          category: "PLUMBING",
          title:
            [
              "Fictional leaking fountain",
              "Fictional slow drain",
              "Fictional faucet inspection",
              "Fictional pipe drip",
            ][i] ?? "Fictional maintenance report",
          description:
            "Synthetic demonstration incident. No actual campus maintenance issue is implied.",
          exactLocation: "Demo object near the entrance " + i,
          history: {
            create: {
              status: "REPORTED",
              actorType: "system",
              note: "Fictional demonstration fixture",
            },
          },
        },
      });
    const storage = resolve(process.env.MEDIA_STORAGE_DIR ?? "storage/media");
    await mkdir(storage, { recursive: true });
    for (let i = 0; i < 4; i++) {
      const report = await db.report.findUniqueOrThrow({ where: { fixtureKey: "demo-" + i } });
      if (await db.reportMedia.count({ where: { reportId: report.id } })) continue;
      const bytes = await sharp(resolve("../backend/seed-assets/fountain.png"))
        .resize(1200)
        .webp()
        .toBuffer();
      const mediaId = "00000000-0000-4000-8000-" + String(100 + i).padStart(12, "0");
      const storageKey = mediaId + ".webp";
      await writeFile(resolve(storage, storageKey), bytes);
      const { digest } = await import("./domain.js");
      await db.media.upsert({
        where: { id: mediaId },
        create: {
          id: mediaId,
          profileId: profile.id,
          storageKey,
          mime: "image/webp",
          bytes: bytes.length,
          sha256: digest(bytes),
        },
        update: {},
      });
      await db.reportMedia.create({ data: { reportId: report.id, mediaId, sortOrder: 0 } });
    }
    const worker = process.env.STAFF_EMAIL
      ? await db.staff.findUnique({ where: { email: process.env.STAFF_EMAIL.toLowerCase() } })
      : null;
    if (worker) {
      const stages = ["REPORTED", "ACCEPTED", "IN_PROGRESS", "RESOLVED"] as const;
      for (let step = 1; step <= 3; step++) {
        const status = stages[step] ?? "REPORTED";
        const createdAt = new Date("2026-10-01T12:00:00.000Z");
        await db.report.upsert({
          where: { fixtureKey: "demo-history-" + step },
          update: {},
          create: {
            fixtureKey: "demo-history-" + step,
            idempotencyKey: "demo-history-" + step,
            profileId: profile.id,
            locationId: location.id,
            issueTypeId: type.id,
            category: "PLUMBING",
            title: "Fictional maintenance history " + step,
            description: "Synthetic work history for the local demonstration only.",
            exactLocation: "Illustrative fixture by entrance " + step,
            status,
            version: step + 1,
            createdAt,
            resolvedById: status === "RESOLVED" ? worker.id : null,
            history: {
              create: stages.slice(0, step + 1).map((stage, index) => ({
                status: stage,
                fromStatus: index ? stages[index - 1] : null,
                actorType: index ? "staff" : "system",
                staffId: index ? worker.id : null,
                actorDisplayName: index ? worker.displayName.slice(0, 120) : null,
                note: index
                  ? "Fictional maintenance step inspected and recorded."
                  : "Fictional demonstration fixture",
                createdAt: new Date(createdAt.getTime() + index * 3600000),
              })),
            },
          },
        });
      }
    }
    const votedReport = await db.report.findUniqueOrThrow({ where: { fixtureKey: "demo-0" } });
    for (let i = 1; i <= 2; i++) {
      const voter = await db.profile.upsert({
        where: { id: "00000000-0000-4000-8000-" + String(200 + i).padStart(12, "0") },
        create: { id: "00000000-0000-4000-8000-" + String(200 + i).padStart(12, "0") },
        update: {},
      });
      await db.$transaction(async (tx) => {
        const vote = await tx.vote.createMany({
          data: { reportId: votedReport.id, profileId: voter.id },
          skipDuplicates: true,
        });
        if (vote.count)
          await tx.voteEvent.create({ data: { reportId: votedReport.id, profileId: voter.id } });
      });
    }
    console.log(
      "Fictional demo reports seeded idempotently. Staff history requires STAFF_EMAIL to name an existing CLI-created worker.",
    );
  }
} finally {
  await db.$disconnect();
}
