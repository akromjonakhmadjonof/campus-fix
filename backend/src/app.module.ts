import { Module, type DynamicModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module.js";
import type { Environment } from "./config/environment.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";
import { ProjectsModule } from "./projects/projects.module.js";
import { CampusModule } from "./campus/campus.module.js";

@Module({})
export class AppModule {
  static register(environment: Environment): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          load: [() => ({ app: environment })],
        }),
        DatabaseModule,
        AuthModule,
        HealthModule,
        ProjectsModule,
        CampusModule,
      ],
    };
  }
}
