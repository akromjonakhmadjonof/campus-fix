import { applyAppearance } from "../appearance";
import { BRIDGE_EVENT, parseNativeMessage, type WebReadyMessage } from "./protocol";
export type Platform = "web" | "android" | "ios";
export interface PlatformInfo {
  platform: Platform;
  isNative: boolean;
  isWeb: boolean;
  bridgeState: "disconnected" | "connecting" | "connected";
}

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(message: string): void };
  }
}

export const browserPlatform: PlatformInfo = {
  platform: "web",
  isNative: false,
  isWeb: true,
  bridgeState: "disconnected",
};
let snapshot = browserPlatform;

const listeners = new Set<() => void>();

export function getPlatformSnapshot() {
  return snapshot;
}
export function getServerPlatformSnapshot() {
  return browserPlatform;
}
export function subscribePlatform(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function update(next: PlatformInfo) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}
export function connectPlatformBridge() {
  const receive = (event: Event) => {
    if (!window.ReactNativeWebView || !(event instanceof CustomEvent)) return;
    const message = parseNativeMessage(event.detail);
    if (!message) return;
    clearInterval(timer);
    update({
      platform: message.payload.platform,
      isNative: true,
      isWeb: false,
      bridgeState: "connected",
    });
    // Every handshake replays current appearance, including native reloads and late bridges.
    applyAppearance();
  };
  // Listen first; a native reply may be immediate.
  window.addEventListener(BRIDGE_EVENT, receive);
  const ready: WebReadyMessage = { version: 1, type: "web.ready" };
  const announce = () => {
    if (!window.ReactNativeWebView || snapshot.bridgeState === "connected") return;
    if (snapshot.bridgeState !== "connecting")
      update({ ...browserPlatform, bridgeState: "connecting" });
    window.ReactNativeWebView.postMessage(JSON.stringify(ready));
  };
  // Retrying also handles a bridge injected after hydration.
  const timer = setInterval(announce, 500);
  announce();
  return () => {
    clearInterval(timer);
    window.removeEventListener(BRIDGE_EVENT, receive);
    snapshot = browserPlatform;
  };
}
