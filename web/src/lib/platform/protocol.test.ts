import { describe, expect, it } from "vitest";
import { parseNativeMessage } from "./protocol";
import { browserPlatform, getPlatformSnapshot, getServerPlatformSnapshot } from "./runtime";
describe("platform foundation", () => {
  it("starts with an identical browser and SSR fallback", () => {
    expect(getPlatformSnapshot()).toEqual(browserPlatform);
    expect(getServerPlatformSnapshot()).toBe(browserPlatform);
    expect(browserPlatform).toEqual({
      platform: "web",
      isNative: false,
      isWeb: true,
      bridgeState: "disconnected",
    });
  });
  it.each(["android", "ios"])("accepts a versioned %s identity", (platform) => {
    expect(
      parseNativeMessage(
        JSON.stringify({ version: 1, type: "native.platform", payload: { platform } }),
      )?.payload.platform,
    ).toBe(platform);
  });
  it.each([
    null,
    {},
    "invalid",
    "null",
    "{}",
    JSON.stringify({ version: 2, type: "native.platform", payload: { platform: "ios" } }),
    JSON.stringify({ version: 1, type: "native.platform", payload: { platform: "web" } }),
    JSON.stringify({
      version: 1,
      type: "native.platform",
      payload: { platform: "ios", token: "invalid" },
    }),
    "x".repeat(1025),
  ])("ignores malformed or unsupported messages: %j", (message) => {
    expect(parseNativeMessage(message)).toBeUndefined();
  });
});
