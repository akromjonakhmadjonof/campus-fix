import "dotenv/config";
import { spawnSync } from "node:child_process";

const command = process.argv[2];
if (!["dev", "deploy", "status"].includes(command))
  throw new Error("Unsupported migration command");
if (!process.env.MIGRATION_DATABASE_URL) throw new Error("MIGRATION_DATABASE_URL is required");
if (command === "dev" && (process.env.NODE_ENV ?? "development") !== "development") {
  throw new Error("migrate dev is restricted to development");
}
if (process.env.NODE_ENV === "production") {
  const url = new URL(process.env.MIGRATION_DATABASE_URL);
  if (url.searchParams.get("sslmode") !== "verify-full") {
    throw new Error("Production migration URLs require sslmode=verify-full and a trusted CA");
  }
}
const cli = import.meta.resolve("prisma/build/index.js");
const { fileURLToPath } = await import("node:url");
const result = spawnSync(
  process.execPath,
  [fileURLToPath(cli), "migrate", command, ...process.argv.slice(3)],
  { stdio: "inherit" },
);
if (result.status === 0 && command !== "status") {
  // Default table grants must never expose Prisma's migration ledger to the app.
  const { Client } = await import("pg");
  const client = new Client({
    connectionString: process.env.MIGRATION_DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    await client.query('REVOKE ALL ON TABLE public."_prisma_migrations" FROM campus_app');
  } finally {
    await client.end();
  }
}
process.exit(result.status ?? 1);
