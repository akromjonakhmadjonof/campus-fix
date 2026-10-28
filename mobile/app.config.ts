import type { ExpoConfig } from "expo/config";
const development = process.env.APP_VARIANT === "development";
const webUrl =
  process.env.EXPO_PUBLIC_WEB_URL ?? (development ? "http://localhost:3000" : undefined);
if (!webUrl) throw new Error("Set EXPO_PUBLIC_WEB_URL to an HTTPS endpoint for release builds");
const url = new URL(webUrl);
if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
  throw new Error("EXPO_PUBLIC_WEB_URL must be an HTTP(S) URL without credentials");
if (!development && url.protocol !== "https:")
  throw new Error("Release builds require an HTTPS EXPO_PUBLIC_WEB_URL");
const config: ExpoConfig = {
  name: "CampusFix",
  platforms: ["ios", "android"],
  slug: "campus-fix",
  version: "0.1.0",
  orientation: "default",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "app.campusfix.mobile",
    infoPlist: development
      ? {
          NSLocalNetworkUsageDescription:
            "CampusFix connects to your Mac’s local development servers for testing.",
          NSAppTransportSecurity: { NSAllowsArbitraryLoads: true, NSAllowsLocalNetworking: true },
        }
      : {
          NSAppTransportSecurity: {
            NSAllowsArbitraryLoads: false,
            NSAllowsArbitraryLoadsInWebContent: false,
            NSAllowsLocalNetworking: false,
            NSExceptionDomains: {},
          },
        },
  },
  android: { package: "app.campusfix.mobile" },
  plugins: [["expo-build-properties", { android: { usesCleartextTraffic: development } }]],
};
export default config;
