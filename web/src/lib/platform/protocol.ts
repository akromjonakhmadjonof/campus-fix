import { z } from "zod";
// Keep identical to mobile/src/bridge.ts. No domain messages belong here.
export const webReadySchema = z
  .object({ version: z.literal(1), type: z.literal("web.ready") })
  .strict();
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
