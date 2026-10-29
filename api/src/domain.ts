import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { argon2id, hash, verify } from "argon2";
const scrypt = promisify(scryptCallback);
export const digest = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
export const secret = () => randomBytes(32).toString("hex");
export function hashPassword(password: string) {
  return hash(password, { type: argon2id });
}
export async function verifyPassword(password: string, stored: string) {
  if (stored.startsWith("$argon2id$")) return verify(stored, password).catch(() => false);
  // Keep earlier local accounts usable; the CLI resets them to Argon2id.
  const [salt, legacyHash] = stored.split(":");
  if (!salt || !legacyHash) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(legacyHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export const statuses = ["REPORTED", "ACCEPTED", "IN_PROGRESS", "RESOLVED", "REJECTED"] as const;
export const transitions: Record<string, readonly string[]> = {
  REPORTED: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["IN_PROGRESS", "REJECTED"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: [],
  REJECTED: [],
};
export const uuid = z.string().uuid();
export const reportSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3)
      .max(120)
      .regex(/[\p{L}\p{N}]/u),
    description: z
      .string()
      .trim()
      .min(10)
      .max(4000)
      .regex(/[\p{L}\p{N}]/u),
    exactLocation: z
      .string()
      .trim()
      .min(3)
      .max(300)
      .regex(/[\p{L}\p{N}]/u),
    locationId: uuid,
    issueGroupId: uuid,
    issueTypeId: uuid,
    category: z.enum(["ELECTRICAL", "PLUMBING", "FURNITURE", "IT", "CLEANING", "SAFETY", "OTHER"]),
    customIssueName: z.string().trim().max(120).optional(),
    attachmentIds: z.array(uuid).min(1).max(3),
    idempotencyKey: uuid,
    duplicateAcknowledged: z.boolean().default(false),
  })
  .strict();
export const editSchema = reportSchema
  .omit({ idempotencyKey: true, duplicateAcknowledged: true })
  .partial()
  .extend({ version: z.number().int().positive() })
  .strict();
export const similarSchema = reportSchema
  .pick({
    title: true,
    description: true,
    exactLocation: true,
    locationId: true,
    issueTypeId: true,
  })
  .partial({ description: true, exactLocation: true })
  .extend({ excludeId: uuid.optional() })
  .strict();
export function similarity(a: string, b: string) {
  const tokens = (s: string) =>
    new Set(
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .match(/[\p{L}\p{N}]{3,}/gu)
        ?.filter(
          (w) => !["the", "and", "this", "with", "that", "los", "las", "una", "del"].includes(w),
        ) ?? [],
    );
  const x = tokens(a),
    y = tokens(b);
  return x.size && y.size ? [...x].filter((t) => y.has(t)).length / new Set([...x, ...y]).size : 0;
}
export interface LocationNode {
  name: string;
  children?: LocationNode[];
}
export function flattenLocations(value: unknown) {
  const rows: {
    sourceKey: string;
    parentKey: string | null;
    name: string;
    path: string;
    sortOrder: number;
  }[] = [];
  function walk(nodes: unknown, parent: string[], depth: number) {
    if (!Array.isArray(nodes) || depth > 32) throw new Error("Invalid location hierarchy");
    const seen = new Set<string>();
    nodes.forEach((raw: unknown, sortOrder: number) => {
      if (
        !raw ||
        typeof raw !== "object" ||
        !("name" in raw) ||
        typeof raw.name !== "string" ||
        !raw.name.trim()
      )
        throw new Error("Invalid location name");
      const node = raw as LocationNode,
        name = node.name.trim();
      if (seen.has(name.toLowerCase())) throw new Error("Duplicate sibling: " + name);
      seen.add(name.toLowerCase());
      const path = [...parent, name];
      rows.push({
        sourceKey: JSON.stringify(path),
        parentKey: parent.length ? JSON.stringify(parent) : null,
        name,
        path: path.join(" / "),
        sortOrder,
      });
      if (rows.length > 10000) throw new Error("Too many locations");
      walk(node.children ?? [], path, depth + 1);
    });
  }
  walk(value, [], 0);
  return rows;
}
