import { ArgumentsHost, Catch, HttpException, type ExceptionFilter } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "../generated/prisma/client.js";

export function sendError(error: unknown, request: FastifyRequest, reply: FastifyReply) {
  let status = 500;
  if (error instanceof HttpException) status = error.getStatus();
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") status = 409;
    if (error.code === "P2025") status = 404;
  } else if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number" &&
    [400, 413, 415, 429].includes(error.statusCode)
  )
    status = error.statusCode;
  const messages: Record<number, [string, string]> = {
    400: ["INVALID_REQUEST", "Invalid request"],
    401: ["UNAUTHORIZED", "Authentication required"],
    403: ["FORBIDDEN", "Permission denied"],
    404: ["NOT_FOUND", "Resource not found"],
    409: ["CONFLICT", "This change conflicts with the current record"],
    413: ["PAYLOAD_TOO_LARGE", "Request body too large"],
    415: ["UNSUPPORTED_MEDIA_TYPE", "Unsupported media type"],
    429: ["RATE_LIMITED", "Too many requests"],
    503: ["UNAVAILABLE", "Service unavailable"],
  };
  const [code, message] = messages[status] ?? ["INTERNAL_ERROR", "Internal server error"];
  // Never log raw exceptions: Prisma/driver errors can include SQL and connection strings.
  if (status >= 500) request.log.error({ requestId: request.id, status }, "Request failed");
  return reply.status(status).send({ statusCode: status, code, message, requestId: request.id });
}

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    return sendError(
      error,
      context.getRequest<FastifyRequest>(),
      context.getResponse<FastifyReply>(),
    );
  }
}
