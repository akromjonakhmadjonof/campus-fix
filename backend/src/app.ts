import "reflect-metadata";
import { ConsoleLogger, RequestMethod, ValidationPipe, type LogLevel } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { randomUUID } from "node:crypto";
import { AppModule } from "./app.module.js";
import type { Environment } from "./config/environment.js";
import { HttpErrorFilter, sendError } from "./http/errors.js";

export async function createApp(env: Environment) {
  const adapter = new FastifyAdapter({
    bodyLimit: env.BODY_LIMIT_BYTES,
    requestTimeout: 30000,
    trustProxy: env.TRUST_PROXY ? env.TRUST_PROXY.split(",").map((v) => v.trim()) : false,
    genReqId: () => randomUUID(),
    requestIdHeader: false,
    logger: {
      level: env.LOG_LEVEL,
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers.set-cookie",
        "password",
        "token",
        "secret",
      ],
      // Allowlist fields; never serialize headers, query strings, bodies, tokens or user input.
      serializers: {
        req: (req: { id: string; method: string }) => ({ id: req.id, method: req.method }),
        err: () => ({ type: "Error", message: "Internal error", stack: "" }),
      },
    },
  });
  const server = adapter.getInstance();
  server.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule.register(env), adapter, {
    bufferLogs: true,
    abortOnError: false,
  });
  try {
    // Nest lifecycle messages are structured too. Do not forward raw startup exceptions.
    const logLevels: Record<Environment["LOG_LEVEL"], LogLevel[]> = {
      silent: [],
      fatal: ["fatal"],
      error: ["fatal", "error"],
      warn: ["fatal", "error", "warn"],
      info: ["fatal", "error", "warn", "log"],
      debug: ["fatal", "error", "warn", "log", "debug"],
      trace: ["fatal", "error", "warn", "log", "debug", "verbose"],
    };
    app.useLogger(new ConsoleLogger({ json: true, logLevels: logLevels[env.LOG_LEVEL] }));
    await app.register(helmet);
    await app.register(cookie);
    await app.register(multipart, {
      limits: { fileSize: 6 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
    });
    await app.register(rateLimit, {
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW_MS,
      allowList: (request) =>
        ["/health/live", "/health/ready", "/api/health"].includes(request.url.split("?")[0] ?? ""),
    });
    app.enableCors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type", "X-CampusFix-Request"],
      exposedHeaders: ["X-Request-Id"],
    });
    app.setGlobalPrefix("api/v1", {
      exclude: ["health/live", "health/ready", "api/health"].map((path) => ({
        path,
        method: RequestMethod.GET,
      })),
    });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        transformOptions: { enableImplicitConversion: false },
        validationError: { target: false, value: false },
      }),
    );
    app.useGlobalFilters(new HttpErrorFilter());
    app.enableShutdownHooks(["SIGINT", "SIGTERM"]);
    if (env.SWAGGER_ENABLED && env.NODE_ENV !== "production") {
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle("CampusFix backend").setVersion("1").addBearerAuth().build(),
      );
      SwaggerModule.setup("docs", app, document);
    }
    await app.init();
    // Normalize errors raised by Fastify before they reach Nest (body size, rate limit).
    server.setErrorHandler((error, request, reply) => sendError(error, request, reply));
    await server.ready();
    return app;
  } catch (error) {
    await app.close().catch(() => undefined);
    throw error;
  }
}
