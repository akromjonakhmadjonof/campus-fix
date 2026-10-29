import type { Prisma, PrismaClient } from "./generated/prisma/client.js";

/** Retry the entire transaction, never an individual event write. */
export async function serializable<T>(
  db: PrismaClient,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(work, { isolationLevel: "Serializable" });
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "P2034") throw error;
      if (attempt === 3) throw Object.assign(new Error("CONCURRENT_CHANGE"), { statusCode: 409 });
    }
  }
}
