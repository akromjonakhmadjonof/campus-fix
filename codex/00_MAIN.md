# CAMPUSFIX — MASTER CODEX EXECUTION PROMPT

You are the technical lead, product engineer, UI engineer, and QA owner for **CampusFix**, a Penn State Abington-themed maintenance ticket/report application. This is an **implementation instruction**, not a request for a plan or mockups. Build an integrated, demonstrable solution in the existing repository; do not stop at scaffolding.

## Working context and precedence

- Codex is launched in the existing `campus-fix/` repository. Do not assume it is empty. **Inspect it first.**
- Expected workspaces: `web/` (Next.js 16/React 19/TypeScript), `mobile/` (Expo/React Native with WebView wrapper), `api/` (Fastify/Prisma/local PostgreSQL), pnpm workspaces. Adapt to actual installed, compatible versions. Do not create `desktop/` or `packages/`.
- `../vindex/web/` is a **strictly read-only** source of generic fonts, Tailwind design primitives, shadcn components, next-intl, Motion/NProgress patterns, and useful configuration. Never edit VINDEX, copy VINDEX domain code, or copy VINDEX branding.
- `seed.json` already exists somewhere in this repository according to the project owner. **Locate it before writing seed code.** The attached `codex/assets/locations-research.json` is a _fallback/reference_ only, not an instruction to overwrite the owner's `seed.json`.
- `codex/assets/reference.png` is the supplied four-screen mobile visual reference. Use its refined visual language; adapt page semantics to CampusFix, not e-commerce. No fake device chrome in production UI.
- `codex/assets/challenge-brief.pdf` is the official challenge brief. The mandatory complete journey is creation → duplicate prompt → tracking → staff progress → resolution. The brief requires **sample/fictitious reports and no real personal information or university systems**. Public campus locations are reference material, not a license to claim a live campus integration. AI use must be disclosed, and working code must be understandable.
- Follow this master file **and every phase file referenced below**, as one coherent specification. If files conflict, prefer (1) safety/auth/data integrity; (2) this master file; (3) phase-specific file; (4) copied VINDEX conventions. Preserve already-working project features unless incompatible with requirements.

## Read and execute in this exact order

1. **`codex/01_PRODUCT_AND_WORKFLOWS.md`** — read thoroughly. Freeze product behavior, actor permissions, statuses, routes, and UX expectations. Record any existing functionality you can reuse.
2. **`codex/02_DATABASE_AND_SEEDS.md`** — implement Prisma schema/migrations, local media storage metadata, accurate recursive location import from the owner's actual `seed.json`, and seeded fictional issue groups/types/reports.
3. **`codex/03_API_AUTH_MEDIA_DUPLICATES.md`** — implement Fastify REST endpoints, secure anonymous device profiles, optional browser↔app linking, staff-only email/password auth, media serving, duplicates/upvotes, authorization, transactional status history.
4. **`codex/04_WEB_DESIGN_AND_PAGES.md`** — implement bilingual premium responsive Next.js web UI. Default route **Account/Home**, Reports feed, Create Report, Details, Account settings, and separate maintenance worker experience. Match screenshot composition via actual render/review cycles.
5. **`codex/05_MOBILE_WEBVIEW.md`** — keep Expo thin. It only hosts the exact Next.js app; handle native platform handshake, local networking, safe areas, back navigation and basic uploads without native feature duplication.
6. **`codex/06_TESTS_DEMO_DELIVERY.md`** — integration, security, migration/seed idempotency, Playwright phone and desktop screenshots, English/Spanish, demo script, documentation, and honest verification report.

Implement sequentially, but if dependencies require minor cross-phase edits, make them. After each phase, test enough to catch errors early, then proceed without pausing for permission. Never claim a task passed if you did not execute it. If a service is unavailable, record exact blockers and continue with work you can verify.

## Product in one paragraph

Students and campus community members use CampusFix as an **anonymous device-profile account**. Default page is **Account**, showing session/device-profile information and a preview of **their own recently created reports**, with a link to view all their created reports. The **Reports** tab is a shared, social-style feed of all reports, with upvotes/confirmations, search, filters, status, and issue details; owners can edit their own eligible reports, others cannot. The **Create** page collects exact nested campus location, issue group/type, description, identifying position, and photo(s), checks for likely duplicates **before posting**, and invites users to upvote an existing issue or intentionally continue. Facilities workers have **staff email/password accounts created only by a CLI/DB administrator (never public signup)**, protected work queues, acceptance/rejection/start/resolve actions, duplicate suggestions on report details, and a staff account showing their solved work. All reports have a factual status timeline and a clear progress indicator. Database + uploads live locally in `api/`; images are served through API URLs, never OS paths.

## Non-negotiable identity clarification

**"Browser and installed app on the same physical device must be the same user" cannot be guaranteed automatically** with a WebView. Browser and app typically use separate cookie stores, and we must **not fingerprint the device**. Implement secure anonymous **profiles and sessions**, plus an explicit, simple, one-time **Link browser and app** flow so the same person can associate browser and app sessions with one anonymous profile. Show a clear UI explanation, a pairing code, and owner confirmation. Once linked, both clients show the same reports/permissions. If not linked, each client is independently anonymous. No real names, student IDs, device hardware identifiers, or hidden identity correlation. Reference the detailed contract in phase 03.

## Technical and UI decisions already made

- Web is **Next.js App Router**, mobile is **Expo WebView only**, API is **Fastify** with **Prisma and local PostgreSQL**.
- Typescript end-to-end, pnpm workspace, localhost/LAN demonstration. No Supabase, Firebase, real Penn State systems, external auth, Expo Router, or Electron.
- `next-intl`: full English + Spanish. URL paths `/en/...`, `/es/...`; correct natural translations including errors/notifications/validation. Proper nouns and campus locations remain unchanged.
- `nprogress`: actual App Router/locale-aware navigation indicator. `motion`: controlled subtle UI motion; respect reduced-motion settings. Tailwind 4 + shadcn/Radix, coherent fonts/theme from VINDEX generic code.
- The reference is a **visual bar for mobile polish**; desktop needs its own premium layout, not stretched phone cards. Mobile screenshots must closely match the reference's card density, typography, radii, tab-bar positioning, and clean Apple-like style, not arbitrary AI aesthetics.
- Routing and permission matrix in phase 01 is authoritative. The backend, not the client, must decide ownership and staff access.
- Server-side `GET /api/media/:id/content` (through Next `/backend/...`) serves images. File paths are never sent to clients.
- No public staff registration. Admin CLI creates/updates a staff user using a password hash; demo uses fictional credentials configured via environment or a secure local CLI.

## Quality bar and acceptance gates

- A new anonymous profile can create a report with validated location/type/details/photo; duplicate suggestions display before final submit; the user can upvote an existing issue instead or still submit.
- Account shows **only own** latest reports and its view-all route; Reports feed shows **everyone's** public reports and lets any eligible anonymous profile upvote once.
- Only the owning anonymous profile (including its explicitly linked app/browser sessions) can edit its still-`reported` report; nobody can edit another user's report. Staff have appropriate moderation rights. No client-provided `ownerId` can grant privileges.
- Staff sign in, see active unresolved tickets prioritized by votes/age, accept, reject (with reason), start and resolve (with resolution note), and see their personal resolved history. Status events and progress are visible to students.
- Every input/output has validation, safe error handling, pending/empty states and localization. System uses database-backed data, not decorative fake actions.
- Real image bytes persist in `api/storage/media` and survive API restart. `media` metadata and `report_media` association persist in DB. The client loads images via URLs, never local disk paths.
- Recursive `locations` allow all buildings, lots, sports grounds, and campus areas to coexist as root peers, any depth of children, and selection at any level. The hierarchy is fetched from the backend. New report location descriptions disambiguate multiple matching chairs/computers/pipes.
- Works as normal browser, mobile WebView when reachable, and desktop web. Mobile wrapper never duplicates Next.js pages or domain logic.
- Actual independent browser + WebView sessions can be linked through an explicit, tested pairing workflow (not falsely auto-shared).
- All critical functionality is accessible in both English and Spanish; theme choice and motion setting work and persist.
- Unit/API/E2E tests run if prerequisites exist; run migration, seed, lint, typecheck, build, browser visual screenshots, and one full report-to-resolved test. Log genuine failures.

## Execution hygiene

1. Inspect `git status`, existing folder tree, package versions, README and migrations. Respect existing work; avoid destructive reset, drop, data clearing, blanket overwrites, or touching `../vindex/web`.
2. Maintain `codex/IMPLEMENTATION_LOG.md`: date/phase, file changes, commands, test results, blockers. This is a local audit of the Codex task, not a business feature.
3. Use a single root pnpm lockfile; avoid new monorepo frameworks and unnecessary dependencies.
4. Keep image assets, test fixtures and report records fictional; user-provided building names may be imported as names/locations, but avoid implying official affiliation/verification.
5. No unbounded external search/scraping, analytics trackers, actual campus API calls, telemetry, or sending reports off-machine.
6. Prefer secure and complete core workflows over stretch features. If overloaded, finish data + anonymous auth + reports + duplicates + media + staff resolution before optional charts/transitions.
7. Do not add public user signup or require email for students. Do not write secrets to repository or log credential material.
8. Don't stop to ask routine questions; choose sensible defaults, document them, implement and test. If a key requirement is fundamentally infeasible, implement the nearest explicit safe approach and disclose the limitation honestly.

## Final response Codex must provide

- Implemented routes/features and exact file changes (concise)
- Exact owner `seed.json` path used and resulting root/total location counts
- Database migration and seed result; no destructive writes unless expressly authorized
- Verified browser and mobile behavior; pairing caveat
- Login/demo setup **without printing secret passwords**
- Local dev commands and Expo URL / Android `adb reverse` example
- Verification matrix: pass/fail/not-run, including screenshots and bilingual E2E
- Remaining defects/limitations and path to a short 3-minute demo

**Read phase 01 now and execute the whole project.**
