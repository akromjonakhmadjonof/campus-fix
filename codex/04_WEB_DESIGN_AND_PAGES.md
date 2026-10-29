# PHASE 04 — NEXT.JS PREMIUM MOBILE-FIRST WEB APPLICATION, ENGLISH + SPANISH

Build a **genuine web application**, not React Native pages. It must run standalone in browsers, while the same UI is displayed by the thin Expo WebView. Design the browser experience mobile-first, adapt desktop thoughtfully. Use actual screenshot `codex/assets/reference.png` for aesthetic fidelity; treat it as a **visual specification**, not a requirement to recreate unrelated e-commerce content.

## 1. Reference inspection + tokens + reuse

Inspect the image. Analyze four tight iPhone-style compositions: clean pale gray background, compact white cards, 12–16px-style rounded grouped cells, muted dividers, blue active/accent, tiny metadata, balanced whitespace, fine icons, bottom translucent navigation, rounded pill buttons, neat type hierarchy. Do not draw fake iOS Dynamic Island, battery, clock or status bar inside the live web page. Target 375/390/430 px widths. Implement semantic tokens and consistent rhythm (e.g. page gutter 16px, card gap 12px, 44px touch targets; adapt to actual screenshot). Use VINDEX's _generic_ font, shadcn, Tailwind v4, theme, focus/accessibility utilities from `../vindex/web` only when not coupled to domain code. Never alter VINDEX. No arbitrary gradients, enormous shadows, visual noise or inconsistent library components.

Required stack follows currently installed web: Next.js App Router + React + TypeScript; next-intl, shadcn/Radix, Tailwind, Lucide, Axios, TanStack Query, RHF + Zod, Sonner, nprogress, Motion. Keep Next Server Components when useful; client components only where necessary. Avoid hydration mismatches from window/platform/theme. Provide skeletons, loading/empty/network error states, retry and toast feedback. Responsive images with explicit sizes and loading strategy; respect reduced motion.

## 2. Navigation and design contracts

**Only three primary tabs on phones** (from owner's latest clarified direction):

- **Account / Cuenta** — default home (`/[locale]`)
- **Reports / Reportes** — social feed (`/[locale]/reports`)
- **Create / Crear** — report creation (`/[locale]/reports/new`)

Keep tab bar bottom fixed/anchored with real mobile safe-area insets and a soft active highlight, icons + short text. Details, Edit, and staff views have natural back navigation; no overlapping tab bar or keyboard. Account includes Settings; do **not** create an always-visible fourth Settings tab or force a separate profile page unrelated to anonymous sessions.

Desktop: premium sidebar or top navigation with same 3 primary areas, persistent content max-width and useful columns; issue detail has photo and status timeline side by side where space allows. Staff routes have separate navigation (`Staff Home`, `Requests`, `Resolved`, `Settings`) and should never bleed into student tabs. The mobile UI remains primary visual reference.

## 3. Account/Home UI — DEFAULT PAGE

Above fold: modest account header, anonymous silhouette/abstract avatar (not a fake student photo), `My Account / Mi cuenta`, an appropriately truncated stable pseudonymous profile label such as `Guest #A1B2`, browser/app platform and installation/session context, account created timestamp if available, and subtle link status `Not linked` or `Linked sessions: 2`. Never display device manufacturer, exact GPS, real name/email, hard-coded system-identifying fingerprint. Current client platform is illustrative, **not proof of physical identity**.

Recent activity: `My Recent Reports / Mis reportes recientes`, **3–5 newest reports owned by current profile**, each row/card with title, location, time, status colored badge, small thumbnail, tap to details. Empty state with concise CTA. `View all my reports / Ver todos mis reportes` navigates to `/{locale}/reports?scope=mine` and shows the selected Mine filter. If user toggles `All`, show public feed. Large enough `Create report` CTA but don't flood home with unrelated analytics.

Settings grouped like iOS reference, either directly on Account below activity or launched via a clear settings action:

- Language: English / Español, locale route switch preserving destination/current report ID/query.
- Appearance: Light, Dark, System; persists across visits per client; ensure theme hydration safe.
- Motion: Auto/Reduce Motion, honors OS preference and user override.
- Link browser and app: show explanation and secure one-time code/request/confirm flow from API; show pending link status, privacy warning and linked sessions if present. No automatic identification of browser and app on same hardware.
- About, version, privacy caveat (anonymous credential stored in this browser/WebView; clearing local data may cause loss of access unless another linked session remains).
  Do not present a functioning Notification toggle unless notifications actually exist. No anonymous user `logout` that destroys report access without a clear consequence warning.

## 4. Reports feed — SOCIAL/TICKET STYLE

Top: `Reports / Reportes`, compact header, search. Use a scrollable issue feed of attractive photo-led cards resembling screenshot's clean products listing **adapted to tickets**, not commerce. Each card: photo or designed fallback, short title, group/type label, campus location breadcrumb condensed, age/time, status, upvote/confirm count, upvote button, maybe small owner marker `You / Tuyo`, and tap to details. No fake comments/replies. Voting state persists and is disabled during pending mutation; cannot vote on own report; display `You reported this / Tú lo reportaste` if owner. Click on vote should not accidentally open detail via event bubbling.

Filters: `All / Todos`, `Mine / Míos`, `Open / Abiertos`, `In Progress / En progreso`, `Resolved / Resueltos` etc; supplementary location group/type/status filter sheet and sort dropdown (`Most recent`, `Most confirmed`, `Oldest`). `scope=mine` is an explicitly visible state. Search and filters drive backend queries with React Query; pagination or infinite scroll stable, no all-record client fake filtering. Pull to refresh optional; actual refresh action with invalidation available. Show clear no reports/no matches and retry errors.

## 5. Create report — VALIDATED AND PREVENT DUPLICATES

At `/{locale}/reports/new` create a polished guided compact form, suitable for real phone. Fields from actual API:

- Title (required, length limits).
- Issue group (`Classroom & Furniture`, `Plumbing`, etc.) and type (`Chair`, `Computer`, `Pipe`, etc.) — fetched from `GET /api/issue-groups`, grouped dropdown/combobox or two-stage grouped controls, labels localized from DB. If type `Other`, require descriptive item name.
- Nested location chooser — fetched from backend `locations`, root buildings/lots/outdoor places **all at the same level**, and children only where they exist. Users can select a leaf OR any parent/root. Breadcrumb visual and ability to go back/change parent. Support searchable names and `Other / Not listed` descriptive alternative without inventing a fake node. No import of source `seed.json` into frontend runtime.
- Precise position (`Where exactly?`) **required**: e.g. second computer by windows, pipe beneath second restroom sink, third chair from door; protects maintenance workers from vague reports.
- Detailed description (required) and examples; no safety-sensitive repair instructions.
- Photo(s) up to backend limit; file picker, `capture` on compatible mobile devices, drag/drop on desktop, progressive upload, in-form thumbnail previews, remove/retry, MIME/size validation. Upload to actual local Fastify endpoint through `/backend`; store `mediaUuid`, never server file path. Do not depend on Expo native camera plugin unless already available. Put photos of objects only, not real people/IDs.

**Live duplicate suggestion card(s)** appear _during_ form completion once location+type+enough text are known, not just after submission. Debounce 350–500ms; abort obsolete requests; indicate checking/none/found. Card shows thumbnail, title, location, vote count, status, similarity reason with honest wording `Possible match / Posible coincidencia`. Actions `View`, `Confirm this issue` (upvote API), `Continue creating` with clear user agency. If high confidence, ask for confirmation before creating anyway, but **never hard-block** because two chairs in same room can both be broken. Re-run check at submit for fresh state. Valid form -> create -> real persisted detail page + toast. Prevent double click submit.

## 6. Report detail — STATUS TIMELINE + PROGRESS

Hero photo gallery/preview, report title/ref, location breadcrumbs + exact position, type/group chips, creator `My report` flag if owner, full description, timestamps, upvote/confirm action if not owner, and **prominent timeline**:

`Reported → Accepted → In Progress → Resolved` milestone progress bar, stage labels and real event timestamps; rejected is separate terminal banner with reason, **not a green completed bar**. Implement progress mapping from actual workflow, not a made-up repair percentage. For judging, `Reported → In Progress → Resolved` is clearly visible even if Accepted adds a milestone. Each status event shows staff note when relevant, role-safe author display, and date. Do not simulate status transitions client-only.

When `isOwner && status===reported`, show Edit button → editable form and attachments. For any other status, only allow viewing; if another user's report, hide Edit and handle 403 correctly on direct route/API call. Include `Likely related reports` compact cards if available, but prioritize visible staff-side duplicates. All links locale-aware.

## 7. Staff UI — protected separate workspace

Sign-in: fictional staff email/password form, no registration link. Show failure generically; do not show actual hardcoded password. Separate staff layout on successful API session.

Staff Home: worker name, current workload summary, **resolved by me** count, recently solved cards, links to Requests and Resolved. Staff Settings: language/theme, personal details (display only), logout; only add password change if fully backed with secure endpoint.

Requests page default lists only unresolved statuses, sorted **highest votes first then oldest**. Provide controls Most confirmed, Oldest, Newest, category/type/location/status. Ticket cards emphasize count, age, status, location, issue type; clickable to workbench. Responsive: task-dense desktop list/table and compact mobile cards.

Staff ticket detail: all public report content, real photos, status timeline and milestone bar, separate `Likely duplicates` panel from same server matcher, optional assign-to-self, clear action buttons according to valid transitions: Accept, Reject (mandatory reason dialog), Start Work, Resolve (mandatory resolution note). Show action pending/error success via Sonner. Never allow status change without backend authorization. Open list refreshes afterward; resolved moves to history. Show _which staff member resolved it_ in their personal completed list without exposing unnecessary personal data to public feed.

## 8. English/Spanish internationalization

Use `next-intl` and Next.js 16 `proxy.ts` where appropriate. Support `/en`, `/es` and all nested routes, default English, preserve route/params on switching languages. Translate every visible UI string: tabs, status, type/group labels from DB (`label_en`/`label_es`), validation, hints, errors, toggles, report titles? **Do not translate user-authored report text**; display as written. Campus building, room names and codes remain unchanged. Use locale-aware date/time/relative labels. Avoid hardcoding English in components. Spanish phrasing examples: `Mi cuenta`, `Reportes`, `Crear reporte`, `Ubicación exacta`, `Posibles duplicados`, `Confirmar problema`, `En progreso`, `Resuelto`, `Rechazado`. Write complete JSON dictionaries and add tests to catch missing keys. Ensure locale proxy doesn't rewrite `/backend`, `_next`, media requests.

## 9. Route progress, animation and settings

Re-use existing VINDEX generic `nprogress` integration if compatible with App Router; avoid unsupported `router.events`. Only trigger on actual local link transitions and finish on pathname/search changes (including locale). Motion only for subtle transitions, under ~250ms, not every card; use transforms/opacity, reduced-motion correctly. iOS-style grouped settings use accessible controls, keyboard focus, ARIA, touch target 44px.

## 10. Visual QA is mandatory

Take actual Playwright/mobile viewport screenshots of Account, Reports, Create, Details, Staff Requests, Settings for en/es and light/dark (at least representative combinations). Compare geometry to `codex/assets/reference.png` visually: card radius/spacing, typography, image ratio, footer tabs, white grouped surfaces, accent blue. Iterate CSS until coherent; **do not simply claim “pixel-perfect” without screenshots**. Responsive targets 375×812, 390×844, 430×932, 768×1024, 1440×900. Check keyboard overlap, long Spanish strings, scroll and bottom tab safe area. Do not use screenshot's commerce item photos or fictitious person profile images in production screens.

## 11. Data honesty

No hardcoded fake API counts, magic success confirmations or non-functional settings. If API is unavailable, show an honest offline/unreachable state with retry rather than pretend real data loaded. Demo seeded data is permitted **only** if read from actual database. Keep asset design quality and workflow functionality equally important.
