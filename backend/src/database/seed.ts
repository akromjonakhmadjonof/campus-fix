import "reflect-metadata";
import { loadEnvironment } from "../config/environment.js";
import { PrismaClient } from "../generated/prisma/client.js";
import { databaseAdapter } from "./prisma.service.js";

const env = loadEnvironment();
if (!["development", "test"].includes(env.NODE_ENV))
  throw new Error("Seeding is restricted to development/test");
const subject = process.env.SEED_OWNER_SUBJECT;
if (!subject || subject.length > 255)
  throw new Error("Provide SEED_OWNER_SUBJECT from your development identity provider");
const database = new URL(env.DATABASE_URL).pathname.slice(1);
if (!["campus_fix", "campus_fix_test"].includes(database))
  throw new Error("Seed requires an explicitly named development/test database");
const db = new PrismaClient({ adapter: databaseAdapter(env) });
try {
  await db.project.upsert({
    where: { ownerId_slug: { ownerId: subject, slug: "library-repairs" } },
    create: { ownerId: subject, slug: "library-repairs", name: "Library repairs" },
    update: {},
  });
} finally {
  await db.$disconnect();
}
