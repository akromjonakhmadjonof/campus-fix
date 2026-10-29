import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { PrismaClient, ReportStatus } from "./generated/prisma/client.js";
import { digest } from "./domain.js";
const scenarios = [
  [
    "monitor",
    "Monitor stays black",
    "it_computing_monitor",
    ["Sutherland Building", "Ground Floor", "Room S008 — Multimedia Learning Space"],
    "IT",
    "REPORTED",
    2,
    7,
    "Third computer in the second row",
    "The computer starts, but its monitor remains black after checking the cable.",
  ],
  [
    "faucet",
    "Faucet continues dripping",
    "plumbing_faucet",
    ["Lares Building", "Ground Floor"],
    "PLUMBING",
    "IN_PROGRESS",
    5,
    4,
    "Second sink in the demonstration restroom",
    "The faucet drips after its handle is fully closed, leaving water around the basin.",
  ],
  [
    "chair",
    "Loose classroom chair leg",
    "classroom_furniture_chair",
    ["Woodland Building", "First Floor", "Room 112 — Auditorium"],
    "FURNITURE",
    "ACCEPTED",
    4,
    9,
    "Back row, second chair from the aisle",
    "One chair rocks when weight is applied because its front leg connection is loose.",
  ],
  [
    "projector",
    "Projector image loses focus",
    "it_computing_projector",
    ["Conference Center", "Room 001 — Classroom"],
    "IT",
    "RESOLVED",
    12,
    3,
    "Ceiling-mounted projector above the center aisle",
    "The projected image becomes blurry during use even after manual focus adjustment.",
  ],
  [
    "outlet",
    "Power outlet cover is damaged",
    "electrical_lighting_power_outlet",
    ["Cloverly Building", "First Floor", "Room 102"],
    "ELECTRICAL",
    "REPORTED",
    3,
    8,
    "Left wall behind the instructor desk",
    "The outlet cover has a visible crack and needs inspection before further use.",
  ],
  [
    "light",
    "Lobby light flickers repeatedly",
    "electrical_lighting_light_fixture",
    ["Lions Gate", "First Floor", "Lobby"],
    "ELECTRICAL",
    "ACCEPTED",
    7,
    5,
    "Ceiling light nearest the seating area",
    "The overhead fixture flashes on and off while the neighboring lights remain steady.",
  ],
  [
    "door",
    "Classroom door sticks when closing",
    "building_access_door",
    ["Rydal Building", "First Floor", "Room 101 — Classroom"],
    "OTHER",
    "REJECTED",
    9,
    1,
    "Main classroom entrance, lower hinge side",
    "The door catches near the floor. This demo request was later found to duplicate scheduled work.",
  ],
  [
    "trash",
    "Waste bin needs emptying",
    "cleaning_safety_trash_bin",
    ["Lot A", "Visitor Parking Area"],
    "CLEANING",
    "IN_PROGRESS",
    2,
    6,
    "Waste station beside the pedestrian entrance",
    "The bin is full and loose packaging has collected around its base.",
  ],
  [
    "sidewalk",
    "Uneven section of pathway",
    "grounds_parking_sidewalk",
    ["Duck Pond"],
    "OTHER",
    "REPORTED",
    6,
    10,
    "Path on the north side beside the small turning area",
    "A raised edge between pavement sections could catch a shoe or a small wheel.",
  ],
  [
    "bench",
    "Bench seat slat is loose",
    "grounds_parking_bench",
    ["Memorial Field", "Track"],
    "FURNITURE",
    "ACCEPTED",
    8,
    2,
    "Bench beside the track entrance",
    "The outer seat slat shifts when touched and needs to be secured.",
  ],
  [
    "printer",
    "Printer feeds multiple sheets",
    "it_computing_printer",
    ["Academic Building", "First Floor", "Room 103 — Media Lab"],
    "IT",
    "RESOLVED",
    16,
    4,
    "Printer on the counter beside the entry door",
    "Several sheets enter together and stop partway through the paper path.",
  ],
  [
    "ceiling",
    "Water stain beneath ceiling panel",
    "building_access_ceiling",
    ["Spring House", "First Floor", "Room 100 — Flexible Classroom"],
    "OTHER",
    "REPORTED",
    3,
    3,
    "Ceiling panel above the back corner nearest the windows",
    "A damp patch has appeared below a ceiling seam and a small drip was observed.",
  ],
  [
    "restroom",
    "Restroom fixture flush is weak",
    "plumbing_toilet",
    ["Athletic Building"],
    "PLUMBING",
    "RESOLVED",
    18,
    2,
    "Demo restroom, fixture closest to the entrance",
    "The fixture does not complete its normal flush cycle and needs inspection.",
  ],
  [
    "parking-light",
    "Parking-area lamp is dark",
    "grounds_parking_streetlight",
    ["Parking Structure"],
    "ELECTRICAL",
    "IN_PROGRESS",
    5,
    7,
    "Lamp above the pedestrian exit",
    "This fixture remains dark after neighboring lights turn on in the evening.",
  ],
  [
    "network",
    "Computer lab connection drops",
    "it_computing_network_wi_fi_equipment",
    ["Lares Building", "Ground Floor", "Room G04 — Computer Lab"],
    "IT",
    "REPORTED",
    2,
    5,
    "Second workstation row, near the wall network panel",
    "Connections drop periodically on nearby machines while other workstations remain online.",
  ],
  [
    "safety",
    "Safety equipment bracket is loose",
    "cleaning_safety_fire_safety_equipment",
    ["Athletic Building", "Gymnasium", "Gym Floor"],
    "SAFETY",
    "ACCEPTED",
    4,
    6,
    "Wall-mounted cabinet beside the main gym entrance",
    "The bracket moves when lightly touched and requires a maintenance inspection.",
  ],
] as const;
const profileId = (kind: number, index: number) =>
  `00000000-0000-4000-8000-${String(kind + index).padStart(12, "0")}`;
export async function seedExpandedDemo(db: PrismaClient, staffEmail: string) {
  const worker = await db.staff.findUnique({ where: { email: staffEmail.toLowerCase() } });
  if (!worker?.active)
    throw new Error(
      "STAFF_EMAIL must identify an active fictional CLI-created maintenance worker.",
    );
  const storage = resolve(process.env.MEDIA_STORAGE_DIR ?? "storage/media");
  // Preflight every catalog reference and local asset before adding any records.
  const prepared = await Promise.all(
    scenarios.map(async (scenario) => {
      const [key, , , path] = scenario;
      const location = await db.location.findUniqueOrThrow({
        where: { sourceKey: JSON.stringify(path) },
      });
      const type = await db.issueType.findUniqueOrThrow({ where: { code: scenario[2] } });
      const bytes = await sharp(await readFile(resolve("seed-assets/expanded", key + ".svg")))
        .webp({ quality: 85 })
        .toBuffer();
      return { scenario, location, type, bytes };
    }),
  );
  await mkdir(storage, { recursive: true });
  let inserted = 0,
    unchanged = 0;
  for (const [index, { scenario, location, type, bytes }] of prepared.entries()) {
    const [key, title, , , category, status, age, votes, exactLocation, description] = scenario;
    const fixtureKey = "expanded-demo-v1-" + key;
    let written: string | undefined;
    try {
      const created = await db.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${fixtureKey}))`;
          if (await tx.report.findUnique({ where: { fixtureKey } })) return false;
          const owner = profileId(910000, index % 4);
          await tx.profile.upsert({
            where: { id: owner },
            create: { id: owner, displayName: "Demo Reporter " + ((index % 4) + 1) },
            update: {},
          });
          const voterIds = [];
          for (let i = 0; i < votes; i++) {
            const id = profileId(920000, i);
            await tx.profile.upsert({
              where: { id },
              create: { id, displayName: "Demo Supporter" },
              update: {},
            });
            voterIds.push(id);
          }
          const stages: ReportStatus[] =
            status === "REJECTED"
              ? ["REPORTED", "ACCEPTED", "REJECTED"]
              : (["REPORTED", "ACCEPTED", "IN_PROGRESS", "RESOLVED"].slice(
                  0,
                  ["REPORTED", "ACCEPTED", "IN_PROGRESS", "RESOLVED"].indexOf(status) + 1,
                ) as ReportStatus[]);
          const createdAt = new Date(Date.now() - age * 86400000 - index * 1800000);
          const mediaId = randomUUID(),
            storageKey = randomUUID() + ".webp";
          written = resolve(storage, storageKey);
          await writeFile(written, bytes, { flag: "wx" });
          await tx.media.create({
            data: {
              id: mediaId,
              profileId: owner,
              storageKey,
              mime: "image/webp",
              bytes: bytes.length,
              sha256: digest(bytes),
            },
          });
          await tx.report.create({
            data: {
              fixtureKey,
              idempotencyKey: fixtureKey,
              profileId: owner,
              locationId: location.id,
              issueTypeId: type.id,
              category,
              title,
              description: "Fictional demonstration: " + description,
              exactLocation,
              status,
              version: stages.length,
              createdAt,
              updatedAt: new Date(createdAt.getTime() + (stages.length - 1) * 7200000),
              resolvedById: status === "RESOLVED" ? worker.id : null,
              attachments: { create: { mediaId, sortOrder: 0 } },
              votes: {
                create: voterIds.map((id, i) => ({
                  profileId: id,
                  createdAt: new Date(createdAt.getTime() + (i + 1) * 60000),
                })),
              },
              history: {
                create: stages.map((stage, i) => ({
                  status: stage,
                  fromStatus: i ? stages[i - 1] : null,
                  actorType: i ? "staff" : "system",
                  staffId: i ? worker.id : null,
                  createdAt: new Date(createdAt.getTime() + i * 7200000),
                  note:
                    stage === "REJECTED"
                      ? "Fictional duplicate of already scheduled work; no repair completion is implied."
                      : i
                        ? "Fictional maintenance inspection and work recorded for demonstration."
                        : "Fictional demo report with a locally generated illustration, not a campus photograph.",
                })),
              },
            },
          });
          return true;
        },
        { timeout: 20000 },
      );
      if (created) inserted++;
      else unchanged++;
    } catch (error) {
      if (written) await unlink(written).catch(() => {});
      throw error;
    }
  }
  return { inserted, unchanged, total: scenarios.length };
}
