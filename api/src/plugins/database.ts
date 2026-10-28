import plugin from "fastify-plugin";
import { createDatabase } from "../lib/database.js";
import type { Environment } from "../config/env.js";
declare module "fastify" {
  interface FastifyInstance {
    database: ReturnType<typeof createDatabase> | null;
  }
}
export default plugin<{ environment: Environment }>(async (app, { environment }) => {
  // Prisma connects lazily. Health and server startup do not require a running database.
  const database = environment.DATABASE_URL ? createDatabase(environment.DATABASE_URL) : null;
  app.decorate("database", database);
  app.addHook("onClose", async () => {
    await database?.$disconnect();
  });
});
