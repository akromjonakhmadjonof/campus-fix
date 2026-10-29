import { Module } from "@nestjs/common";
import { CampusController } from "./campus.controller.js";
import { ReportsService } from "./reports.service.js";
import { SessionsService } from "./sessions.service.js";
import { PhotosService } from "./photos.service.js";
@Module({
  controllers: [CampusController],
  providers: [ReportsService, SessionsService, PhotosService],
})
export class CampusModule {}
