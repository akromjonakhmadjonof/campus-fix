import "dotenv/config";
import { defineConfig } from "prisma/config";

// Offline generate/validate/build do not require a real database URL.
// scripts/migrate.mjs requires MIGRATION_DATABASE_URL before invoking Migrate.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url:
      process.env.MIGRATION_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "postgresql://offline:offline@127.0.0.1:1/offline",
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
