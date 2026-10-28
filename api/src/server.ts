import { buildApp } from "./app.js";
import { parseEnvironment } from "./config/env.js";
const environment = parseEnvironment();
const app = buildApp(environment);
let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  app.log.info({ signal }, "Shutting down");
  const deadline = setTimeout(() => {
    app.log.error("Shutdown timed out");
    process.exit(1);
  }, 10_000);
  deadline.unref();
  try {
    await app.close();
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  } finally {
    clearTimeout(deadline);
  }
}
process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
try {
  await app.listen({ host: environment.HOST, port: environment.PORT });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
