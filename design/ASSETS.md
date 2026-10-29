# Design reference and images

The supplied reference is stored unchanged as `design/reference.png`. It guides
the pale grey background, blue actions, white rounded cards, compact typography,
grouped settings, three community mobile tabs and four staff tabs and centered activity profile. E-commerce labels
and device system chrome were replaced with maintenance content.

`backend/seed-assets/fountain.png` and `computer.png` were generated for this
project with the imagegen skill; they are fictional illustrations, not photographs
of Penn State facilities. No real people or institutional logos were requested.
They are checked-in seed assets; normal application uploads remain local/private
until attached to a public report.

Generation mode: fresh image generation, opaque background, no reference images.
Generation briefs:

- Fountain: realistic maintenance-report photograph of a leaking stainless-steel
  drinking fountain in a fictional neutral campus corridor, a small puddle on the
  floor, natural daylight, no people, logos or text.
- Computer: realistic maintenance-report photograph of a fictional campus computer
  lab with one monitor showing an error screen, daylight, no people or logos.

The seeder uses Sharp to create local WebP files. The UI uses Lucide SVG icons and
the existing locally bundled Nunito font; its OFL license is retained.

## Visual checks performed

Earlier component-layout previews were supplemented by actual Next.js/Fastify/PostgreSQL runs during this implementation. Playwright captures Account, Reports, Create and Spanish Settings at 375 x 812, 390 x 844, 430 x 932, 768 x 1024 and 1440 x 900, plus real staff requests, workbench and resolved detail screens. The current 46 screenshots are in the ignored codex/screenshots directory.

Rendered Account, Reports, Create, dark Spanish Settings, staff workbench and resolved detail were inspected against codex/assets/reference.png. The layout uses compact rounded surfaces, blue actions, clear spacing and responsive desktop navigation. Horizontal overflow checks pass at all five widths. These are real application screenshots; they do not prove native WebView behavior or pixel-perfect equivalence. See codex/ACCEPTANCE.md for the executed API, browser and native verification boundaries.

## Subsequent design refinement

The new user-supplied visual reference is preserved at `codex/assets/refinement-reference.png`; its companion brief is `codex/REFINEMENT_BRIEF.md`. The new theme takes its exact light/dark RGB values from that brief.

- Shield-only asset: `web/public/brand/penn-state-shield.svg`, retrieved from [Penn State Bellisario](https://bellisario.psu.edu/assets/uploads/globals/ps-shield-only.svg). This is the actual institutional mark, with no wordmark, traced substitute or mirroring. It remains a Penn State trademark; inclusion in this local demonstration does not imply affiliation or grant general redistribution rights.
- Nunito: existing locally bundled font, loaded through Next.js local font tooling; existing OFL retained.
- Arabic fallback: [Noto Sans Arabic from Google Fonts](https://github.com/google/fonts/tree/main/ofl/notosansarabic), bundled locally with its SIL Open Font License in `web/src/styles/fonts/NotoSansArabic-OFL.txt`. Segoe UI/Arial provide additional platform fallbacks, including Cyrillic.
- Select and Dialog: official [shadcn Select](https://ui.shadcn.com/docs/components/radix/select) and [Dialog](https://ui.shadcn.com/docs/components/radix/dialog) registry source, adapted to the existing Radix package, logical spacing, localized close labels and project tokens. Registry snapshots are retained in `codex/shadcn-*-source.json`. Their code is MIT licensed under the shadcn/ui project.

The existing generated fictional report images are reused for test fixtures. No new image generation was used for this refinement. Screenshots and verification boundaries are documented in `codex/REFINEMENT_ACCEPTANCE.md`.

## Update 06 charts

The staff dashboard uses Recharts 3.8.0 and the official shadcn/ui New York v4 chart component. Source: https://ui.shadcn.com/r/styles/new-york-v4/chart.json; documentation: https://ui.shadcn.com/docs/components/chart. The registry response is retained in `codex/shadcn-chart-source.json`; `web/src/components/ui/chart.tsx` uses the existing `cn` helper import. The retained shadcn MIT license applies. Existing palette tokens, Nunito, Lucide icons, rounded surfaces and four-icon navigation remain in use.

Update 06 browser screenshots are in ignored `codex/screenshots/update06`. They cover notifications and analytics at 375 × 812, 390 × 844, 430 × 932 and 1440 × 900, with English light and Arabic dark themes, plus all five dashboard translations. See the Update 06 acceptance report for the reviewed files and test boundaries.

## Update 07 appearance and chart legends

No new illustrations or third-party artwork were added. The original semantic palette, fonts, shield, navigation and card treatments remain. Web, browser viewport metadata and the native host share the resolved semantic appearance. Intentional contrast surfaces remain: the staff login brand panel, photo content and translucent dialog scrim.

Charts retain the official shadcn `ChartContainer`, `ChartLegend`, `ChartLegendContent`, `ChartTooltip` and `ChartTooltipContent`. Recharts' supported Legend `portal` places the legend after the plot in normal document flow. Category names are absent from plotting areas; numeric axes, short dates, tooltips and accessible data tables remain. Legend labels wrap and show localized counts; the two trend series show period totals. Hotspot dots match the corresponding location colors.

The six-entry ranking palette uses the existing `--chart-1` through `--chart-5` and one documented extension: `--chart-6: color-mix(in oklch, var(--chart-4) 40%, var(--destructive))`, a warm coral derived from existing colors. IDs are sorted within the displayed cohort, so changing locale or rank order does not reassign colors. Location rankings and hotspots use one shared mapping. A different filter can change the cohort and therefore the mapping; colors are not permanent identifiers. The API currently caps ranking groups at six. If that limit expands, extend/group the palette before displaying more than six categories; do not silently rely on repeating colors.

Official native references used for installed SDK 58 APIs: [Expo StatusBar](https://docs.expo.dev/versions/latest/sdk/status-bar/), [NavigationBar](https://docs.expo.dev/versions/latest/sdk/navigation-bar/), [SystemUI](https://docs.expo.dev/versions/latest/sdk/system-ui/) and [SplashScreen](https://docs.expo.dev/versions/latest/sdk/splash-screen/). Native icon behavior was also checked against installed module types and source. Browser captures are under ignored `codex/screenshots/update07/`; they do not establish native system-bar correctness.
