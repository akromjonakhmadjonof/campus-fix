import "dotenv/config";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createDatabase } from "./lib/database.js";
import { seedExpandedDemo } from "./demo-data.js";

if (process.env.NODE_ENV === "production")
  throw new Error("Demo verification is disabled in production.");
const url = process.env.DATABASE_URL;
const staffEmail = process.env.STAFF_EMAIL;
if (!url || !staffEmail) throw new Error("DATABASE_URL and STAFF_EMAIL are required.");
const database = new URL(url).pathname.slice(1);
if (!["campus_fix_demo", "campus_fix_test"].includes(database))
  throw new Error("Use an isolated demo/test database.");
const db = createDatabase(url);
const hash = (data: unknown) => createHash("sha256").update(JSON.stringify(data)).digest("hex");
const snapshot = () =>
  db.report.findMany({
    orderBy: { id: "asc" },
    include: {
      attachments: { orderBy: { mediaId: "asc" }, include: { media: true } },
      history: { orderBy: { id: "asc" } },
      votes: { orderBy: { profileId: "asc" } },
    },
  });
const catalog = async () => ({
  locations: await db.location.findMany({ orderBy: { id: "asc" } }),
  groups: await db.issueGroup.findMany({ orderBy: { id: "asc" } }),
  types: await db.issueType.findMany({ orderBy: { id: "asc" } }),
});
try {
  const before = await snapshot();
  const catalogBefore = await catalog();
  const initialIds = new Set(before.map((row) => row.id));
  const firstRun = await seedExpandedDemo(db, staffEmail);
  const first = await snapshot();
  assert.equal(
    hash(first.filter((row) => initialIds.has(row.id))),
    hash(before),
    "Existing reports, media, votes and events must be unchanged",
  );
  const secondRun = await seedExpandedDemo(db, staffEmail);
  const after = await snapshot();
  assert.equal(
    hash(after),
    hash(first),
    "Repeat must leave every report and relationship unchanged",
  );
  assert.equal(
    hash(await catalog()),
    hash(catalogBefore),
    "Location and issue catalogs must be unchanged",
  );
  assert.equal(secondRun.inserted, 0);
  const evidence = {
    verifiedAt: new Date().toISOString(),
    database,
    before: before.length,
    after: after.length,
    firstRun,
    secondRun,
    existingReportsPreserved: true,
    repeatUnchanged: true,
    catalogUnchanged: true,
    existingReportsHash: hash(before),
    catalogHash: hash(catalogBefore),
    seedSourceSha256: createHash("sha256")
      .update(await readFile("../seed.json"))
      .digest("hex"),
    fixtureStatuses: await db.report.groupBy({
      by: ["status"],
      where: { fixtureKey: { startsWith: "expanded-demo-v1-" } },
      _count: true,
    }),
  };
  await writeFile(
    `../codex/UPDATE_04_SEED_${database}.json`,
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await db.$disconnect();
}
