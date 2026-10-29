import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
export const digest = (token: string) => createHash("sha256").update(token).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await derive(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const key = (await derive(password, salt, 64)) as Buffer;
  const target = Buffer.from(expected, "hex");
  return key.length === target.length && timingSafeEqual(key, target);
}
export function similarity(a: string, b: string) {
  const words = (v: string) =>
    new Set(
      v
        .toLowerCase()
        .normalize("NFKC")
        .match(/[\p{L}\p{N}]{3,}/gu) ?? [],
    );
  const left = words(a);
  const right = words(b);
  const union = new Set([...left, ...right]);
  return union.size ? [...left].filter((w) => right.has(w)).length / union.size : 0;
}
export function nextStatus(current: string, next: string) {
  return (
    (current === "REPORTED" && next === "IN_PROGRESS") ||
    (current === "IN_PROGRESS" && next === "RESOLVED")
  );
}
