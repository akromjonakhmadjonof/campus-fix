import { campusRoutes } from "./campus.js";
import { ZodError } from "zod";
import Fastify from "fastify";
import type { Environment } from "./config/env.js";
import databasePlugin from "./plugins/database.js";
import { healthRoutes } from "./routes/health.js";
export function buildApp(environment: Environment) {
  const app = Fastify({
    logger:
      environment.NODE_ENV === "test"
        ? false
        : {
            level: environment.NODE_ENV === "production" ? "info" : "debug",
            redact: ["req.headers.authorization", "req.headers.cookie"],
          },
    requestTimeout: 30_000,
  });
  app.setErrorHandler((error, request, reply) => {
    const statusCode =
      error instanceof ZodError
        ? 400
        : error instanceof Error &&
            "statusCode" in error &&
            typeof error.statusCode === "number" &&
            error.statusCode >= 400 &&
            error.statusCode <= 599
          ? error.statusCode
          : 500;
    if (statusCode >= 500) request.log.error({ err: error }, "Request failed");
    reply.code(statusCode).send({
      code:
        error instanceof ZodError
          ? "VALIDATION_ERROR"
          : statusCode >= 500
            ? "INTERNAL_ERROR"
            : "INVALID_REQUEST",
      message:
        statusCode >= 500
          ? "Internal server error"
          : error instanceof Error
            ? error.message
            : "Invalid request",
    });
  });
  app.register(databasePlugin, { environment });
  app.register(healthRoutes, { prefix: "/api" });
  app.register(campusRoutes, { prefix: "/api" });
  return app;
}
