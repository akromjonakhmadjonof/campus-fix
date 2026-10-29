import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { Prisma } from "../generated/prisma/client.js";
import type {
  EditReportInput,
  ReportInput,
  ReportsQuery,
  SimilarInput,
  StatusInput,
} from "./campus.dto.js";
import { nextStatus, similarity } from "./rules.js";
const selection = {
  id: true,
  title: true,
  description: true,
  category: true,
  exactLocation: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  guestId: true,
  location: { select: { id: true, name: true, path: true, parentId: true } },
  attachments: { select: { id: true } },
  history: {
    select: { id: true, status: true, note: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  _count: { select: { confirmations: true } },
} satisfies Prisma.ReportSelect;
type Row = Prisma.ReportGetPayload<{ select: typeof selection }>;
export function presentReport(row: Row, guestId?: string, confirmed = false) {
  const { guestId: owner, _count, attachments, ...report } = row;
  return {
    ...report,
    photos: attachments.map((a) => ({ id: a.id, url: `/backend/v1/photos/${a.id}` })),
    confirmationCount: _count.confirmations,
    isMine: owner === guestId,
    confirmed,
    canEdit: owner === guestId && row.status === "REPORTED",
  };
}
@Injectable()
export class ReportsService {
  constructor(private readonly db: PrismaService) {}
  locations() {
    return this.db.location.findMany({ orderBy: { path: "asc" } });
  }
  async list(query: ReportsQuery, guestId?: string) {
    if (query.activity && !guestId) throw new UnauthorizedException();
    let location: Prisma.LocationWhereInput | undefined;
    if (query.locationId) {
      const selected = await this.db.location.findUnique({ where: { id: query.locationId } });
      if (!selected) throw new BadRequestException();
      location = { OR: [{ id: selected.id }, { path: { startsWith: selected.path + " / " } }] };
    }
    const where: Prisma.ReportWhereInput = {
      category: query.category,
      status: query.status,
      location,
      ...(query.activity === "mine" ? { guestId } : {}),
      ...(query.activity === "confirmed" ? { confirmations: { some: { guestId } } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" } },
              { description: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.db.$transaction(
      [
        this.db.report.findMany({
          where,
          select: selection,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          orderBy:
            query.sort === "confirmed"
              ? [{ confirmations: { _count: "desc" } }, { createdAt: "desc" }, { id: "desc" }]
              : [{ createdAt: "desc" }, { id: "desc" }],
        }),
        this.db.report.count({ where }),
      ],
      { isolationLevel: "RepeatableRead" },
    );
    const votes = guestId
      ? await this.db.confirmation.findMany({
          where: { guestId, reportId: { in: rows.map((r) => r.id) } },
          select: { reportId: true },
        })
      : [];
    const confirmed = new Set(votes.map((v) => v.reportId));
    return {
      data: rows.map((row) => presentReport(row, guestId, confirmed.has(row.id))),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
  async get(id: string, guestId?: string) {
    const row = await this.db.report.findUnique({ where: { id }, select: selection });
    if (!row) throw new NotFoundException();
    const vote = guestId
      ? await this.db.confirmation.findUnique({
          where: { reportId_guestId: { reportId: id, guestId } },
        })
      : null;
    return presentReport(row, guestId, !!vote);
  }
  async create(input: ReportInput, guestId: string) {
    if (!(await this.db.location.findUnique({ where: { id: input.locationId } })))
      throw new BadRequestException();
    const id = await this.db.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: {
          title: input.title.trim(),
          description: input.description.trim(),
          category: input.category,
          locationId: input.locationId,
          exactLocation: input.exactLocation.trim(),
          guestId,
          history: { create: { status: "REPORTED", note: "" } },
        },
        select: { id: true },
      });
      const claimed = await tx.attachment.updateMany({
        where: { id: input.attachmentId, guestId, reportId: null },
        data: { reportId: report.id },
      });
      if (claimed.count !== 1) throw new BadRequestException("Invalid attachment");
      return report.id;
    });
    return this.get(id, guestId);
  }
  async edit(id: string, input: EditReportInput, guestId: string) {
    const changed = await this.db.report.updateMany({
      where: { id, guestId, status: "REPORTED" },
      data: {
        title: input.title.trim(),
        description: input.description.trim(),
        exactLocation: input.exactLocation.trim(),
      },
    });
    if (changed.count !== 1) throw new NotFoundException();
    return this.get(id, guestId);
  }
  async confirm(id: string, guestId: string) {
    if (!(await this.db.report.findUnique({ where: { id }, select: { id: true } })))
      throw new NotFoundException();
    // INSERT ON CONFLICT DO NOTHING is atomic even for simultaneous first confirmations.
    await this.db.confirmation.createMany({
      data: [{ reportId: id, guestId }],
      skipDuplicates: true,
    });
    return this.get(id, guestId);
  }
  async similar(input: SimilarInput) {
    const rows = await this.db.report.findMany({
      where: {
        status: { not: "RESOLVED" },
        OR: [{ locationId: input.locationId }, { category: input.category }],
      },
      select: selection,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });
    return rows
      .map((row) => ({
        report: presentReport(row),
        score:
          (row.location.id === input.locationId ? 0.45 : 0) +
          (row.category === input.category ? 0.25 : 0) +
          0.3 *
            similarity(input.title + " " + input.description, row.title + " " + row.description),
      }))
      .filter((item) => item.score >= 0.45)
      .sort((a, b) => b.score - a.score || a.report.id.localeCompare(b.report.id))
      .slice(0, 5);
  }
  async status(id: string, input: StatusInput, staffId: string) {
    await this.db.$transaction(async (tx) => {
      const report = await tx.report.findUnique({ where: { id }, select: { status: true } });
      if (!report) throw new NotFoundException();
      if (!nextStatus(report.status, input.status)) throw new ConflictException();
      const changed = await tx.report.updateMany({
        where: { id, status: report.status },
        data: { status: input.status },
      });
      if (changed.count !== 1) throw new ConflictException();
      await tx.statusChange.create({
        data: { reportId: id, staffId, status: input.status, note: input.note.trim() },
      });
    });
    return this.get(id);
  }
  async summary() {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - 6);
    const [counts, dates] = await this.db.$transaction(
      [
        this.db.report.groupBy({
          by: ["status"],
          orderBy: { status: "asc" },
          _count: { _all: true },
        }),
        this.db.report.findMany({
          where: { createdAt: { gte: start } },
          select: { createdAt: true },
        }),
      ],
      { isolationLevel: "RepeatableRead" },
    );
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + i);
      return { date: date.toISOString().slice(0, 10), count: 0 };
    });
    for (const row of dates) {
      const day = days.find((d) => d.date === row.createdAt.toISOString().slice(0, 10));
      if (day) day.count++;
    }
    const statuses = { REPORTED: 0, IN_PROGRESS: 0, RESOLVED: 0 };
    for (const item of counts) {
      if (typeof item._count === "object") statuses[item.status] = item._count._all ?? 0;
    }
    return { counts: statuses, days };
  }
}
