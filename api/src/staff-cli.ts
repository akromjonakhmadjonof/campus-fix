import "dotenv/config";
import { z } from "zod";
import { createDatabase } from "./lib/database.js";
import { hashPassword } from "./domain.js";
const disable = process.argv.includes("--disable");
const input = z
  .object({
    email: z.email().transform((s) => s.toLowerCase()),
    name: disable ? z.string().optional() : z.string().trim().min(2).max(120),
    password: disable ? z.string().optional() : z.string().min(12).max(128),
  })
  .parse({
    email: process.env.STAFF_EMAIL,
    name: process.env.STAFF_NAME,
    password: process.env.STAFF_PASSWORD,
  });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const db = createDatabase(process.env.DATABASE_URL);
try {
  if (disable) {
    const result = await db.staff.updateMany({
      where: { email: input.email },
      data: { active: false },
    });
    if (!result.count) throw new Error("Staff account not found");
  } else if (input.name && input.password)
    await db.staff.upsert({
      where: { email: input.email },
      create: {
        email: input.email,
        displayName: input.name,
        passwordHash: await hashPassword(input.password),
      },
      update: {
        displayName: input.name,
        passwordHash: await hashPassword(input.password),
        active: true,
      },
    });
  console.log("Staff account saved. No public registration is available.");
} finally {
  await db.$disconnect();
}
