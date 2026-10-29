import "dotenv/config";
import { z } from "zod";
export const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z
    .url()
    .refine(
      (value) =>
        URL.canParse(value) && ["postgres:", "postgresql:"].includes(new URL(value).protocol),
      "Use a PostgreSQL connection URL",
    )
    .optional(),
});
export type Environment = z.infer<typeof environmentSchema>;
export function parseEnvironment(values: NodeJS.ProcessEnv = process.env): Environment {
  return environmentSchema.parse(values);
}
