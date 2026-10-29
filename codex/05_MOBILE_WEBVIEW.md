# PHASE 05 — EXPO WRAPPER, ONE WEB APP, LOCAL NETWORK

Mobile exists to **host the Next.js web application only**. No duplicate React Native screens, navigation, forms, state, issue cards or API business logic. The WebView is a runtime/container with carefully scoped native behavior.

## 1. Expo app

- Use installed Expo + TypeScript and `react-native-webview` + safe-area context; install only missing compatible dependencies.
- Single root screen: full-screen WebView with source `EXPO_PUBLIC_WEB_URL`; loading, connection failure with Retry, navigation error UI. Don't hardcode cloud URL or machine-specific IP.
- Respect top/bottom safe-area; avoid _double_ safe-area from both web and React Native. Provide a reliable style contract (e.g. wrapper owns top system inset and web tab bar handles bottom inset, or wrapper owns both but no double padding). Test iOS/Android variations.
- Handle Android hardware Back to WebView `goBack()` when browser history exists, otherwise normal system behavior; don't trap app forever.
- Use WebView `onMessage` with a **versioned, validated** message protocol. On `web.ready`, native responds `native.platform` (`ios` or `android`) with capability flags. Web defaults to `web` when not in native. Avoid relying on brittle user-agent strings or early-injection timing alone; explicit handshake with retry on reload.
- Restrict untrusted/external navigation: only load trusted configured web origin in app WebView, send external URLs to OS browser when appropriate. Don't allow arbitrary injected JS from untrusted origins.
- React Native must not create a separate anonymous account or staff auth system; all sessions and authorization occur through the web application/API. Browser and WebView cookie stores may be separate, so use explicit link flow in web (phase 03), never silently copy cookies or share bearer credentials.

## 2. URL and localhost behavior

Development web URL: `http://localhost:3000`. Backend: Fastify `127.0.0.1:4000`; Next rewrites `/backend/*` to Fastify so **mobile only reaches Next**. Next dev binds `0.0.0.0` for LAN where appropriate.

- Host browser: `http://localhost:3000`.
- iOS Simulator on same Mac: typically `http://localhost:3000` when reachable.
- Android Emulator: `adb reverse tcp:3000 tcp:3000` then WebView `http://localhost:3000`; fallback emulator host `http://10.0.2.2:3000` if supported.
- Android physical device via USB ADB reverse: host port forwarding for 3000; or use host LAN IPv4 and firewall permit.
- Physical iPhone: device's `localhost` refers to **phone**, not laptop; use a host LAN IP on same network (e.g. `http://192.168.1.20:3000`) or a separately configured reachable endpoint. No cloud required but a network connection is.

Document that `localhost` and LAN IP are different browser origins, so cookie/session identity will not automatically transfer between them even in one browser. The one-time explicit account link addresses that. Include development-only cleartext HTTP permissions if Expo/iOS/Android need them. Do not loosen production ATS/cleartext restrictions without need; HTTPS is appropriate outside local dev. Ensure image uploads and `GET /backend/media/:id/content` work from WebView and not only host browser.

## 3. Device and photo concerns

The web's `input type=file` and `capture` attribute should work in compatible mobile contexts, but behavior can vary. Test Android emulator/physical device and iOS simulator/device where available. Configure WebView native picker/camera permissions **only if necessary**, with user-friendly permission text. Do not implement Expo ImagePicker or camera bridge unless standard WebView file input fails on the targeted platform and the actual workflow needs it. If added, keep it as a tiny native bridge capability, not a second reporting form. Never inject filesystem paths into web report payloads.

## 4. QA

- Open normal browser, create report and observe correct web platform status.
- Open Expo WebView, check native platform indicator and same UI/routes.
- Prove two unlinked contexts are independent; use one-time code and A-side confirmation to pair; after link, both access same 'My Reports' and editing privileges.
- Verify upload/photo preview, media fetch, back navigation, language change, dark theme, keyboard, safe areas and 404/retry.
- If no native SDK/device is available, compile/config validate and mark device checks not run. Never say native camera worked without testing.
