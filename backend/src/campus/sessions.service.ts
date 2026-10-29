import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { PrismaService } from "../database/prisma.service.js";
import type { Environment } from "../config/environment.js";
import { digest, hashPassword, verifyPassword } from "./rules.js";

@Injectable()
export class SessionsService {
  private readonly env: Environment;
  private readonly dummyPassword = hashPassword(randomBytes(32).toString("hex"));
  constructor(
    private readonly db: PrismaService,
    config: ConfigService,
  ) {
    this.env = config.getOrThrow<Environment>("app");
  }
  assertMutation(req: FastifyRequest) {
    if (req.headers["x-campusfix-request"] !== "1") throw new ForbiddenException();
    const origin = req.headers.origin;
    if (origin && !this.env.CORS_ORIGINS.includes(origin)) throw new ForbiddenException();
  }
  private cookie(reply: FastifyReply, name: string, token: string, age: number) {
    reply.setCookie(name, token, {
      httpOnly: true,
      secure: this.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: age,
    });
    reply.header("cache-control", "no-store");
  }
  async guest(req: FastifyRequest, required = false) {
    const token = req.cookies.cf_guest;
    const session =
      token && /^[a-f0-9]{64}$/.test(token)
        ? await this.db.guestSession.findUnique({ where: { tokenHash: digest(token) } })
        : null;
    if (session && session.expiresAt > new Date()) return session;
    if (required) throw new UnauthorizedException();
    return null;
  }
  async ensureGuest(req: FastifyRequest, reply: FastifyReply) {
    this.assertMutation(req);
    const existing = await this.guest(req);
    if (existing) return { active: true, expiresAt: existing.expiresAt };
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 86400000);
    await this.db.guestSession.create({ data: { tokenHash: digest(token), expiresAt } });
    this.cookie(reply, "cf_guest", token, 30 * 86400);
    return { active: true, expiresAt };
  }
  async staff(req: FastifyRequest, required = false) {
    const token = req.cookies.cf_staff;
    const session =
      token && /^[a-f0-9]{64}$/.test(token)
        ? await this.db.staffSession.findUnique({
            where: { tokenHash: digest(token) },
            include: { staff: true },
          })
        : null;
    if (session && session.expiresAt > new Date()) return session.staff;
    if (required) throw new UnauthorizedException();
    return null;
  }
  async login(req: FastifyRequest, reply: FastifyReply, username: string, password: string) {
    this.assertMutation(req);
    const staff = await this.db.staff.findUnique({
      where: { username: username.trim().toLowerCase() },
    });
    const valid = await verifyPassword(password, staff?.passwordHash ?? (await this.dummyPassword));
    if (!staff || !valid) throw new UnauthorizedException();
    const previous = req.cookies.cf_staff;
    if (previous) await this.db.staffSession.deleteMany({ where: { tokenHash: digest(previous) } });
    const token = randomBytes(32).toString("hex");
    await this.db.staffSession.create({
      data: {
        staffId: staff.id,
        tokenHash: digest(token),
        expiresAt: new Date(Date.now() + 8 * 3600000),
      },
    });
    this.cookie(reply, "cf_staff", token, 8 * 3600);
    return { displayName: staff.displayName };
  }
  async logout(req: FastifyRequest, reply: FastifyReply) {
    this.assertMutation(req);
    if (req.cookies.cf_staff)
      await this.db.staffSession.deleteMany({ where: { tokenHash: digest(req.cookies.cf_staff) } });
    reply.clearCookie("cf_staff", {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: this.env.NODE_ENV === "production",
    });
    return { ok: true };
  }
}
