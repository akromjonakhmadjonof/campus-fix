# CampusFix

A local development foundation for a campus maintenance application. No reporting,
authentication, or other product workflows are implemented yet.

Next.js owns the UI and routing. Expo hosts that same app in a native WebView.
Fastify owns the API and PostgreSQL access. No cloud service or Docker is required.

## Stack and layout

- Web: Next.js 16, React 19, strict TypeScript, Tailwind 4, editable shadcn/Radix
  components, Lucide, next-intl, NProgress, Motion, TanStack Query, Axios, Sonner,
  React Hook Form, Zod, resolvers, Day.js, CVA, clsx, tailwind-merge, tw-animate-css.
- Mobile: Expo SDK 58 blank TypeScript foundation, React Native, WebView, safe areas.
  Its React version follows Expo's template independently of the web workspace.
- API: Fastify 5, Prisma 7.10.1, PostgreSQL driver adapter, Zod configuration.
  Prisma is pinned to stable v7 rather than the registry's v8 release candidate.
- Tooling: pnpm workspaces, ESLint, Prettier, Vitest, Playwright.

```text
campus-fix/
├── web/
│   ├── public/
│   ├── src/
│   │   ├── app/[locale]/        # Server layout and neutral verification page
│   │   ├── components/ui/      # Locally editable generic primitives
│   │   ├── hooks/
│   │   ├── i18n/
│   │   ├── lib/api/
│   │   ├── lib/platform/
│   │   ├── messages/           # en.json, es.json
│   │   ├── providers/
│   │   ├── styles/fonts/       # Local Nunito and its OFL license
│   │   └── proxy.ts
│   ├── tests/e2e/
│   ├── .env.example
│   └── package.json            # Plus framework/tool configuration
├── mobile/
│   ├── src/bridge.ts
│   ├── App.tsx
│   ├── index.ts
│   ├── app.config.ts
│   ├── .env.example
│   └── package.json
├── api/
│   ├── prisma/schema.prisma    # Intentionally no models or migrations
│   ├── src/{config,plugins,routes,lib}/
│   ├── src/app.ts
│   ├── src/server.ts
│   ├── prisma.config.ts
│   ├── .env.example
│   └── package.json
├── .editorconfig
├── .gitignore
├── .prettierrc
├── .prettierignore
├── eslint.config.mjs
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── prompt.md
└── README.md
```

## Prerequisites and installation

Use **Node 24.12+ within Node 24 LTS** (`.node-version` selects 24.18.0) and
**pnpm 11.17.0**, matching VINDEX. Enable Corepack if your Node installation has
it, or install that exact pnpm version using your usual package-manager setup.
PostgreSQL is needed only for database operations. Android development requires
Android Studio, an installed emulator/SDK, Java, and `adb` on PATH. iOS development
requires macOS, full Xcode, a simulator runtime, and the native build prerequisites
reported by Expo. Command Line Tools alone do not include the iOS Simulator.

From this directory:

```sh
pnpm install
cp web/.env.example web/.env.local
cp mobile/.env.example mobile/.env
cp api/.env.example api/.env
pnpm db:generate
pnpm dev
```

These are sample values; edit the ignored `.env` files locally. Do not commit
credentials. `DATABASE_URL` is optional for process health and server startup.
Prisma CLI commands have a local placeholder URL when no environment is provided;
that placeholder is not a provisioned database or a password.

`pnpm dev` runs web/API together, without Expo:

- Web: [http://localhost:3000/en](http://localhost:3000/en)
- API process health: [http://localhost:4000/api/health](http://localhost:4000/api/health)
- Proxied health: [http://localhost:3000/backend/health](http://localhost:3000/backend/health)

Or use separate terminals:

```sh
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
```

Next listens on `0.0.0.0:3000` for LAN access. Fastify defaults to
`127.0.0.1:4000`; phones reach it through Next, not directly.

## Local PostgreSQL and Prisma

Use an existing local PostgreSQL installation, not a hosted database. For example,
with Homebrew PostgreSQL 17:

```sh
brew services start postgresql@17
pg_isready -h localhost -p 5432
```

Use the service name for your installed version. Create a dedicated development
role/database manually if needed; initialization scripts never create, drop,
reset, or migrate databases. Replace the example URL with your own local values.

```sh
pnpm db:validate
pnpm db:generate
# After domain models are designed and the development database exists:
pnpm db:migrate --name initial
pnpm db:studio
```

The v7 `prisma-client` generator writes ignored TypeScript files into
`api/src/generated/prisma`. Build/typecheck regenerate them. Prisma uses the
PostgreSQL driver adapter and a lazy connection. Fastify disconnects Prisma on
shutdown. `/api/health` checks the process, not database readiness. No domain tables
are necessary for it. Migration history is intentionally uninitialized.

## Testing Android, iOS Simulator, and your iPhone

The Mac setup uses Android Studio, the Android SDK in `~/Library/Android/sdk`,
Apple Silicon JDK 17, Watchman, CocoaPods, and Xcode. Android SDK paths are added to
`~/.zprofile`; open a fresh terminal to pick them up. CampusFix selects JDK 17 for
Android commands without changing your system Java default. Native projects in
`mobile/android` and `mobile/ios` are generated locally and remain ignored by Git.
Expo's development client and system UI integration are included.

First start Next and Fastify in a terminal:

```sh
pnpm dev
```

In a second terminal, choose a target:

```sh
pnpm mobile:android       # Starts the configured emulator if needed; builds/installs Android
pnpm mobile:ios           # Builds/installs in iOS Simulator
pnpm mobile:iphone        # Uses the Mac's Wi-Fi address; lets you select your connected iPhone
pnpm mobile:doctor        # Lists tool versions, devices, and Expo dependency compatibility
```

Android commands restore USB/emulator port forwarding for both web (`3000`) and
Metro (`8081`). `pnpm mobile:emulator` starts the configured `CampusFix_API_37`
virtual device without building the app. `pnpm mobile:forward` restores forwarding
for attached Android devices. Set `ANDROID_AVD` to use another virtual device.

After the native app is installed, restart only Metro for ordinary JS changes:

```sh
pnpm dev:mobile           # WebView uses localhost:3000, suitable for simulators/adb reverse
pnpm dev:phone            # WebView uses this Mac's Wi-Fi address; Metro uses LAN
```

These commands set `APP_VARIANT=development` and select the WebView URL for that
session, so switching devices does not require rewriting `.env`. To override
network detection explicitly:

```sh
MOBILE_HOST=192.168.1.50 pnpm mobile:iphone
EXPO_PUBLIC_WEB_URL=http://192.168.1.50:3000 pnpm dev:phone
```

For a physical iPhone, complete these device/account steps:

1. In Xcode Settings → Apple Accounts, sign in with your Apple Account. App Store
   sign-in and Xcode signing-account setup are separate. A free Personal Team can
   be used for local testing; its provisioning restrictions still apply.
2. Connect the unlocked phone by USB and choose **Trust This Computer**. Enable
   **Developer Mode** in iPhone Settings → Privacy & Security, including the restart
   if requested. Open Xcode's Devices and Simulators window to confirm it is paired.
3. In the generated `mobile/ios/CampusFix.xcworkspace`, select the CampusFix app
   target → Signing & Capabilities → choose your Team and automatic signing. If the
   default bundle identifier is unavailable, change `ios.bundleIdentifier` in
   `mobile/app.config.ts` to your unique identifier and regenerate the native app.
4. Keep Mac and phone on a mutually reachable network. Open
   `http://YOUR_MAC_WIFI_ADDRESS:3000/en` in iPhone Safari first. Allow the native
   app's local-network permission when prompted, then run `pnpm mobile:iphone`.
5. You can enable wireless connection for the paired device in Xcode afterward.
   The Mac must still serve both Next and Metro. Rebuild after native dependency
   or native configuration changes; ordinary web changes only need Next running.

Campus Wi-Fi may isolate clients even when both devices use the same network.
If Safari cannot reach the Mac, connect the Mac to the iPhone's Personal Hotspot
or use another network that allows device-to-device traffic, then rerun the phone
command so it detects the new address. No tunnel or cloud service is required.

The Mac has 16 GB RAM: run one emulator/simulator at a time if memory pressure is
high. The Android virtual device uses 2 GB RAM and the ARM64 Google APIs image.
Keep native tools on stable versions and use a simulator runtime supported by the
installed Xcode version. Additional runtime/device profiles can be added later.

## Mobile development and networking

Start web/API, then `pnpm dev:mobile` (simulators) or `pnpm dev:phone` (physical phones). Expo starts Metro; it does not serve the
Next app. Use the Expo CLI's device options with an SDK-compatible Expo Go app or
build a development app locally:

```sh
pnpm mobile:android
pnpm mobile:ios
```

Open/create an Android Virtual Device in Android Studio first. With the emulator
or a USB-debugging-authorized Android phone connected:

```sh
adb devices
adb reverse tcp:3000 tcp:3000
# For a USB-only Metro connection, also forward Metro:
adb reverse tcp:8081 tcp:8081
```

Use `EXPO_PUBLIC_WEB_URL=http://localhost:3000`. The port-forward must be restored
after reconnecting/restarting the device. For multiple devices, use `adb -s SERIAL`.
The emulator alternative is `http://10.0.2.2:3000`. That alias and ordinary LAN HTTP
addresses may not qualify as secure contexts for browser capabilities; loopback
forwarding is preferable. Future camera APIs may need HTTPS and permissions.

For iOS Simulator, install/open a simulator from Xcode, then run the `ios` command
above. `http://localhost:3000` normally reaches the Mac's loopback server.

For a physical iPhone, set `EXPO_PUBLIC_WEB_URL=http://YOUR_LAN_IP:3000` in
`mobile/.env`; localhost on a phone refers to that phone. LAN Android works the
same way. Both devices must be on a reachable network; check the firewall and
Wi-Fi client isolation. Expo/Metro also needs an accessible LAN address or USB
forwarding. Restart Expo after environment changes.

Development commands explicitly set `APP_VARIANT=development`, enabling the local
HTTP transport exceptions. These exceptions are included in generated native
binaries; changing JS alone does not change their transport policy. Expo Go uses
its own native transport settings. Release configuration defaults to refusing
HTTP and requires an explicitly configured HTTPS URL, for example:

```sh
APP_VARIANT=production EXPO_PUBLIC_WEB_URL=https://YOUR_ENDPOINT pnpm --filter @campus-fix/mobile exec expo config
```

Do not distribute native binaries generated with the development configuration.
Use a clean production prebuild when switching native build configuration. No
production deployment or public endpoint is required for local development.

After dependencies, browser binaries, native builds, and SDKs are prepared, the
servers and native host can be used without internet on a local connection
(`pnpm dev:mobile --offline` avoids Expo's online checks). A physical device still
needs USB forwarding or network reachability to the computer. No offline app
cache, service worker, or embedded frontend bundle is implemented.

## Web infrastructure

English (`/en`) and Spanish (`/es`) use one `next-intl` routing definition.
The locale cookie and browser language negotiate `/`; unsupported language
preferences fall back to English. The switcher preserves pathname, query, and
hash. Add generic translations in `web/src/messages`. `proxy.ts` excludes
`/backend`, `/api`, Next assets, and file paths.

Use `NavigationLink` from `web/src/components/navigation-link.tsx` for future
client links and `useRouter` from `web/src/hooks/use-router.ts` for programmatic
push/replace. Both use next-intl's helpers and centralized NProgress. Link progress
uses Next's eligible navigation event, excluding external/modified clicks.
Same-route and hash-only changes do not start it; pathname/search completion
finishes it, with a timeout for aborted navigation. Raw locale helpers remain in
`i18n/navigation.ts` for server redirects and pathname generation.

The server layout owns fonts, locale, and document markup. Client providers supply
Query, reduced-motion-aware Motion, Sonner, and bridge initialization. The neutral
palette follows system light/dark preferences and supports `.dark`/`.light`
overrides; no theme provider or persistent theme state is needed yet. Nunito is
loaded with `next/font/local` using a variable font, swap behavior, and preload.

The single Axios client uses `/backend` with a timeout and `ApiError`
normalization. Query retries one transient query failure and avoids retrying 4xx
responses; mutations do not retry. Feature code handles query errors through
standard Query states/error boundaries. Generic form components work with React
Hook Form; use `zodResolver` from `@hookform/resolvers/zod` for future schemas and
infer values with Zod. No feature query, form schema, or auth interceptor exists.

Next rewrites `/backend/:path*` to `http://127.0.0.1:4000/api/:path*` on its server.
This same-origin entry point also works from the WebView. No CORS workaround or
duplicate Next API route is needed.

## Native bridge v1

Matching schemas live in `web/src/lib/platform/protocol.ts` and
`mobile/src/bridge.ts`. Keep them synchronized; no shared package is needed.

1. Web attaches a `campus-fix:bridge` event listener, then sends
   `{"version":1,"type":"web.ready"}` through
   `window.ReactNativeWebView.postMessage`.
2. Native validates `onMessage` data and its source origin, then uses
   `injectJavaScript` to dispatch that custom event. Its `detail` is a JSON string:
   `{"version":1,"type":"native.platform","payload":{"platform":"ios"}}`
   (`android` is the other valid native value).
3. Web validates the response and exposes `usePlatform()` with `platform`,
   `isWeb`, `isNative`, and `bridgeState` (`disconnected`, `connecting`, `connected`).

Web retries readiness until acknowledged; native also sends after load completion.
The listener is installed before announcing readiness, handling either ordering.
Both sides ignore malformed, oversized, unknown-version, and unknown-type messages.
Browser/server rendering initially uses the same web/disconnected snapshot for
hydration. There is no user-agent inference. Native restricts embedded navigation
to the configured origin; external HTTP(S) links open through the OS. This bridge
identifies the host; it is not an authentication/security boundary. Add specific,
validated versioned messages when real native capabilities are needed.

## Scripts and quality checks

```sh
pnpm build              # API + production Next build
pnpm lint               # All workspaces
pnpm lint:fix
pnpm typecheck
pnpm format
pnpm format:check
pnpm test               # Infrastructure unit tests
pnpm check              # Format, lint, types, unit tests
pnpm --filter @campus-fix/web exec playwright install chromium
pnpm build
pnpm test:e2e           # Starts isolated production web :3200 and API :4000
pnpm --filter @campus-fix/mobile run config
```

Stop your development API before E2E checks; the test runner refuses to reuse an
unrelated process on port 4000. Builds/checks do not require a running database.
Native device behavior requires a simulator/device and a native SDK build. Expo
config, dependency checks, typechecking, and Metro bundle export can run without
one. Root `build` builds the Node applications; it does not build native binaries.
Git hooks were inspected but not copied: VINDEX's commit naming/architecture rules
are specific to that project. Run `pnpm check` before sharing changes.

## Reused foundations

VINDEX was inspected read-only. Selected copies/adaptations:

- `.prettierrc`, `.editorconfig`, PostCSS configuration, strict Next tsconfig,
  generic Next ESLint presets, Vitest aliasing, and Playwright desktop/mobile setup.
- Generic button, input, textarea, label, card, badge, checkbox, tabs, tooltip,
  separator, dropdown menu, sheet, and form primitives; imports point locally.
  Generic UI types and the `cn()` helper replace VINDEX's shared-module paths.
  Form contexts now validate their provider presence without empty-object casts.
- Tailwind semantic-token structure and light/dark conventions, replaced with a
  neutral palette and smaller radius; VINDEX landing styles and branding omitted.
- Nunito variable typography and `next/font` performance conventions. The reference
  uses Google's loader and has no reusable source font files, so the font and OFL
  license are vendored from the Google Fonts Nunito repository for local builds.
- next-intl routing/navigation pattern with new English/Spanish messages; Query
  defaults detached from sessions and persistence; Motion's reduced-motion principle.
- NProgress integration rebuilt to start before eligible navigation and finish
  after route completion; the reference only started/finished after pathname changes.

No VINDEX domain code, assets, secrets, hooks, Git history, or navigation were copied.

## Troubleshooting

- **API proxy returns 502:** run Fastify on port 4000 and check `/api/health` directly.
- **Phone cannot connect:** check the configured URL, Next's network binding,
  `adb reverse`, firewall, and LAN reachability; Fastify need not be exposed.
- **HTTP blocked on device:** rebuild a development native binary with the supplied
  scripts. Release configurations intentionally reject HTTP.
- **Expo version mismatch:** use an SDK 58 compatible client/development build;
  run `APP_VARIANT=development pnpm --filter @campus-fix/mobile exec expo install --check`.
- **Missing Prisma generated import:** run `pnpm db:generate` after installation.
- **Database refused connection:** check the PostgreSQL service, role, database,
  port, and URL. Health being OK does not prove database connectivity.
- **E2E browser missing:** run the Playwright install command above once online.
- **Address in use:** stop only your own server or choose a separate manual port;
  avoid killing unrelated local jobs.
