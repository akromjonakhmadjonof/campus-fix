import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser, Permission, type Principal } from "../auth/auth.guard.js";
import {
  CreateProjectDto,
  PageDto,
  ProjectPageResponse,
  ProjectResponse,
  UpdateProjectDto,
} from "./projects.dto.js";
import { ProjectsService } from "./projects.service.js";

@ApiTags("projects")
@ApiBearerAuth()
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}
  @Post()
  @Permission("projects:write")
  @ApiCreatedResponse({ type: ProjectResponse })
  create(@CurrentUser() user: Principal, @Body() input: CreateProjectDto) {
    return this.projects.create(user.subject, input);
  }
  @Get()
  @Permission("projects:read")
  @ApiOkResponse({ type: ProjectPageResponse })
  list(@CurrentUser() user: Principal, @Query() pagination: PageDto) {
    return this.projects.list(user.subject, pagination);
  }
  @Get(":id")
  @Permission("projects:read")
  @ApiOkResponse({ type: ProjectResponse })
  get(
    @CurrentUser() user: Principal,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    return this.projects.get(user.subject, id);
  }
  @Patch(":id")
  @Permission("projects:write")
  @ApiOkResponse({ type: ProjectResponse })
  update(
    @CurrentUser() user: Principal,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdateProjectDto,
  ) {
    return this.projects.update(user.subject, id, input);
  }
  @Delete(":id")
  @Permission("projects:write")
  @HttpCode(204)
  @ApiNoContentResponse()
  delete(
    @CurrentUser() user: Principal,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    return this.projects.delete(user.subject, id);
  }
}
