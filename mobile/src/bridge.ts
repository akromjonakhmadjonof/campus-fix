import { z } from "zod";
// Keep message schemas and BRIDGE_EVENT identical to web/src/lib/platform/protocol.ts.
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

export function parseWebMessage(value: string): WebReadyMessage | undefined {
  try {
    if (value.length > 1024) return;
    const parsed = webReadySchema.safeParse(JSON.parse(value));
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
