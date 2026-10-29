import { createApp } from "./app.js";
import { ConfigurationError, loadEnvironment } from "./config/environment.js";

let app: Awaited<ReturnType<typeof createApp>> | undefined;
try {
  const environment = loadEnvironment();
  app = await createApp(environment);
  await app.listen(environment.PORT, environment.HOST);
} catch (error) {
  if (app) await app.close().catch(() => undefined);
  // Startup errors can contain credentials; validate config separately for field names.
  process.stderr.write(
    JSON.stringify({
      level: "fatal",
      message:
        error instanceof ConfigurationError
          ? error.message
          : "Backend startup failed. Check configuration and infrastructure.",
    }) + "\n",
  );
  process.exitCode = 1;
}
