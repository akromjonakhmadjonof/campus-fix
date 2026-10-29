import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { CreateProjectDto, PageDto, UpdateProjectDto } from "./projects.dto.js";

const publicFields = {
  id: true,
  name: true,
  slug: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;
export function requireChanges(input: UpdateProjectDto): void {
  if (input.name === undefined && input.slug === undefined && input.description === undefined) {
    throw new BadRequestException("At least one editable field is required");
  }
}

@Injectable()
export class ProjectsService {
  constructor(private readonly db: PrismaService) {}
  create(ownerId: string, input: CreateProjectDto) {
    return this.db.project.create({
      data: { ownerId, name: input.name.trim(), slug: input.slug, description: input.description },
      select: publicFields,
    });
  }
  async list(ownerId: string, pagination: PageDto) {
    const { page, limit } = pagination;
    const data = await this.db.project.findMany({
      where: { ownerId },
      select: publicFields,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, page, limit };
  }
  async get(ownerId: string, id: string) {
    const result = await this.db.project.findFirst({
      where: { id, ownerId },
      select: publicFields,
    });
    // Cross-owner access intentionally has the same response as a missing record.
    if (!result) throw new NotFoundException();
    return result;
  }
  update(ownerId: string, id: string, input: UpdateProjectDto) {
    requireChanges(input);
    // Owner constraint is part of the atomic write, avoiding a check/write race.
    return this.db.project.update({
      where: { id, ownerId },
      data: { name: input.name?.trim(), slug: input.slug, description: input.description },
      select: publicFields,
    });
  }
  async delete(ownerId: string, id: string) {
    await this.db.project.delete({ where: { id, ownerId }, select: { id: true } });
  }
}
