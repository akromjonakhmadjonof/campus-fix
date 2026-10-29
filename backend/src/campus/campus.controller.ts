import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RouteConfig } from "@nestjs/platform-fastify";
import type { FastifyRequest, FastifyReply } from "fastify";
import { Public } from "../auth/auth.guard.js";
import {
  EditReportInput,
  LoginInput,
  ReportInput,
  ReportsQuery,
  SimilarInput,
  StatusInput,
} from "./campus.dto.js";
import { ReportsService } from "./reports.service.js";
import { SessionsService } from "./sessions.service.js";
import { PhotosService } from "./photos.service.js";
const uuid = () => new ParseUUIDPipe({ version: "4" });
@Public()
@ApiTags("campus")
@Controller()
export class CampusController {
  constructor(
    private readonly reports: ReportsService,
    private readonly sessions: SessionsService,
    private readonly photos: PhotosService,
  ) {}
  private async guest(req: FastifyRequest) {
    const g = await this.sessions.guest(req, true);
    if (!g) throw new UnauthorizedException();
    return g;
  }
  @Post("sessions")
  @HttpCode(200)
  @RouteConfig({ rateLimit: { max: 60, timeWindow: 60000 } })
  session(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    return this.sessions.ensureGuest(req, reply);
  }
  @Get("locations") locations() {
    return this.reports.locations();
  }
  @Get("summary") summary() {
    return this.reports.summary();
  }
  @Get("reports")
  @Header("Cache-Control", "private, no-store")
  async list(@Query() query: ReportsQuery, @Req() req: FastifyRequest) {
    return this.reports.list(query, (await this.sessions.guest(req))?.id);
  }
  @Post("reports/similar")
  @HttpCode(200)
  similar(@Body() input: SimilarInput, @Req() req: FastifyRequest) {
    this.sessions.assertMutation(req);
    return this.reports.similar(input);
  }
  @Get("reports/:id")
  @Header("Cache-Control", "private, no-store")
  async detail(@Param("id", uuid()) id: string, @Req() req: FastifyRequest) {
    return this.reports.get(id, (await this.sessions.guest(req))?.id);
  }
  @Post("reports")
  async create(@Body() input: ReportInput, @Req() req: FastifyRequest) {
    this.sessions.assertMutation(req);
    return this.reports.create(input, (await this.guest(req)).id);
  }
  @Patch("reports/:id")
  async edit(
    @Param("id", uuid()) id: string,
    @Body() input: EditReportInput,
    @Req() req: FastifyRequest,
  ) {
    this.sessions.assertMutation(req);
    return this.reports.edit(id, input, (await this.guest(req)).id);
  }
  @Post("reports/:id/confirm")
  @HttpCode(200)
  async confirm(@Param("id", uuid()) id: string, @Req() req: FastifyRequest) {
    this.sessions.assertMutation(req);
    return this.reports.confirm(id, (await this.guest(req)).id);
  }
  @Post("photos")
  @RouteConfig({ rateLimit: { max: 10, timeWindow: 60000 } })
  async upload(@Req() req: FastifyRequest) {
    this.sessions.assertMutation(req);
    return this.photos.upload(req, (await this.guest(req)).id);
  }
  @Get("photos/:id")
  async photo(
    @Param("id", uuid()) id: string,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    return this.photos.read(id, (await this.sessions.guest(req))?.id, reply);
  }
  @Get("staff/session")
  @Header("Cache-Control", "private, no-store")
  async staffSession(@Req() req: FastifyRequest) {
    const staff = await this.sessions.staff(req);
    return { staff: staff ? { displayName: staff.displayName } : null };
  }
  @Post("staff/login")
  @HttpCode(200)
  @RouteConfig({ rateLimit: { max: 5, timeWindow: 60000 } })
  login(
    @Body() input: LoginInput,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.sessions.login(req, reply, input.username, input.password);
  }
  @Post("staff/logout")
  @HttpCode(200)
  logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    return this.sessions.logout(req, reply);
  }
  @Patch("staff/reports/:id/status")
  async status(
    @Param("id", uuid()) id: string,
    @Body() input: StatusInput,
    @Req() req: FastifyRequest,
  ) {
    this.sessions.assertMutation(req);
    const staff = await this.sessions.staff(req, true);
    if (!staff) throw new UnauthorizedException();
    return this.reports.status(id, input, staff.id);
  }
}
