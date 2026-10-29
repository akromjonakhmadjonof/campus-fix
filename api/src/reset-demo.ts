import "dotenv/config";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { createDatabase } from "./lib/database.js";
import { digest, flattenLocations } from "./domain.js";
import { taxonomy } from "./taxonomy.js";
import type { ReportStatus } from "./generated/prisma/client.js";

// Deliberately separate from normal additive seeds. Only the local demonstration DB is permitted.
if (!process.argv.includes("--reset-local-demo") || process.env.NODE_ENV === "production")
  throw new Error("Explicit --reset-local-demo is required outside production.");
const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.port !== "55432" ||
  url.pathname !== "/campus_fix_demo"
)
  throw new Error("Reset is restricted to campus_fix_demo on localhost:55432.");
const db = createDatabase(url.toString());
const root = resolve("..");
function requiredId(map: Map<string, string>, key: string) {
  const value = map.get(key);
  if (!value) throw new Error("Missing catalog key: " + key);
  return value;
}
const names = [
  "Aisha Rahman",
  "Daniel Kim",
  "Sofia Martinez",
  "Omar Hassan",
  "Maya Patel",
  "Leo Chen",
  "Nora Williams",
  "Samir Ali",
  "Elena Garcia",
  "Ethan Brooks",
  "Layla Ahmed",
  "Noah Wilson",
  "Amara Okafor",
  "Arjun Shah",
  "Isabella Rossi",
  "Lucas Nguyen",
  "Zara Khan",
  "Mateo Silva",
  "Chloe Davis",
  "Yusuf Demir",
];
const clusters = [
  {
    key: "fountain",
    type: "plumbing_water_fountain",
    category: "PLUMBING",
    image: "../backend/seed-assets/fountain.png",
    exactLocation: "Ground-floor corridor, drinking fountain beside the multimedia learning space",
    context:
      "The drinking fountain beside the multimedia learning space continues to leak after the button is released. Water collects along the wall and reaches the edge of the walking route. Please inspect the valve and drain, dry the floor, and check for further leakage before returning the fountain to use.",
    observations: [
      [
        "Water collecting below the corridor fountain",
        "I noticed a fresh puddle on arrival for a morning class; it was still growing when I left.",
      ],
      [
        "Fountain keeps dripping after use",
        "After filling my bottle, I watched a steady drip continue from the outlet for several minutes.",
      ],
      [
        "Wet floor beside the same drinking fountain",
        "The damp area extends toward the doorway, so people are stepping around it to enter the room.",
      ],
      [
        "Repeat leak at the ground-floor fountain",
        "The floor had been wiped earlier, but water has appeared in the same place again.",
      ],
      [
        "Persistent fountain leak needs inspection",
        "The unit is still leaking with nobody using it; the nearby corridor is particularly busy between classes.",
      ],
    ],
  },
  {
    key: "computer",
    type: "it_computing_computer",
    category: "IT",
    image: "../backend/seed-assets/computer.png",
    exactLocation:
      "Ground floor, Room S008 multimedia learning space, workstation three in the second row",
    context:
      "Workstation three in the second row stops at an error screen instead of opening a usable desktop. The monitor and computer are powered, but students cannot start the teaching software. Please check the startup error, repair the workstation, and verify that a normal session can open before marking the request complete.",
    observations: [
      [
        "Workstation three stops at an error screen",
        "I could not use this workstation during the scheduled lab and moved to another seat.",
      ],
      [
        "Same lab computer is unavailable for class",
        "The computer shows the same error after a normal restart, while the neighboring machines work.",
      ],
      [
        "Repeated startup failure in the multimedia room",
        "The error appeared before I could begin the assignment, so no application was running when it failed.",
      ],
      [
        "Students cannot use workstation three",
        "Several classmates have tried this seat today and all encountered the same startup screen.",
      ],
      [
        "Lab workstation still needs a repair",
        "The machine was unavailable yesterday and has the same fault again during today's session.",
      ],
    ],
  },
  {
    key: "ceiling",
    type: "building_access_ceiling",
    category: "OTHER",
    image: "seed-assets/expanded/ceiling.svg",
    exactLocation: "Ground-floor reception corridor, ceiling tile above the seating alcove",
    context:
      "A ceiling tile above the reception seating alcove has a visible water stain and a damp edge. The surrounding tiles appear dry, but this area needs an inspection to identify the source of moisture. Please check above the tile, address any leak, and replace the damaged material once the area is dry.",
    observations: [
      [
        "Water stain on the reception ceiling tile",
        "I first noticed the discolored patch while waiting beside reception this morning.",
      ],
      [
        "Damp ceiling edge above the seating alcove",
        "The corner of the same stained tile looks darker and wetter than the center.",
      ],
      [
        "Ceiling stain appears to be spreading",
        "The discolored area looks wider than it did during my previous visit to the building.",
      ],
      [
        "Please inspect the stained corridor ceiling",
        "The patch is directly above the chairs used by people waiting for appointments.",
      ],
      [
        "Another observation of the damp ceiling tile",
        "I noticed moisture at the edge of the same tile, although I did not see an active drip.",
      ],
    ],
  },
  {
    key: "chair",
    type: "classroom_furniture_chair",
    category: "FURNITURE",
    image: "seed-assets/expanded/chair.svg",
    exactLocation: "Ground-floor study lounge, chair nearest the window at the first shared table",
    context:
      "The chair nearest the window at the first shared study table rocks because one leg connection is loose. Other chairs at the table feel stable. Please inspect and secure the connection or replace the chair, then check its stability before returning it to the study area.",
    observations: [
      [
        "Window-side study chair has a loose leg",
        "The chair moved unexpectedly when I sat down, so I switched to a different seat.",
      ],
      [
        "Same lounge chair rocks during use",
        "The front corner lifts and drops when light pressure is applied to the seat.",
      ],
      [
        "Unstable chair beside the first study table",
        "I noticed movement around the leg joint rather than an uneven section of flooring.",
      ],
      [
        "Loose study chair still needs attention",
        "The chair remains at the same window-side position and is still noticeably unstable.",
      ],
      [
        "Another student reports the rocking chair",
        "The seat shifts sideways during ordinary use, making this chair difficult to use for studying.",
      ],
    ],
  },
] as const;

try {
  const email = process.env.STAFF_EMAIL ?? "maintenance.demo@example.invalid";
  const worker = await db.staff.findUniqueOrThrow({ where: { email } });
  const source = await readFile(resolve(root, "seed.json"), "utf8");
  const locations = flattenLocations(JSON.parse(source));
  const targetKey = JSON.stringify(["Sutherland Building"]);
  if (!locations.some((location) => location.sourceKey === targetKey))
    throw new Error("Seed location missing");
  const typeCodes = new Set(
    taxonomy.flatMap(([code, , , types]) =>
      types.map(
        (label) =>
          code +
          "_" +
          label
            .split("|")[0]
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_"),
      ),
    ),
  );
  const images = await Promise.all(
    clusters.map(async (cluster) => {
      if (!typeCodes.has(cluster.type))
        throw new Error("Unknown fixture issue type: " + cluster.type);
      return sharp(await readFile(resolve(cluster.image)))
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    }),
  );
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = resolve(root, ".local-postgres/backups");
  await mkdir(backupDir, { recursive: true });
  const backup = resolve(backupDir, "before-demo-reset-" + stamp + ".dump");
  const pgBin = resolve(root, ".local-postgres/binaries/pgsql/bin");
  execFileSync(
    resolve(pgBin, "pg_dump.exe"),
    [
      "-h",
      url.hostname,
      "-p",
      url.port,
      "-U",
      decodeURIComponent(url.username),
      "-d",
      "campus_fix_demo",
      "-Fc",
      "--no-owner",
      "-f",
      backup,
    ],
    {
      env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  execFileSync(resolve(pgBin, "pg_restore.exe"), ["--list", backup], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  // Existing media files are retained so restoring the backup also restores its attachments.
  const storage = resolve(process.env.MEDIA_STORAGE_DIR ?? "storage/media");
  await mkdir(storage, { recursive: true });
  const prepared: { id: string; bytes: number; sha256: string; profileId: string }[] = [];
  for (let index = 0; index < 20; index++) {
    const id = randomUUID(),
      bytes = images[Math.floor(index / 5)];
    await writeFile(resolve(storage, id + ".webp"), bytes);
    prepared.push({ id, bytes: bytes.length, sha256: digest(bytes), profileId: randomUUID() });
  }
  const now = new Date();
  const counts = await db.$transaction(
    async (tx) => {
      // All application tables are reset together; migrations and immutable-history guards remain.
      await tx.$executeRaw`TRUNCATE TABLE "Notification", "VoteEvent", "AuditEvent", "ReportMedia", "StatusEvent", "Vote", "LinkRequest", "Session", "StaffSession", "Report", "Media", "Profile", "Staff", "IssueType", "IssueGroup", "Location" RESTART IDENTITY`;
      const byKey = new Map<string, string>();
      for (const location of locations) {
        const row = await tx.location.create({
          data: {
            name: location.name,
            path: location.path,
            sourceKey: location.sourceKey,
            sortOrder: location.sortOrder,
            parentId: location.parentKey ? requiredId(byKey, location.parentKey) : null,
          },
        });
        byKey.set(location.sourceKey, row.id);
      }
      const types = new Map<string, string>();
      for (const [sortOrder, [code, labelEn, labelEs, labels]] of taxonomy.entries()) {
        const group = await tx.issueGroup.create({ data: { code, labelEn, labelEs, sortOrder } });
        for (const label of labels) {
          const [en, es] = label.split("|");
          const code = group.code + "_" + en.toLowerCase().replace(/[^a-z0-9]+/g, "_");
          const type = await tx.issueType.create({
            data: { code, labelEn: en, labelEs: es, groupId: group.id },
          });
          types.set(code, type.id);
        }
      }
      const restoredWorker = await tx.staff.create({
        data: {
          email: worker.email,
          displayName: worker.displayName,
          passwordHash: worker.passwordHash,
          active: true,
          createdAt: new Date(now.getTime() - 3 * 86400000),
        },
      });
      for (const [index, media] of prepared.entries())
        await tx.profile.create({
          data: {
            id: media.profileId,
            displayName: "Demo " + names[index],
            createdAt: new Date(now.getTime() - 3 * 86400000),
          },
        });
      for (const [index, media] of prepared.entries()) {
        const cluster = clusters[Math.floor(index / 5)],
          variant = index % 5;
        const [title, observation] = cluster.observations[variant];
        const createdAt = new Date(now.getTime() - (6 + index * 2) * 3600000);
        const stages: ReportStatus[] = [
          "REPORTED",
          ...(variant >= 3 ? ["ACCEPTED" as const] : []),
          ...(variant === 4 ? ["IN_PROGRESS" as const] : []),
        ];
        const report = await tx.report.create({
          data: {
            fixtureKey: "same-location-demo-" + index,
            idempotencyKey: randomUUID(),
            profileId: media.profileId,
            locationId: requiredId(byKey, targetKey),
            issueTypeId: requiredId(types, cluster.type),
            category: cluster.category,
            title,
            description: `${observation}\n\n${cluster.context}\n\nFictional demonstration report; this is not a verified campus incident.`,
            exactLocation: cluster.exactLocation,
            status: stages[stages.length - 1],
            version: stages.length,
            createdAt,
            updatedAt: new Date(createdAt.getTime() + (stages.length - 1) * 3600000),
            history: {
              create: stages.map((status, step) => ({
                status,
                fromStatus: step ? stages[step - 1] : null,
                actorType: step ? "staff" : "anonymous",
                staffId: step ? restoredWorker.id : null,
                actorDisplayName: step ? restoredWorker.displayName : "Demo " + names[index],
                note: step
                  ? "Fictional inspection: maintenance acknowledged the issue and recorded this work step."
                  : "Submitted by a fictional reporter for the same-location demonstration.",
                createdAt: new Date(createdAt.getTime() + step * 3600000),
              })),
            },
          },
          include: { history: true },
        });
        await tx.media.create({
          data: {
            id: media.id,
            profileId: media.profileId,
            storageKey: media.id + ".webp",
            mime: "image/webp",
            bytes: media.bytes,
            sha256: media.sha256,
            createdAt,
          },
        });
        await tx.reportMedia.create({
          data: { reportId: report.id, mediaId: media.id, sortOrder: 0 },
        });
        for (const event of report.history.filter(
          (event) => event.status === "ACCEPTED" || event.status === "IN_PROGRESS",
        )) {
          await tx.notification.create({
            data: {
              recipientId: media.profileId,
              actorKind: "STAFF",
              actorStaffId: restoredWorker.id,
              actorDisplayName: restoredWorker.displayName,
              type: event.status as "ACCEPTED" | "IN_PROGRESS",
              reportId: report.id,
              reportTitle: title,
              statusEventId: event.id,
              note: event.note,
              createdAt: event.createdAt,
            },
          });
        }
        for (const offset of [1, 2]) {
          const voterIndex = Math.floor(index / 5) * 5 + ((variant + offset) % 5);
          const profileId = prepared[voterIndex].profileId,
            votedAt = new Date(createdAt.getTime() + 3 * 3600000);
          await tx.vote.create({ data: { reportId: report.id, profileId, createdAt: votedAt } });
          const event = await tx.voteEvent.create({
            data: { reportId: report.id, profileId, createdAt: votedAt },
          });
          await tx.notification.create({
            data: {
              recipientId: media.profileId,
              actorKind: "REPORTER",
              actorProfileId: profileId,
              actorDisplayName: "Demo " + names[voterIndex],
              type: "UPVOTE",
              reportId: report.id,
              reportTitle: title,
              voteEventId: event.id,
              createdAt: votedAt,
            },
          });
        }
        await tx.auditEvent.create({
          data: {
            actorType: "system",
            action: "demo.report.seeded",
            entityId: report.id,
            createdAt,
          },
        });
      }
      return {
        locations: await tx.location.count(),
        reports: await tx.report.count(),
        reporters: await tx.profile.count(),
        images: await tx.reportMedia.count(),
        votes: await tx.vote.count(),
        events: await tx.statusEvent.count(),
        notifications: await tx.notification.count(),
      };
    },
    { timeout: 120000 },
  );
  const result = {
    database: "campus_fix_demo",
    backup,
    seedSha256: digest(source),
    location: "Sutherland Building",
    clusters: 4,
    reportsPerCluster: 5,
    statuses: { REPORTED: 12, ACCEPTED: 4, IN_PROGRESS: 4 },
    ...counts,
  };
  await writeFile(
    resolve(backupDir, "demo-reset-" + stamp + ".json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await db.$disconnect();
}
