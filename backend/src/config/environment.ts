import { config } from "dotenv";
import { resolve } from "node:path";
import { isIP } from "node:net";
import { z } from "zod";

const integer = (fallback: number, min: number, max: number) =>
  z.preprocess(
    (v) => (v === undefined ? fallback : v),
    z
      .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
      .pipe(z.number().int().min(min).max(max)),
  );
const boolean = (fallback: boolean) =>
  z.preprocess(
    (v) => (v === undefined ? String(fallback) : v),
    z.enum(["true", "false"]).transform((v) => v === "true"),
  );
const optionalString = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().min(1).optional(),
);
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().min(1).default("127.0.0.1"),
    PORT: integer(4000, 1, 65535),
    DATABASE_URL: z
      .string()
      .url()
      .refine((v) => {
        if (!URL.canParse(v)) return false;
        const u = new URL(v);
        return (
          ["postgres:", "postgresql:"].includes(u.protocol) &&
          !!u.username &&
          u.pathname.length > 1 &&
          !u.search &&
          !u.hash
        );
      }),
    DB_SSL: boolean(false),
    DB_SSL_CA_FILE: optionalString,
    DB_POOL_MAX: integer(10, 1, 100),
    DB_CONNECT_TIMEOUT_MS: integer(2000, 100, 30000),
    DB_IDLE_TIMEOUT_MS: integer(30000, 1000, 300000),
    DB_QUERY_TIMEOUT_MS: integer(3000, 100, 30000),
    CORS_ORIGINS: z
      .string()
      .default("http://localhost:3000")
      .transform((v) => v.split(",").map((s) => s.trim()))
      .refine(
        (v) =>
          v.length > 0 &&
          v.every((s) => {
            try {
              const u = new URL(s);
              return ["http:", "https:"].includes(u.protocol) && u.origin === s;
            } catch {
              return false;
            }
          }),
      ),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    BODY_LIMIT_BYTES: integer(16384, 1024, 1048576),
    RATE_LIMIT_MAX: integer(100, 1, 10000),
    RATE_LIMIT_WINDOW_MS: integer(60000, 1000, 3600000),
    TRUST_PROXY: z.string().default(""),
    OIDC_ISSUER: optionalString,
    OIDC_AUDIENCE: optionalString,
    OIDC_JWKS_URI: optionalString,
    SWAGGER_ENABLED: boolean(false),
    UPLOAD_DIR: z.string().min(1).default("uploads"),
  })
  .superRefine((v, ctx) => {
    const fail = (key: string) =>
      ctx.addIssue({ code: "custom", path: [key], message: "Invalid setting" });
    const auth = [v.OIDC_ISSUER, v.OIDC_AUDIENCE, v.OIDC_JWKS_URI];
    if (auth.some(Boolean) && !auth.every(Boolean)) fail("OIDC_ISSUER/OIDC_AUDIENCE/OIDC_JWKS_URI");
    for (const key of ["OIDC_ISSUER", "OIDC_JWKS_URI"] as const) {
      if (!v[key]) continue;
      try {
        const u = new URL(v[key]);
        const localTest =
          v.NODE_ENV === "test" &&
          ["localhost", "127.0.0.1"].includes(u.hostname) &&
          u.protocol === "http:";
        if ((!localTest && u.protocol !== "https:") || u.username || u.password || u.hash)
          fail(key);
      } catch {
        fail(key);
      }
    }
    if (v.NODE_ENV === "production") {
      if (!v.DB_SSL) fail("DB_SSL");
      if (v.SWAGGER_ENABLED) fail("SWAGGER_ENABLED");
      if (v.CORS_ORIGINS.some((o) => !o.startsWith("https://"))) fail("CORS_ORIGINS");
    }
    // Accept only explicit IPs/CIDRs, never blanket trust or a hop count.
    if (
      v.TRUST_PROXY &&
      !v.TRUST_PROXY.split(",").every((s) => {
        const [address, bits, extra] = s.trim().split("/");
        return (
          !!address &&
          isIP(address) === 4 &&
          extra === undefined &&
          (bits === undefined || (/^\d{1,2}$/.test(bits) && Number(bits) <= 32))
        );
      })
    )
      fail("TRUST_PROXY");
  });

export type Environment = z.infer<typeof schema>;
export class ConfigurationError extends Error {}
export function parseEnvironment(values: Record<string, unknown>): Environment {
  const result = schema.safeParse(values);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((i) => i.path.join(".")))];
    throw new ConfigurationError(
      `Invalid configuration: ${fields.join(", ")}. See backend/.env.example.`,
    );
  }
  return result.data;
}
export function loadEnvironment(): Environment {
  config({ path: resolve(process.cwd(), ".env"), quiet: true });
  return parseEnvironment(process.env);
}
