import { BadRequestException, Injectable, NotFoundException, HttpException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import type { FastifyRequest, FastifyReply } from "fastify";
import { PrismaService } from "../database/prisma.service.js";
import type { Environment } from "../config/environment.js";
@Injectable()
export class PhotosService {
  private readonly root: string;
  constructor(
    private readonly db: PrismaService,
    config: ConfigService,
  ) {
    this.root = resolve(config.getOrThrow<Environment>("app").UPLOAD_DIR);
  }
  async upload(req: FastifyRequest, guestId: string) {
    const count = await this.db.attachment.count({
      where: { guestId, createdAt: { gte: new Date(Date.now() - 86400000) } },
    });
    if (count >= 20) throw new HttpException("Upload limit", 429);
    const file = await req.file({
      limits: { fileSize: 6 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
    });
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype))
      throw new BadRequestException();
    let bytes: Buffer;
    try {
      const source = await file.toBuffer();
      const image = sharp(source, { limitInputPixels: 20000000, animated: false });
      const metadata = await image.metadata();
      if (
        !metadata.format ||
        !["jpeg", "png", "webp"].includes(metadata.format) ||
        (metadata.pages ?? 1) > 1
      )
        throw new Error("Invalid image");
      bytes = await image
        .rotate()
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw new BadRequestException("Invalid image");
    }
    const filename = `${randomUUID()}.webp`;
    await mkdir(this.root, { recursive: true });
    await writeFile(resolve(this.root, filename), bytes, { flag: "wx" });
    try {
      const attachment = await this.db.attachment.create({
        data: { guestId, filename },
        select: { id: true },
      });
      return { ...attachment, url: `/backend/v1/photos/${attachment.id}` };
    } catch (error) {
      await unlink(resolve(this.root, filename)).catch(() => undefined);
      throw error;
    }
  }
  async read(id: string, guestId: string | undefined, reply: FastifyReply) {
    const photo = await this.db.attachment.findUnique({ where: { id } });
    if (!photo || (!photo.reportId && photo.guestId !== guestId)) throw new NotFoundException();
    reply
      .type("image/webp")
      .header("x-content-type-options", "nosniff")
      .header("cache-control", photo.reportId ? "public, max-age=300" : "private, no-store");
    return reply.send(createReadStream(resolve(this.root, photo.filename)));
  }
}
