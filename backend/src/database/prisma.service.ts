import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "node:fs";
import type { Environment } from "../config/environment.js";
import { PrismaClient } from "../generated/prisma/client.js";

export function databaseAdapter(env: Environment) {
  return new PrismaPg({
    connectionString: env.DATABASE_URL,
    max: env.DB_POOL_MAX,
    connectionTimeoutMillis: env.DB_CONNECT_TIMEOUT_MS,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
    statement_timeout: env.DB_QUERY_TIMEOUT_MS,
    query_timeout: env.DB_QUERY_TIMEOUT_MS,
    ssl: env.DB_SSL
      ? {
          rejectUnauthorized: true,
          ...(env.DB_SSL_CA_FILE ? { ca: readFileSync(env.DB_SSL_CA_FILE, "utf8") } : {}),
        }
      : false,
  });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  constructor(config: ConfigService) {
    super({ adapter: databaseAdapter(config.getOrThrow<Environment>("app")), log: [] });
  }
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("Database connected");
    } catch {
      this.logger.warn("Database unavailable; readiness will report unavailable");
    }
  }
  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("Database connections closed");
  }
}
