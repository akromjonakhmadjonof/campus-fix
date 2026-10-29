# CampusFix — Seamless Theme, Background & Native Safe-Area Refinement

You are working on the existing CampusFix application.

This is a focused, incremental visual correction. Do not rebuild or redesign the application, and do not introduce unrelated features.

The current interface has inconsistent background surfaces, particularly when running inside the Expo React Native WebView.

Your task is to make **the entire application look and feel like one seamless, cohesive interface in both light and dark themes**.

## 1. Problem to solve

Currently, the interface has visible background discontinuities:

- Dark mode displays bright white regions around the native content.
- The iOS status-bar area can remain white while the application is dark.
- The bottom safe-area region can remain white.
- Light mode sometimes displays pure-white sections against the intended warm off-white application background.
- Certain containers, navigation areas, and page backgrounds appear visually disconnected.
- Theme changes do not always appear synchronized across the web application and native wrapper.

The result looks like separate layers assembled together rather than one premium application.

Fix these inconsistencies at their actual sources.

Do not simply cover them with additional fixed-position elements.

## 2. Preserve the existing design system

Use the current CampusFix semantic theme tokens as the source of truth.

The relevant foundation colors are:

**Light mode**

```css
--background: rgb(251, 250, 247);
--foreground: rgb(9, 10, 13);
--card: rgb(246, 246, 243);
--popover: rgb(252, 252, 249);
--border: rgb(213, 216, 219);
```

**Dark mode**

```css
--background: rgb(11, 13, 18);
--foreground: rgb(236, 235, 232);
--card: rgb(19, 22, 28);
--popover: rgb(17, 20, 25);
--border: rgb(44, 49, 56);
```

Do not replace these colors with another palette.

Preserve Nunito, the established typography, shadows, border radii, icons, and layout composition.

## 3. Unified application background

Audit the complete layout hierarchy.

Inspect:

- Root HTML element
- Body
- Next.js application root
- Locale layout
- Application shell
- Main content container
- Page wrappers
- Bottom navigation
- Fixed-position elements
- Dialogs and sheets
- Loading and error screens
- React Native root container
- WebView itself

All relevant application backgrounds must derive from the correct theme.

Use `bg-background`, `bg-card`, and other semantic tokens consistently.

Remove unnecessary hardcoded colors such as:

- `bg-white`
- `bg-black`
- `#ffffff`
- `#000000`
- Hardcoded legacy background colors

Only retain explicitly different surfaces where they serve a meaningful design purpose.

Do not flatten every component into a single background color.

Cards must remain subtly distinguishable, but should belong to the same visual system.

## 4. Seamless surface design

The interface should feel visually continuous.

### Light mode

The main application background is warm off-white.

Cards use the existing slightly differentiated card surface.

Avoid large pure-white rectangular regions that interrupt the background.

Use subtle borders and shadows only where necessary.

### Dark mode

The background should feel like a continuous deep charcoal surface.

Cards should be slightly lighter.

Avoid pure-black blocks mixed with dark gray containers unless explicitly intended.

Remove unnecessary outlines, borders, and layered card backgrounds.

### General rule

Use visual hierarchy through:

1. Typography
2. Spacing
3. Subtle surface differences
4. Minimal borders
5. Restrained shadows

Avoid excessive nested cards.

Avoid stacking multiple rounded surfaces merely to create separation.

The goal is sophisticated, understated design similar to a premium native Apple application.

## 5. Fix Expo React Native WebView backgrounds

This is critical.

The mobile application is a thin native wrapper around the Next.js web application.

The theme must apply across the native container and the WebView.

Inspect the existing Expo implementation.

Ensure the following use the correct active theme:

- Root React Native View
- SafeAreaView or equivalent layout
- WebView background
- Native loading screen
- Native error screen
- Areas behind the system status bar
- Areas behind the bottom system navigation region

Use the WebView's supported background configuration where appropriate.

Do not leave default white React Native surfaces behind the WebView.

Do not hardcode dark colors that would break light mode.

## 6. iOS status bar and bottom safe area

Fix the bright white areas visible above and below the dark application.

In dark mode:

- The region behind the iOS status bar must match the intended dark background.
- System status-bar icons must remain readable.
- The bottom home-indicator region must blend with the application.
- No white stripe should appear beneath the bottom navigation.

In light mode:

- Use the correct warm off-white background.
- Do not default to pure white.
- Maintain readable system icons.

Do not hide the system status bar or home indicator simply to conceal the problem.

Do not draw fake system indicators.

Do not cause content to overlap the Dynamic Island or home indicator.

Follow the installed Expo SDK's supported safe-area and status-bar APIs.

Avoid applying both native and CSS safe-area padding in a way that doubles the inset.

## 7. Android system navigation

Apply the same visual consistency on Android.

Account for modern Android edge-to-edge behavior.

Use the installed Expo SDK's supported system-bar APIs.

Ensure:

- Status-bar content is readable.
- Gesture navigation remains usable.
- Backgrounds behind system bars match the theme.
- No unwanted bright bands appear.
- App content does not overlap system controls.

Do not rely on deprecated background-color setters where the installed Android/Expo versions no longer support them.

Prefer the correct edge-to-edge and inset handling for the actual SDK version.

## 8. Synchronize the theme between web and native

The Next.js web application currently controls its light/dark theme.

The React Native host must be aware of the selected appearance.

Reuse the existing WebView communication bridge.

Extend it minimally with a typed theme message, for example:

```ts
type AppearanceMode = "light" | "dark";
```

The web application should notify React Native when the effective theme changes.

The native wrapper should update:

- Native root background
- WebView surrounding background
- Status-bar appearance
- Relevant system navigation appearance
- Native loading and error states

Use the resolved effective theme rather than sending `"system"` as if it were a color mode.

When the user selects System, update correctly when the operating-system appearance changes.

Ensure the bridge handshake communicates the current theme after initialization.

Avoid race conditions between WebView readiness and theme messages.

Do not create a second independent theme preference system inside React Native.

The web application's theme preference remains authoritative once loaded.

## 9. Prevent white flashes during theme initialization

Theme initialization should be smooth.

Avoid:

- White flashes on dark-theme startup
- White flashes during WebView loading
- Brief incorrect backgrounds before hydration
- Theme flicker during navigation
- Temporary mismatched native and web backgrounds

Inspect the existing theme initialization and persistence logic.

Use the existing preference storage and hydration-safe approach.

Where needed, use a neutral or system-matched native background before the WebView reports its resolved theme.

Apply the appropriate theme as early as the existing architecture permits.

Do not introduce unnecessary loading screens or delays.

## 10. Bottom navigation consistency

Audit the existing four-icon bottom navigation.

Preserve its current destinations and behavior.

Ensure:

- The navigation surface blends naturally with the page.
- No unrelated background block is visible behind it.
- Its surrounding safe-area region uses the correct theme.
- Borders are subtle and intentional.
- Active-state styling uses existing tokens.
- Light and dark modes remain equally polished.

Do not redesign the icons or navigation structure.

Do not remove the floating/rounded treatment if it is already part of the established design, but make its surrounding background seamless.

## 11. Cards and grouped settings

The Settings page currently makes some of these inconsistencies particularly visible.

Audit:

- Account/profile card
- Preferences group
- Connected-device section
- About section
- Dialogs
- Select dropdowns
- Popovers
- Switches

All surfaces must match the selected theme.

Remove unexplained white backgrounds or mismatched rounded containers.

Ensure that borders, separators, and typography remain readable in dark mode.

A group of settings rows should feel like one cohesive component, not numerous disconnected surfaces.

Apply the same treatment to report cards, Account sections, staff pages, and analytics components where the shared issue occurs.

## 12. Smooth theme changes

Switching between Light, Dark, and System must update the interface coherently.

Avoid:

- Full-document reloads
- Unnecessary component remounting
- Flashing backgrounds
- Out-of-sync native containers
- Delayed system-bar appearance changes

If using transitions, keep them minimal and respect reduced-motion preferences.

Do not animate every component independently.

The whole interface should feel unified.

## 13. Browser support

This issue must also be fixed outside the Expo app.

Ensure consistent backgrounds when CampusFix runs in:

- Desktop Chrome
- Mobile Chrome
- Mobile Safari
- Installed Expo WebView

Audit browser viewport backgrounds and theme-color metadata where applicable.

Ensure overscroll regions and content outside the main application shell do not reveal inconsistent white or black backgrounds.

Do not attempt to control browser-owned UI that is not supported by the platform.

## 14. Verification

Perform actual visual testing.

At minimum, verify:

**Mobile light mode**
- Warm off-white application background.
- No unexplained pure-white stripes.
- Harmonious card surfaces.
- Seamless bottom navigation.

**Mobile dark mode**
- No bright white native regions.
- Correct status-bar appearance.
- Correct bottom safe-area appearance.
- Cohesive dark surfaces.

**Theme switching**
- Light → Dark
- Dark → Light
- System → Light
- System → Dark

**Important pages**
- Account
- Reports
- Create Report
- Report Details
- Settings
- Staff Login
- Staff Dashboard

Use Playwright screenshots for the web application.

Test the Expo wrapper on an iOS Simulator and Android Emulator when available.

Browser screenshots alone are insufficient to verify native system-bar behavior.

If native testing is unavailable, report that limitation honestly.

Run TypeScript checks, linting, relevant tests, and production builds.

## 15. Acceptance criteria

This task is complete when:

1. The web and native application have synchronized visual themes.
2. The iOS status-bar region no longer shows an incorrect white background in dark mode.
3. The bottom home-indicator region blends with the active theme.
4. Android system navigation respects the active theme.
5. Light-mode background regions use the warm off-white palette consistently.
6. Cards retain subtle visual separation without appearing disconnected.
7. No unexplained pure-white or pure-black rectangles remain.
8. The bottom navigation integrates seamlessly with the application surface.
9. Theme changes do not trigger hard reloads.
10. Theme initialization does not produce obvious white flashes.
11. Existing UI styling and functionality are preserved.
12. Both student and staff interfaces remain visually consistent.

## 16. Scope restrictions

Do not:

- Rebuild CampusFix.
- Change the established color palette.
- Redesign unrelated components.
- Change the navigation destinations.
- Modify report workflows.
- Modify authentication.
- Modify database schemas.
- Introduce another theme library unnecessarily.
- Add unrelated UI features.
- Replace the existing mobile WebView architecture.

Fix the theme integration at its root, not through scattered CSS hacks.

## 17. Execution

1. Inspect the current web and mobile theme implementations.
2. Identify the source of each visual mismatch.
3. Correct root-level background and surface behavior.
4. Fix React Native/WebView theme coordination.
5. Fix iOS safe-area and status-bar integration.
6. Fix Android system-bar behavior.
7. Correct shared components with inconsistent surface colors.
8. Verify light/dark/system theme switching.
9. Capture screenshots.
10. Run checks and fix regressions.

Do not stop after analysis.

Implement the corrections directly in the existing codebase.

At completion, explain the root cause of the inconsistent surfaces, what files were changed, what was visually verified, and any remaining native-platform limitations.

**The end result should feel like one continuous, premium application—not a dark web page placed inside a white phone container.**


## Additional Requirement — Premium Chart Labels and Legends

Refine all existing analytics charts to use a clean, minimalist, color-coded legend system.

### 1. No inline category labels

Do not render category names, series names, or long text labels directly inside chart plotting areas.

Instead:

- Use colors to represent data categories or series.
- Place a separate legend outside the chart.
- Show a colored indicator beside each category name.
- Keep chart plotting areas visually clean.
- Preserve numeric axis values and short date labels where necessary for understanding.

### 2. Color-coded legend

Every chart with multiple categories or series should have a corresponding legend.

Example:

```text
[Blue]    Electrical       32
[Green]   Plumbing         24
[Amber]   Furniture        18
[Purple]  IT & Technology  12
```

Use actual colored swatches or dots, not literal bracketed color names.

Each legend item should contain:

- Color indicator
- Localized category label
- Value or percentage when relevant

Use a compact, well-spaced layout.

On mobile, position the legend underneath the chart.

On desktop, position it underneath or beside the chart, depending on available space.

### 3. Consistent color assignments

Use the existing CampusFix chart theme tokens:

- `--chart-1`
- `--chart-2`
- `--chart-3`
- `--chart-4`
- `--chart-5`

Maintain consistent mappings for the same categories across charts whenever practical.

Support more than five categories through a documented extended palette or grouping strategy without producing indistinguishable colors.

Ensure chart colors work in both light and dark modes.

### 4. Use premade chart components

Continue using official shadcn/ui chart components built on Recharts.

Prefer:

- `ChartContainer`
- `ChartLegend`
- `ChartLegendContent`
- `ChartTooltip`
- `ChartTooltipContent`

Use existing supported legend and tooltip configuration.

Do not manually recreate chart plotting, axes, or legend systems when the installed components provide suitable functionality.

### 5. Chart interaction

Tooltips may show detailed text when a user hovers, taps, or focuses on chart data.

The default visible chart should remain minimal.

For example, a pie or donut chart should show its colored segments without text overlaid on them. The legend underneath explains each segment.

Line charts should show separate color-coded series with a legend, rather than placing series names along the lines.

### 6. Accessibility and localization

Do not communicate meaning through color alone.

The external legend must contain readable text.

Ensure:

- All five languages are supported.
- Arabic RTL layouts are handled correctly.
- Long category names wrap gracefully.
- Legends do not overflow mobile screens.
- Appropriate accessible descriptions exist.
- Colors remain distinguishable in both themes.

### 7. Visual consistency

Apply this convention across the entire staff analytics dashboard, including:

- Reports vs. Resolutions
- Most Reported Locations
- Most Common Issue Types
- Problem Hotspots
- Any other multi-category analytics charts

Do not change existing analytics calculations or backend data.

This is a presentation refinement only.

**The goal is elegant, uncluttered charts with clearly readable external color-coded legends, consistent with the premium CampusFix design system.**
