import { z } from "zod";
// Keep identical to mobile/src/bridge.ts. No domain messages belong here.
export const webReadySchema = z
  .object({ version: z.literal(1), type: z.literal("web.ready") })
  .strict();

export const appearanceModeSchema = z.enum(["light", "dark"]);
const colorSchema = z
  .string()
  .regex(/^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/)
  .refine((value) => (value.match(/\d+/g) ?? []).every((channel) => Number(channel) <= 255));
export const webAppearanceSchema = z
  .object({
    version: z.literal(1),
    type: z.literal("web.appearance"),
    payload: z
      .object({
        mode: appearanceModeSchema,
        colors: z
          .object({
            background: colorSchema,
            foreground: colorSchema,
            card: colorSchema,
            mutedForeground: colorSchema,
            primary: colorSchema,
            primaryForeground: colorSchema,
          })
          .strict(),
      })
      .strict(),
  })
  .strict();
export const webMessageSchema = z.discriminatedUnion("type", [webReadySchema, webAppearanceSchema]);
export type AppearanceMode = z.infer<typeof appearanceModeSchema>;
export type WebAppearanceMessage = z.infer<typeof webAppearanceSchema>;
export type WebMessage = z.infer<typeof webMessageSchema>;
export const nativePlatformSchema = z
  .object({
    version: z.literal(1),
    type: z.literal("native.platform"),
    payload: z.object({ platform: z.enum(["android", "ios"]) }).strict(),
  })
  .strict();
export type WebReadyMessage = z.infer<typeof webReadySchema>;
export type NativePlatformMessage = z.infer<typeof nativePlatformSchema>;
export const BRIDGE_EVENT = "campus-fix:bridge";
export function parseNativeMessage(value: unknown): NativePlatformMessage | undefined {
  try {
    if (typeof value !== "string" || value.length > 1024) return;
    const parsed = nativePlatformSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return;
  }
}
