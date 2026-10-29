import { Controller, Get, Module, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/auth.guard.js";
import { PrismaService } from "../database/prisma.service.js";

@ApiTags("health")
@Public()
@Controller()
export class HealthController {
  constructor(private readonly db: PrismaService) {}
  @Get("health/live") live() {
    return { status: "ok" };
  }
  @Get("api/health") compatibility() {
    return this.live();
  }
  @Get("health/ready") async ready() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: "ok" };
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
@Module({ controllers: [HealthController] })
export class HealthModule {}
