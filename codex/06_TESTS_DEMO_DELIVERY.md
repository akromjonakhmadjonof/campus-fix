# PHASE 06 — ACCEPTANCE TESTS, DEMO, DEPLOYMENT-FREE LOCAL RUN, FINAL VERIFICATION

Do not finish by claiming a polished UI. **Demonstrate complete persistence and ownership through actual automated/manual tests.** Preserve user data, no destructive migrations or destructive seeding.

## A. Set up verified local execution

Use pnpm root workspace scripts, retain existing names when reasonable; provide exact commands for:

- `pnpm install`
- local PostgreSQL start (document OS-specific examples only where verified), environment copy, migrations and Prisma client generation
- `pnpm db:seed:locations` using actual located `seed.json`
- `pnpm db:seed:demo` separately, with fictional report data
- `pnpm staff:create` with secure interactive/env input, no secrets committed
- `pnpm dev` running Next + Fastify; `pnpm dev:mobile` for Expo
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`

Web default port 3000; Fastify 4000. Next web rewrites `/backend/:path*` to `http://127.0.0.1:4000/api/:path*`; next-intl proxy must exempt backend and media. Test via browser and curl if available. Local media storage directory created on startup and ignored by Git. No obligatory Supabase/Docker/cloud.

## B. Unit and API integration tests (minimum)

1. **Location import:** original `seed.json` parses; every top-level location is a root peer; deep room breadcrumbs computed correctly; lots with no children selectable; repeated seed runs do not change counts unexpectedly; no synthetic rooms.
2. **Issue taxonomy:** multilingual group and type labels fetched; `other` requires description; type belongs to group.
3. **Anonymous sessions:** one profile per initial client session, no duplicates on refresh; secure cookie + hash; `scope=mine` contains only profile's reports.
4. **Ownership denial:** profile A creates report, profile B cannot edit it with PATCH, even if owner UUID supplied in payload. B can upvote once and remove vote; A cannot upvote own ticket.
5. **Pairing:** A starts code; B submits; B can't access A's reports until A explicitly confirms; after approval, A/B share profile and can access/edit allowed reports; codes expire, cannot replay, throttle; preexisting B votes merge uniquely and no reports are lost.
6. **Report lifecycle:** create (Reported), staff accepts, starts, resolves with note, profile sees complete status timeline; reject includes reason, correct terminal behavior; student cannot change status.
7. **Duplicate similarity:** same room + same issue type + similar text finds existing unresolved report, stronger than different location/type; no destructive duplicate merge; user may still create a distinct same-room report; staff side has candidates.
8. **Staff auth:** fictional staff created by CLI; correct password succeeds, wrong/disabled fails; unauthenticated anonymous requests to staff endpoints denied; no registration endpoint.
9. **Media:** upload JPEG/PNG/WebP, metadata row and attachment relationship stored; fetch by `/backend/media/:uuid/content` returns image bytes after restart; DB path not exposed; traversal, SVG, invalid IDs, oversized files rejected.
10. **Queries:** feed sorting/filtering, staff unresolved queue high votes then oldest, staff resolved-by-me history, pagination; no N+1 if easy to check.
11. **Validation/errors:** Zod field errors, empty query, invalid UUID, missing session, expired pairing code, stale edit version; proper 400/401/403/404/409.

## C. End-to-end Playwright scenarios

Use a real local database and running web/API; use deterministic seeded fixtures or isolated test DB; never wipe real dev DB without user authorization.

**Core happy path (English mobile viewport):**

1. Start fresh anonymous browser context; Account visible as **default** page with safe profile summary, no reports.
2. Enter Create tab, select a root location → floor → room from API location tree, pick group/type, enter title/description/exact position, upload fictional object image.
3. Duplicate suggestions appear when fields match an existing active report; user may inspect and upvote or choose create anyway; verify **no report created** when user only upvotes existing.
4. Submit new report and verify persistent report detail, photo URL, `Reported` milestone.
5. Account shows new report among own recent; View All opens Reports filtered Mine, while All feed shows other reports.
6. Use separate browser context and verify other user can vote, cannot edit.
7. Staff signs in (test-only secret supplied via env/fixture; no hardcoded public password), sees unresolved ticket, accepts → in progress → resolved with mandatory note.
8. Original profile refreshes: progress bar complete, real timeline events, status Resolved; ticket no longer appears in default open staff queue, staff resolved page includes it.

**Pairing path:** A browser and B separate context (standing in for WebView), both already have different anonymous sessions; A starts pairing, B submits code, A confirms, then B sees A's reports and can edit `reported` items. Test unconfirmed B cannot access A's private owner actions. If native environment available, repeat with Expo WebView; otherwise report stand-in limitation.

**Spanish path:** switch locale in Account settings, navigate Reports → Create → Details → Staff; validation/toast/filters and status text are Spanish; building proper nouns remain unchanged. Verify no missing translation keys or broken route paths.

**Accessibility/responsiveness:** small phone 375×812, typical 390×844, 430×932, tablet 768×1024, desktop 1440×900. Inspect tab bar overlaps, safe-area content, keyboard focus, alt text, contrast, labels, color-independent statuses, 44px-ish taps, reduced motion. Verify light/dark/system theme and no hydration flashes.

## D. Screenshot-based visual comparison

`codex/assets/reference.png` is the supplied style reference. Capture rendered screenshots of Account, Reports, Create, Report Detail, Staff Requests, and Account Settings. Compare typography/spacing/radius/surfaces/blue accent and reference's compact iOS grouping. Iterate after actually viewing them; do not assert pixel perfection without screenshot inspection. Do not copy screenshot's literal e-commerce labels, non-CampusFix profile names, or fake device system chrome. Save development screenshots under a clearly excluded/artifact path rather than committing huge binaries unless useful for demo.

## E. Docs / README / code explanation

Document:

- Overview and exact features implemented
- Architecture: same Next.js web in browser/WebView, separate Fastify/Prisma/Postgres, media storage and reverse proxy
- Prerequisites, workspace scripts, `.env.example` for API/Web/Expo
- How to start PostgreSQL and run migrations, seed location root/tree counts and fictional demo reports
- How to create a staff user via CLI and securely log in without public signup
- How anonymous identity works, session/cookie limitations, cross-browser/app pairing, recovery risks
- How same-origin media URLs work vs disk paths
- How to access Expo via `adb reverse tcp:3000 tcp:3000` or LAN IP; localhost limits on physical devices
- English/Spanish, screenshot design inspiration, accessibility choices
- Real limitation: no official Penn State system integration, public campus references may be incomplete; sample reports only
- Real limitation: one device ≠ automatically one WebView/browser account without pairing, no fingerprinting, session loss when cookies cleared
- AI tool disclosure: list usage and how you verified generated output (required by challenge)
- Repository startup, available endpoints, main data entities, limitations, tests and troubleshooting

## F. Judge demo plan (3 minutes max)

Produce `codex/DEMO_SCRIPT.md` for a concise narrated walkthrough:

- 0:00–0:20: campus issue + Account anonymous device profile
- 0:20–0:55: Create selecting real-looking campus location + group/type + exact object + photo
- 0:55–1:20: Duplicate suggestions and upvote an existing request; show Create Anyway for distinct issue
- 1:20–1:45: public Reports feed and owner edit authorization
- 1:45–2:25: staff queue, potential duplicates, Accept/Start/Resolve; show progress milestone timeline
- 2:25–2:45: Spanish toggle, theme and browser↔app pairing explanation / quick demo if possible
- 2:45–3:00: limitations and engineering (local PostgreSQL, audited status, media by URL)

The actual video, repo, and README are separate submission requirements; don't claim to submit them automatically. Deadline/competition context is available in the attached challenge brief; keep README accurate to actual implemented state.

## G. Completion matrix and delivery honesty

Create `codex/ACCEPTANCE.md` with rows for every product requirement marked **PASS (command/evidence)**, **FAIL (reason)**, or **NOT RUN (prerequisite)**, covering mobile WebView separately. List exact API/UI routes, migration names, seed path/counts, screenshots, test run output and blocker details. Never silently say `fully working` based only on compilation. Don't print passwords or session tokens. Explain source-of-truth location file and any discrepancies to fallback. If something fails, fix and rerun where possible before ending.

**Stop only after a real attempt to run the full creator→staff→resolved flow and visual comparisons.**
