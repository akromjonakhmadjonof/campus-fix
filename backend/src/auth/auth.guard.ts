import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  type CanActivate,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { FastifyRequest } from "fastify";
import type { Environment } from "../config/environment.js";

export interface Principal {
  subject: string;
  permissions: string[];
}
declare module "fastify" {
  interface FastifyRequest {
    principal?: Principal;
  }
}
export const Public = () => SetMetadata("public", true);
export const Permission = (permission: string) => SetMetadata("permission", permission);
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal => {
    const user = ctx.switchToHttp().getRequest<FastifyRequest>().principal;
    if (!user) throw new UnauthorizedException();
    return user;
  },
);

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly env: Environment;
  private readonly keys?: ReturnType<typeof createRemoteJWKSet>;
  constructor(
    config: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.env = config.getOrThrow<Environment>("app");
    if (this.env.OIDC_JWKS_URI) {
      this.keys = createRemoteJWKSet(new URL(this.env.OIDC_JWKS_URI), {
        timeoutDuration: 3000,
        cooldownDuration: 30000,
        cacheMaxAge: 600000,
      });
    }
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>("public", targets)) return true;
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const match = /^Bearer ([^\s]+)$/.exec(request.headers.authorization ?? "");
    if (!match?.[1] || !this.keys) throw new UnauthorizedException();
    try {
      const { payload } = await jwtVerify(match[1], this.keys, {
        algorithms: ["RS256"],
        issuer: this.env.OIDC_ISSUER,
        audience: this.env.OIDC_AUDIENCE,
        requiredClaims: ["exp", "iat", "sub", "iss", "aud"],
        clockTolerance: 5,
      });
      if (!payload.sub || payload.sub.length > 255) throw new Error("Invalid subject");
      request.principal = {
        subject: payload.sub,
        permissions: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
      };
    } catch {
      throw new UnauthorizedException();
    }
    const permission = this.reflector.getAllAndOverride<string>("permission", targets);
    if (permission && !request.principal.permissions.includes(permission))
      throw new ForbiddenException();
    return true;
  }
}
