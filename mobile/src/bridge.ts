import { z } from "zod";
// Keep message schemas and BRIDGE_EVENT identical to web/src/lib/platform/protocol.ts.
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

export function parseWebMessage(value: string): WebMessage | undefined {
  try {
    if (value.length > 1024) return;
    const parsed = webMessageSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return;
  }
}
export function platformScript(platform: "android" | "ios") {
  const message: NativePlatformMessage = {
    version: 1,
    type: "native.platform",
    payload: { platform },
  };
  return `window.dispatchEvent(new CustomEvent(${JSON.stringify(BRIDGE_EVENT)}, {detail: ${JSON.stringify(JSON.stringify(message))}})); true;`;
}
