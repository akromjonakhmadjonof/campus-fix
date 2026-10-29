# CampusFix acceptance report

The subsequent design, profile and five-language refinement is documented in [REFINEMENT_ACCEPTANCE.md](REFINEMENT_ACCEPTANCE.md). This file retains the original phase verification.

Verification date: 2026-10-28 (America/New_York). The six phases were executed in order, with later integration fixes recorded in IMPLEMENTATION_LOG.md. The user's final instruction superseded the Vindex references: that project was neither read nor modified.

## Result and environment

The local browser application implements the complete report-to-resolution journey against real PostgreSQL and local image storage. Native-device execution remains unverified. This report distinguishes executed tests from source review and prerequisites that were unavailable.

- Windows; Node 24.22.1; pnpm 11.25.0 (repository permits 11.x); Next 16.3.8; Prisma 7.10.1; PostgreSQL 17.11.
- PostgreSQL is a local ZIP installation in ignored `.local-postgres/`, listening only on `127.0.0.1:55432`.
- `campus_fix_test` contains isolated automated fixtures; `campus_fix_demo` contains the clean judging demonstration. No existing database was reset, dropped or cleared.
- Existing uncommitted work and the `backend/` experiment were preserved. Root `pnpm dev` now runs the requested `api/` Fastify implementation and `web/` Next application.
- No real university services, accounts, incident reports or personal information were used. No public deployment or submission was performed.

## Phase gates and executed commands

| Gate                                                      | Result  | Evidence                                                                                                                                                                                                                                       |
| --------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01: inspect repository, prompt files, reference and brief | PASS    | Inspected existing web/API/mobile/backend, git state, versions, routes, seed and migrations before edits. Read master and phases 01-06; inspected supplied reference and brief.                                                                |
| 02: Prisma validation and generation                      | PASS    | `pnpm db:validate`, `pnpm db:generate`.                                                                                                                                                                                                        |
| 02: migrations                                            | PASS    | Both migrations applied successfully to newly created test and demo databases.                                                                                                                                                                 |
| 02: owner seed and idempotency                            | PASS    | First import: 281 inserted. Repeats: 281 unchanged, 0 inserted/updated/stale. Demo seed rerun without duplicate fixtures.                                                                                                                      |
| 03: API verification                                      | PASS    | `RUN_DB_TESTS=1 pnpm --filter @campus-fix/api test`: **21 passed**, including 15 real-database cases and 6 unit/infrastructure cases.                                                                                                          |
| 04: web contracts/bridge tests                            | PASS    | `pnpm --filter @campus-fix/web test`: **17 passed**.                                                                                                                                                                                           |
| 04/06: production build                                   | PASS    | `pnpm build`: API compiler and Next production build; 26 static pages plus dynamic report routes. Final seed-only changes also passed API build.                                                                                               |
| 05: mobile static/config checks                           | PASS    | Mobile TypeScript and ESLint; `APP_VARIANT=development EXPO_NO_TELEMETRY=1 pnpm --filter @campus-fix/mobile exec expo config --type public`.                                                                                                   |
| 06: workspace lint and formatting                         | PASS    | `pnpm lint`; `pnpm format:check`.                                                                                                                                                                                                              |
| 06: workspace type checking                               | PASS    | `pnpm typecheck`, all four workspaces.                                                                                                                                                                                                         |
| 06: workspace unit regression                             | PASS    | `pnpm test`: API 6 passed/15 database cases deliberately skipped without flag, web 17 passed, preserved backend 9 passed. Database cases were run separately above.                                                                            |
| 06: Prisma schema/database agreement                      | PASS    | `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: **No difference detected**.                                                                                                                       |
| 06: real browser suite                                    | PASS    | `PW_CHANNEL=msedge pnpm test:e2e`, real Next/API/test PostgreSQL. **10 passed (1.8m)**: five scenarios on each of desktop and iPhone 13 emulation. Final staff-only UI changes additionally rechecked: **2/2 lifecycle cases passed (42.0s)**. |
| Native Android/iOS builds and devices                     | NOT RUN | No configured SDK/emulator/physical-device execution in this session.                                                                                                                                                                          |
| Hosted CI                                                 | NOT RUN | Workflow prepared in `.github/workflows/campus.yml`; no push or remote workflow run was requested.                                                                                                                                             |

Commands requiring a URL/password received it from ignored local files or environment variables. Passwords and cookie values are intentionally omitted. README contains reproducible PowerShell setup and test commands.

## Location source and database

Exact primary source:

`C:\Users\Admin\Documents\Codex\2026-10-28\https-github-com-akromjonakhmadjonof-campus-fix\campus-fix\seed.json`

The original is unchanged (`git diff --quiet -- seed.json` passed). Imported **38 root peers, 281 total nodes, depth 3**. No invented grouping parents or rooms were added. Example selectable path: `Sutherland Building / Ground Floor / Room S008 — Multimedia Learning Space`; root and intermediate selections remain valid.

Fallback `codex/assets/locations-research.json`: 47 roots, 342 nodes. Comparison found 22 owner-only paths and 83 fallback-only paths. The fallback was not imported. Full differences: [SEED_COMPARISON.json](SEED_COMPARISON.json).

Applied migration names:

1. `20261029000000_campusfix`: profiles/sessions, pairing, staff, recursive locations, translated taxonomy, reports, votes, media junctions, status and audit events.
2. `20261029010000_audit_guards`: append-only event triggers, pairing-session foreign keys and indexes.

Demo seed: four fictional open reports with locally stored illustrative photos; when `STAFF_EMAIL` identifies an existing CLI-created worker, three additional accepted/in-progress/resolved reports with dated fictional work history. Two fictional profiles confirm the first report. The verified clean database has 281 locations, 7 reports, 2 votes and 13 status events. Repeat seeding preserves existing fixtures and does not reset staff actions. Create the worker before demo seeding to populate personal resolved history.

## Product and security acceptance

| Requirement                                              | Result  | Evidence and boundary                                                                                                                                                                                                                                        |
| -------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Account is the default; own recent reports and Mine      | PASS    | Account-first routes; browser lifecycle verifies own new report and Mine feed; API denies ownership leakage.                                                                                                                                                 |
| All-location peers and recursive picker                  | PASS    | Import counts, sibling validation and real database tree; browser selects building, floor and room. Lots/root selections supported.                                                                                                                          |
| DB-backed English/Spanish taxonomy                       | PASS    | `/issue-groups` supplies translated group/type relations; selectors use server data; custom issue text validated on create/edit.                                                                                                                             |
| Anonymous bootstrap does not duplicate on refresh        | PASS    | Cookie reuse API test; independent browser contexts begin with distinct profiles.                                                                                                                                                                            |
| Opaque sessions and separate staff identity              | PASS    | 256-bit random secrets, hashes in DB, HttpOnly/SameSite cookies, separate guest/staff cookies; source review and auth tests. Production HTTPS cookies implemented; production deployment not tested.                                                         |
| Explicit browser/app pairing                             | PASS    | Two independent browser contexts submit code, await initiating-client approval, then share profile. API proves reports retained, ownership merged, self votes removed and replay denied.                                                                     |
| Pairing expiry, participant authorization and throttling | PASS    | Expired code rejected, outsider status request forbidden, repeated guesses return 429. Secondary-session revocation implemented.                                                                                                                             |
| Report creation, initial event and idempotency           | PASS    | Real PostgreSQL creation and repeated-key API tests; browser creation includes real image upload and review.                                                                                                                                                 |
| Owner-only edits while Reported                          | PASS    | Stranger PATCH returns 403; stale edits and post-resolution edits return 409; full edit form persists changes. No client owner/status fields accepted.                                                                                                       |
| Possible duplicates before submit                        | PASS    | Deterministic unresolved candidates with location/type/text scores and reasons; live debounced suggestions and final review. No automatic merge.                                                                                                             |
| Vote for duplicate without creating                      | PASS    | Dedicated desktop/phone browser case checks unchanged report total, Mine total zero and existing vote count increment.                                                                                                                                       |
| One vote per profile, undo, no self/staff vote           | PASS    | Unique DB key, repeated vote/undo tests and self-vote denial; browser confirms persisted vote after reload. Staff voting is denied by the API; staff screens show counts only.                                                                               |
| Staff CLI and separate login                             | PASS    | Fictional worker created/reset through CLI; salted Argon2id tested; login correct/incorrect/inactive cases; no registration endpoint. Legacy local scrypt hashes remain readable until CLI reset.                                                            |
| Queue sorting and resolved history                       | PASS    | API verifies unresolved-only queue, votes descending/oldest tie-break; personal resolved endpoint and browser resolved page.                                                                                                                                 |
| Accept/start/resolve/reject                              | PASS    | Transactional version guard and persisted events; full browser lifecycle; API rejection requires note and remains terminal.                                                                                                                                  |
| Factual public timeline/progress                         | PASS    | Browser sees four completed milestones after staff resolution; database append-only trigger rejects history rewriting.                                                                                                                                       |
| Photo bytes, attachment records and safe URLs            | PASS    | Browser uploads and loads photo; API stores/decodes PNG and serves re-encoded WebP after fresh application instance. DTO contains URL, no storage path.                                                                                                      |
| Image abuse guards                                       | PASS    | Actual-byte decoding, random storage keys, UUID/path/symlink checks, metadata removal; SVG, oversized and invalid-ID tests. JPEG/WebP allowlist implemented; no separate exhaustive codec corpus.                                                            |
| Pending upload lifetime                                  | PASS    | Source review: unattached media is private, claim window 24 hours, cleanup on startup/hourly; lifecycle timer closed with app. Clock-based cleanup not separately time-travel tested.                                                                        |
| Validation and safe errors                               | PASS    | Strict Zod bodies, 400 invalid IDs/locations/types/custom labels, 401 missing staff, 403 ownership/CSRF, 404 missing report/media, 409 stale edits; tests cover representative cases.                                                                        |
| Search/filter/sort/pagination                            | PASS    | Database query implementation with bounded page sizes, stable tie-breakers, location descendants, group/type/category/status and Mine. UI controls connected; queue ordering and Mine behavior tested. Not every possible filter combination was enumerated. |
| Responsive EN/ES screens                                 | PASS    | Screenshots at all five sizes; Spanish settings, validation, reports, detail status and staff navigation exercised.                                                                                                                                          |
| Theme, reduced motion and navigation feedback            | PASS    | Dark setting survives reload; theme/system and reduced-motion providers, NProgress and Motion retained. System-theme switching and reduced-motion preferences source-reviewed; no separate OS setting-change test.                                           |
| Accessible labels/statuses and no horizontal overflow    | PASS    | Labels, semantic buttons, text statuses, photo alt text and responsive overflow checks. Source/visual review; not an exhaustive accessibility certification.                                                                                                 |
| Native WebView remains thin                              | PASS    | Same web URL, versioned platform handshake, trusted-origin navigation, retry/back handlers and safe-area ownership; mobile static/config verification and bridge unit tests.                                                                                 |
| Native camera/file picker/back/keyboard/insets           | NOT RUN | Requires Android/iOS runtime. Browser upload and phone emulation do not prove native behavior.                                                                                                                                                               |
| Real browser-to-Expo pairing                             | NOT RUN | Two isolated browser cookie stores used as a stand-in. Pairing logic is tested; no hardware identity or automatic cookie-sharing claim.                                                                                                                      |
| Local-only demo and AI disclosure                        | PASS    | README, fixture labels, local database/media and design asset disclosure; no university endpoint or external incident submission.                                                                                                                            |
| Demo video and competition submission                    | NOT RUN | Script delivered; recording/submission belongs to the owner.                                                                                                                                                                                                 |

## Exact UI routes

For `locale = en | es`:

- `/{locale}`: Account and pairing.
- `/{locale}/reports`, `/{locale}/reports?scope=mine`.
- `/{locale}/reports/new`, `/{locale}/reports/{id}`, `/{locale}/reports/{id}/edit`.
- `/{locale}/settings`.
- `/{locale}/staff/login`, `/{locale}/staff`.
- `/{locale}/staff/requests`, `/{locale}/staff/requests/{id}`.
- `/{locale}/staff/resolved`, `/{locale}/staff/settings`.
- Existing `/issues`, `/issues/{id}`, `/report` and `/me` localized aliases remain available.

## Exact API routes

Browser prefix `/backend` is rewritten to Fastify prefix `/api`.

| Method       | Path suffix                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| GET          | `/health`, `/locations`, `/issue-groups`                                                                |
| POST         | `/anonymous/session` (legacy alias `/v1/sessions`)                                                      |
| GET          | `/anonymous/me`                                                                                         |
| POST         | `/anonymous/link/start`, `/anonymous/link/request`, `/anonymous/link/confirm`, `/anonymous/link/cancel` |
| GET          | `/anonymous/link/status/:id`                                                                            |
| POST         | `/anonymous/sessions/:id/revoke`                                                                        |
| GET, POST    | `/reports`                                                                                              |
| POST         | `/reports/similar`                                                                                      |
| GET, PATCH   | `/reports/:id`                                                                                          |
| POST, DELETE | `/reports/:id/vote`                                                                                     |
| POST         | `/media`                                                                                                |
| GET          | `/media/:id/content`                                                                                    |
| POST         | `/staff/login`, `/staff/logout`                                                                         |
| GET          | `/staff/session`, `/staff/me`, `/staff/requests`, `/staff/requests/:id`, `/staff/resolved`              |
| POST         | `/staff/requests/:id/status`                                                                            |

Locations are a flat adjacency list with `parentId` and full breadcrumb `path`, used by the recursive picker. This avoids a fixed-depth transport shape. Search uses `q`; filters include `scope`, `status`, `category`, `group`, `type`, `locationId`, `sort`, `page`, `limit`. Staff login accepts an email in the `username` field. Transition bodies use `status`, required `note` and `version`.

## Visual evidence

46 ignored PNG artifacts under `codex/screenshots/`:

- `desktop-*` and `mobile-*`: Account, Reports, Create and Spanish Settings at widths **375, 390, 430, 768, 1440**, heights **812, 844, 932, 1024, 900** respectively.
- `desktop-staff-requests.png`, `mobile-staff-requests.png`.
- `desktop-staff-workbench.png`, `mobile-staff-workbench.png`.
- `desktop-resolved-detail.png`, `mobile-resolved-detail.png`.

Representative Account, Reports, Create, Spanish dark Settings, workbench and resolved-detail images were visually inspected. Their compact rounded cards, pale surfaces, blue accent, grouped forms and distinct desktop navigation were compared with `codex/assets/reference.png`. No pixel-perfect claim. Earlier offline/loading screenshots were replaced with live-data captures. Full-page screenshots retain fixed navigation at its viewport position; native safe-area behavior is a separate untested gate.

## Important corrections and limitations

- Early browser verification exposed four inverted guards introduced during editing; corrected, API checks rerun, then full browser journeys passed.
- A staff-action test raced the form's note reset; it now waits for the actual new status. An added room-selection test contained a replacement character; the test label was corrected to match the unchanged source name.
- Preserved backend Prisma count typing and invalid-URL error handling were fixed so root checks pass.
- Final API review added invalid-location/custom-label rejection and synchronized Prisma relation/index declarations with the applied migration. Schema diff is clean.
- The expanded browser sweep exposed overly strict shared read throttling through the Next proxy. The general limit was adjusted to 600/minute; session bootstrap and similarity use 60/minute, while tighter login/pairing/upload/report limits remain. The full suite was rerun.
- PostgreSQL driver emits a non-failing concurrent-query deprecation warning with the current Prisma adapter. Current pinned versions pass; evaluate it before a future pg 9 upgrade.
- Duplicate suggestions are bounded heuristics, not guaranteed duplicate prevention. Full performance/load/penetration testing and exhaustive filter/media matrices were not run.
- Browser and WebView identities are independent until paired. Clearing the last usable cookie can lose report-edit access; there is no identity recovery based on real personal information.
- Public location names are owner-provided reference data, not a certified university inventory.
- Native-device runtime, full screen-reader/keyboard audit, real HTTPS hosting, CI execution and submission remain NOT RUN, as identified above.

## Main changed files and operation

- `api/prisma/schema.prisma`, two migration folders; `api/src/campus.ts`, `domain.ts`, `taxonomy.ts`, `seed.ts`, `staff-cli.ts`, API tests and server/config integration.
- `web/src/app/[locale]/reports`, `settings`, `staff`; campus components, typed API client, locale messages, styles/preferences and unit/E2E tests.
- `mobile/App.tsx`: thin wrapper URL/retry/safe-area integration.
- Root workspace scripts/lockfile, CI workflow, environment examples, README and this `codex/` delivery set. Existing backend received only compatibility/error-handling fixes needed for root verification.

Local run: `pnpm dev`; browser `http://localhost:3000/en`. API port 4000, images through `/backend/media/:id/content`. Local ignored environment files already target `campus_fix_demo`. Fictional worker email: `maintenance.demo@example.invalid`; password is in ignored `.local-postgres/staff-password.txt`, never printed here. Reset using the CLI if desired.

Expo: `pnpm dev:mobile`, `EXPO_PUBLIC_WEB_URL=http://localhost:3000`, Android `adb reverse tcp:3000 tcp:3000`. Physical iPhone uses the computer LAN address and matching API allowed origin. See README for database start/test commands and [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for the three-minute presentation.

Official implementation references consulted: [Fastify validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/), [Prisma configuration](https://www.prisma.io/docs/orm/reference/prisma-config-reference), [PostgreSQL Windows installers](https://www.postgresql.org/download/windows/), [node-argon2 usage](https://github.com/ranisalt/node-argon2#usage). Local executed checks above, rather than documentation alone, support the acceptance results.
