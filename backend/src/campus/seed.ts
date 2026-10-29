import "reflect-metadata";
import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { loadEnvironment } from "../config/environment.js";
import { databaseAdapter } from "../database/prisma.service.js";
import { PrismaClient } from "../generated/prisma/client.js";
import { digest, hashPassword } from "./rules.js";
const env = loadEnvironment();
if (
  !["development", "test"].includes(env.NODE_ENV) ||
  !["campus_fix", "campus_fix_test"].includes(new URL(env.DATABASE_URL).pathname.slice(1))
)
  throw new Error("Seed is limited to development/test databases");
const password = process.env.SEED_STAFF_PASSWORD;
if (!password || password.length < 12 || password.length > 128)
  throw new Error(
    "Set SEED_STAFF_PASSWORD (12–128 characters) for the fictional maintenance account",
  );
const db = new PrismaClient({ adapter: databaseAdapter(env) });
interface LocationNode {
  name: string;
  children: LocationNode[];
}
const locations = JSON.parse(
  await readFile(resolve("seed-assets/locations.json"), "utf8"),
) as LocationNode[];
const roots: string[] = [];
async function insertLocations(
  nodes: LocationNode[],
  parentId: string | null = null,
  parentPath = "",
) {
  for (const node of nodes) {
    const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
    const id = digest(path).slice(0, 32);
    await db.location.upsert({
      where: { id },
      create: { id, name: node.name, path, parentId },
      update: { name: node.name, path, parentId },
    });
    if (!parentId) roots.push(id);
    await insertLocations(node.children, id, path);
  }
}
try {
  await insertLocations(locations);
  if (!roots.length) throw new Error("Location inventory is empty");
  const staff = await db.staff.upsert({
    where: { username: "maintenance.demo" },
    create: {
      username: "maintenance.demo",
      displayName: "Demo Maintenance",
      passwordHash: await hashPassword(password),
    },
    update: { passwordHash: await hashPassword(password) },
  });
  const guestId = "b5fb78c0-4286-4b5c-a00b-000000000001";
  await db.guestSession.upsert({
    where: { id: guestId },
    create: {
      id: guestId,
      tokenHash: digest(randomBytes(32).toString("hex")),
      expiresAt: new Date("2030-01-01T00:00:00Z"),
    },
    update: {},
  });
  await mkdir(resolve(env.UPLOAD_DIR), { recursive: true });
  const fixtures = [
    {
      title: "Water fountain leaking",
      description:
        "A small puddle is forming below the drinking fountain. This is a fictional demonstration report.",
      category: "PLUMBING",
      photo: "fountain",
      status: "REPORTED",
    },
    {
      title: "Computer screen needs attention",
      description:
        "The workstation displays an error instead of the desktop. Fictional demonstration report.",
      category: "IT",
      photo: "computer",
      status: "IN_PROGRESS",
    },
    {
      title: "Bottle filler draining slowly",
      description: "Water remains in the tray after use. Fictional demonstration report.",
      category: "PLUMBING",
      photo: "fountain",
      status: "RESOLVED",
    },
    {
      title: "Lab workstation unavailable",
      description:
        "The monitor is on but the workstation will not respond. Fictional demonstration report.",
      category: "IT",
      photo: "computer",
      status: "REPORTED",
    },
    {
      title: "Drinking station inspected",
      description: "The fountain needed a drain inspection. Fictional demonstration report.",
      category: "PLUMBING",
      photo: "fountain",
      status: "RESOLVED",
    },
    {
      title: "Library computer restarting",
      description: "This workstation restarts during use. Fictional demonstration report.",
      category: "IT",
      photo: "computer",
      status: "IN_PROGRESS",
    },
  ] as const;
  for (const [index, item] of fixtures.entries()) {
    const id = `b5fb78c0-4286-4b5c-a00b-${String(index + 100).padStart(12, "0")}`;
    if (await db.report.findUnique({ where: { id } })) continue;
    const date = new Date();
    const age = [0, 0, 1, 2, 4, 6][index] ?? index;
    date.setUTCDate(date.getUTCDate() - age);
    date.setUTCHours(9, 0, 0, 0);
    const filename = `demo-${index}.webp`;
    const locationId = roots[index % roots.length];
    if (!locationId) throw new Error("Missing seed location");
    await sharp(resolve(`seed-assets/${item.photo}.png`))
      .resize(1600, 1200, { fit: "inside" })
      .webp({ quality: 82 })
      .toFile(resolve(env.UPLOAD_DIR, filename));
    await db.report.create({
      data: {
        id,
        guestId,
        title: item.title,
        description: item.description,
        category: item.category,
        status: item.status,
        locationId,
        exactLocation: "Demonstration area near the main entrance",
        createdAt: date,
        attachments: { create: { guestId, filename } },
        history: {
          create: [
            { status: "REPORTED", note: "", createdAt: date },
            ...(item.status !== "REPORTED"
              ? [
                  {
                    status: "IN_PROGRESS" as const,
                    note: "Inspection scheduled (demo).",
                    staffId: staff.id,
                    createdAt: new Date(date.getTime() + 3600000),
                  },
                ]
              : []),
            ...(item.status === "RESOLVED"
              ? [
                  {
                    status: "RESOLVED" as const,
                    note: "Repair verified (demo).",
                    staffId: staff.id,
                    createdAt: new Date(date.getTime() + 7200000),
                  },
                ]
              : []),
          ],
        },
      },
    });
  }
  console.log(
    "Seed complete. Fictional staff username: maintenance.demo. Password comes from SEED_STAFF_PASSWORD.",
  );
} finally {
  await db.$disconnect();
}
