import { afterEach, describe, expect, it, vi } from "vitest";
import { BRIDGE_EVENT } from "./protocol";
import { browserPlatform, connectPlatformBridge, getPlatformSnapshot } from "./runtime";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("bridge handshake", () => {
  it("registers before announcing and handles a synchronous native reply", () => {
    vi.useFakeTimers();
    const host = new EventTarget();
    const postMessage = vi.fn(() =>
      host.dispatchEvent(
        new CustomEvent(BRIDGE_EVENT, {
          detail: JSON.stringify({
            version: 1,
            type: "native.platform",
            payload: { platform: "android" },
          }),
        }),
      ),
    );
    Object.assign(host, { ReactNativeWebView: { postMessage } });
    vi.stubGlobal("window", host);
    const disconnect = connectPlatformBridge();
    try {
      expect(postMessage).toHaveBeenCalledWith(JSON.stringify({ version: 1, type: "web.ready" }));
      expect(getPlatformSnapshot()).toMatchObject({
        platform: "android",
        isNative: true,
        bridgeState: "connected",
      });
      vi.advanceTimersByTime(2000);
      expect(postMessage).toHaveBeenCalledTimes(1);
    } finally {
      disconnect();
    }
    expect(getPlatformSnapshot()).toBe(browserPlatform);
  });
  it("retries readiness when the native bridge arrives late and removes its listener", () => {
    vi.useFakeTimers();
    const host = new EventTarget();
    vi.stubGlobal("window", host);
    const disconnect = connectPlatformBridge();
    expect(getPlatformSnapshot()).toBe(browserPlatform);
    const postMessage = vi.fn();
    Object.assign(host, { ReactNativeWebView: { postMessage } });
    vi.advanceTimersByTime(1000);
    expect(postMessage).toHaveBeenCalledTimes(2);
    expect(getPlatformSnapshot().bridgeState).toBe("connecting");
    disconnect();
    host.dispatchEvent(
      new CustomEvent(BRIDGE_EVENT, {
        detail: JSON.stringify({
          version: 1,
          type: "native.platform",
          payload: { platform: "ios" },
        }),
      }),
    );
    vi.advanceTimersByTime(1000);
    expect(postMessage).toHaveBeenCalledTimes(2);
    expect(getPlatformSnapshot()).toBe(browserPlatform);
  });
});
