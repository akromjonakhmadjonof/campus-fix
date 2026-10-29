# Update 07 acceptance report

Implemented the supplied [appearance and chart brief](UPDATE_07_BRIEF.md) incrementally in the existing CampusFix application. Inspected the web preferences, native wrapper, bridge, shared surfaces, chart components and project dependencies before changing them. No Vindex code was accessed or used.

## Root causes and corrections

1. The native wrapper used a fixed light background, default WebView surfaces and hardcoded loading/error colors. It had no effective web appearance message or coordinated system icon styling. It now receives a strict, versioned `web.appearance` message containing resolved Light/Dark mode and six semantic colors. Root, safe-area view, WebView, loading/error screens and system icon styles use that appearance. The last message remains in memory during WebView retries; no independent native preference store was added.
2. Only the body consistently painted the page background. The HTML viewport and browser theme metadata could disagree. HTML, body and both application shells now use the semantic background. A self-contained head bootstrap reads the existing preference before hydration. Blocked/invalid storage falls back to OS appearance. Hydrated effects read persisted preferences directly rather than publishing the SSR System fallback over a saved Dark choice.
3. Production CSS optimization can serialize RGB tokens as hex. Browser testing caught the strict native RGB contract rejecting those raw token strings. The web layer now resolves tokens through a computed CSS color property before validation. All colors still originate in the existing semantic palette.
4. Mutating a React-owned theme-color meta tag could cause React's metadata hoister to insert a second stale tag. The appearance bootstrap now owns that single mutable tag. Theme changes and navigation update it without reloading.
5. Safe-area behavior was spread across browser environment values and native-specific spacing overrides. Four shared CSS inset variables now retain browser environment values and become zero inside the native wrapper. Native SafeAreaView owns all four edges; WebView automatic inset adjustment is disabled. Responsive page, floating navigation, staff login and scroll padding use this single inset policy.
6. Ranking charts placed category names on the plotting axis. Rankings now show colors and numeric axes, with official shadcn/Recharts legends in normal flow below each plot. Names, localized counts, detailed tooltips and accessible data tables remain. Trend legends show both series and period totals. Location ranking and hotspot dots share one mapping. The six-color extension and cohort stability limits are documented in [design/ASSETS.md](../design/ASSETS.md).

The original warm off-white/deep charcoal palette, Nunito, Arabic font, shield, four-icon navigation, card differentiation and meaningful contrast surfaces remain. Dialogs/selects use the existing popover token. Staff login retains its intentional brand panel and subtle grid. No photo replacement, navigation redesign or new theme library was introduced.

## Changed implementation areas

- `web/src/lib/appearance.ts`, `providers/preferences.tsx`, locale layout and platform runtime: early theme initialization, persistence, OS changes, viewport metadata and bridge synchronization.
- Web/native protocol files, `mobile/src/appearance.ts`, `mobile/App.tsx` and `mobile/app.config.ts`: validated appearance payloads, native surfaces, safe areas, status/navigation icons and OS-specific splash colors.
- `web/src/styles/globals.css` and `campus.css`: semantic root backgrounds, shared insets, external legend layout and the sixth chart color.
- `web/src/components/campus/analytics.tsx` and `lib/chart-colors.ts`: external premade legends and shared category mapping; no analytics calculation changes.
- Appearance unit/browser tests, optional WebKit project, README, asset notes and this report. Lockfile/package changes add SDK 58-compatible Expo status-bar, navigation-bar and splash-screen modules. The existing dependency-release-age policy receives only an exact-version exception for `expo-splash-screen@58.0.12`.

## Verification

- Root lint and all four workspace TypeScript checks passed.
- All **37 web unit tests** passed, including semantic web/native palette parity, strict message validation, pre-hydration Light/Dark/System initialization, storage failure fallback and six distinct category colors.
- API and production Next.js builds passed; the final web rebuild generated all 72 localized static pages and dynamic route handlers.
- Expo production JavaScript/Hermes exports passed for both Android (735 modules) and iOS (736 modules). These are bundle exports, not native APK/IPA builds or device execution.
- **13 Chromium browser scenarios passed** across the regression run and focused reruns: early saved-theme initialization, native handshake replay, effective-mode messages, live OS changes, no-reload theme switching/navigation, all five localized legends, pairing, Spanish settings/validation, and the complete creation/upload/ownership/duplicate/staff journey. One redundant mobile matrix case is intentionally skipped because the desktop matrix explicitly exercises all four sizes.
- **3 WebKit browser scenarios passed**: early persisted-theme/native handshake behavior, live theme changes and client navigation, and all five localized chart legends/tooltips. The startup assertion explicitly waits for the appearance bridge rather than treating visible SSR markup as hydration readiness. Chromium browser-channel settings are scoped to Chromium projects so they do not leak into WebKit.
- Root formatting and `git diff --check` passed. Final web lint/type checks passed after the test/config refinements. Windows native compiler-cache access required running those compiler commands under the signed-in user's approved execution context.

## Visual verification

Captured **60 real browser screenshots** under ignored `codex/screenshots/update07/`: seven pages (Account, Reports, Create Report, Report Details, Settings, Staff Login and Dashboard), both Light/Dark themes, and 375 × 812, 390 × 844, 430 × 932 and 1440 × 900, plus Arabic Settings, Dashboard, profile dialog and appearance select. Captures use real test-database records and metrics; the new anonymous Account has a genuine empty recent-report state.

Reviewed representative Account, Reports, Create, Details, Settings, Login and Dashboard images, including both login themes, both settings themes, both create themes, English desktop dark analytics and Arabic mobile dark analytics/dialogs. Verified continuous page backgrounds, subtly distinct cards, floating navigation surroundings, readable controls, external legends and RTL alignment. Automated assertions check root/body colors, one correct theme-color tag, horizontal overflow, distinct category fills, exact names/counts, legend position below the plot and absence of runtime page errors. Select/dialog captures use the viewport rather than resizing the page around an open overlay.

The screenshot matrix verifies web surfaces only. Native system-bar acceptance remains explicitly pending below.

## Preservation

No API logic, database schema, migrations, authentication, report workflow or seed data was changed. Tests use the isolated `campus_fix_test` database. The demo database was not reset or reseeded. `seed.json` SHA-256 remains `AF05D0A9E559C6D9E95D1D8C9CC9FADD0D75C9E8EFF55EF2084A431586820F51`.

The local demo was restarted with its normal configuration after verification. API health returned `ok`, its report endpoint returned the existing **25 demo reports**, and Reports, Settings and the Dashboard page route returned HTTP 200 at `http://localhost:3000`. The Dashboard still requires the existing staff session for data access.

## Native verification boundary

No Android SDK/emulator/ADB or attached native test target was available on this Windows host; an iOS Simulator requires macOS. Therefore iOS status-bar/home-indicator behavior and Android gesture/three-button navigation appearance are **implemented but not visually verified on native hardware or emulators**. Browser safe-area and bridge simulations do not prove those native acceptance criteria. WebKit emulation also does not prove Safari's browser-owned chrome.

Rebuild the native development client or release app to apply the added native modules/plugins; a JavaScript refresh is insufficient. SDK 58 supported StatusBar/NavigationBar components control icon styles while the native root supplies edge-to-edge backgrounds. Contrast enforcement is disabled through the supported navigation-bar config plugin. No deprecated Android bar-background setters or fake/hidden system indicators are used.

Before the first web appearance response, startup/splash surfaces follow the OS with matching palette defaults. A cold launch cannot know a conflicting saved web preference until the WebView reads it. Once loaded, the web preference is authoritative, live System changes synchronize, and the last received appearance remains during retry/loading. This avoids claiming an impossible pre-WebView preference guarantee without adding another preference store.

Remaining device acceptance: run a rebuilt app on iOS and Android in both themes; switch Light/Dark/System while foregrounded and after resume; inspect status/home/gesture/three-button regions, landscape insets, keyboard, cold startup, loading and connection retry. Native acceptance remains pending that device pass.
