import "dotenv/config";
import { createDatabase } from "./lib/database.js";
import { seedExpandedDemo } from "./demo-data.js";
if (process.env.NODE_ENV === "production")
  throw new Error("Demo seeding is disabled in production.");
if (!process.env.DATABASE_URL || !process.env.STAFF_EMAIL)
  throw new Error("DATABASE_URL and STAFF_EMAIL are required.");
const db = createDatabase(process.env.DATABASE_URL);
try {
  console.log(await seedExpandedDemo(db, process.env.STAFF_EMAIL));
} finally {
  await db.$disconnect();
}
