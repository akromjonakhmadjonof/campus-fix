# Update 04 acceptance report

Date: 2026-10-29. Scope: the supplied Navigation, Report Validation, Seed Data & Smooth Interactions brief, preserved in [UPDATE_04_BRIEF.md](UPDATE_04_BRIEF.md). This is an incremental update to the existing Next.js/Fastify/PostgreSQL application.

## Implemented

- Removed the Account Menu section. Profile editing, recent reports and See more remain.
- Exactly four persistent icon destinations: Account, Reports, Create Report, Settings. Lucide icons, localized accessible labels, active state, visible keyboard focus, restrained tooltips and native/browser safe-area handling. Desktop uses the same rail.
- Staff retain these four destinations: `/staff`, `/staff/requests`, `/reports/new`, `/staff/settings`. Personal resolution history remains available from Staff Account. Existing authentication and authorization remain in force. No database schema migration was required for this update.
- All seven creation fields are required in React Hook Form/Zod and the API. Text is trimmed and bounded; blank/punctuation-only descriptions are rejected. Group/type membership and location existence are checked against PostgreSQL. The description uses the official shadcn Textarea pattern.
- At least one and at most three owned images are required. Camera capture, file selection, previews, removal, JPEG/PNG/WebP limits and existing media URLs remain supported. Invalid bytes are rejected before storage; media and audit writes share one transaction with file cleanup on failure.
- Preliminary duplicate suggestions debounce independently of final submission, work without an image, preserve form values, cancel obsolete requests and discard obsolete matches.
- URL-backed group, type, category, location, status, scope, order, page and search. Search debounces 350 ms; TanStack Query preserves results during fetching and receives abort signals. Supported Next.js History API updates avoid document or RSC refreshes. Details retain the originating list URL. Votes, edits, creation and staff status changes update affected caches.
- All new labels, validation and pending feedback are translated into English, Spanish, Arabic, Russian and Uzbek. Arabic retains RTL layout and official campus names remain unchanged.

## Additive database seed

`pnpm db:seed:expanded` adds 16 fictional scenarios covering monitors, faucets, chairs, projectors, electrical outlets, lights, doors, waste bins, sidewalks, benches, printers, ceiling leaks, restroom fixtures, parking lights, network faults and safety equipment.

The existing eight issue groups and 49 types already cover these scenarios; no duplicate taxonomy records were needed. Each report references a location from the existing 281-row catalog. Local original illustrations use ISC-licensed Lucide icons; attribution and the asset generator are included.

The live demo database grew from **9 to 25 reports**. Repeating the command added **0** reports. Snapshot hashes verified that every pre-existing report, attachment/media record, vote and status event was unchanged. The location and issue catalogs were also unchanged. The separate test database passed the same preservation and repeatability checks.

New fixtures include 5 Reported, 4 Accepted, 3 In Progress, 3 Resolved and 1 Rejected, with varied ages, vote counts and consistent status histories. Existing fixture records are skipped entirely on repeat, so locally changed fixture statuses are preserved.

Evidence: [demo seed verification](UPDATE_04_SEED_campus_fix_demo.json), [test seed verification](UPDATE_04_SEED_campus_fix_test.json). The authoritative `seed.json` SHA-256 remains `af05d0a9e559c6d9e95d1d8c9cc9fadd0d75c9e8eff55ef2084a431586820f51`.

## Verification

Verification was performed incrementally: navigation/form/API changes passed TypeScript checks before interaction work; seed preservation was checked on both databases; validation, ownership and media checks ran against real PostgreSQL; browser and visual checks ran against production builds.

| Check                                        | Result                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| ESLint, all workspaces                       | PASS                                                                                |
| Prettier, repository                         | PASS                                                                                |
| TypeScript, all workspaces                   | PASS                                                                                |
| API unit + real PostgreSQL integration       | 23 PASS                                                                             |
| Preserved backend tests                      | 9 PASS                                                                              |
| Web unit/locale/filter tests                 | 23 PASS                                                                             |
| API and Next production builds               | PASS                                                                                |
| Browser acceptance                           | 26 distinct PASS across full run + final rerun; 2 redundant mobile matrices skipped |
| Additive seed preservation and repeatability | PASS, both databases                                                                |

The final affected-suite rerun passed all 11 Update 04 browser checks against the final build (one redundant mobile matrix skipped). The other 15 browser checks passed in the preceding complete run. The earlier delayed-response teardown race and footer-clearance assertion were corrected; the final viewport matrix passed after adding bottom scroll padding and checking the fully scrolled position.

Browser coverage includes all seven localized errors, invalid/missing images, group-dependent types without losing other input, duplicate suggestions before photo upload, successful creation/editing, ownership, votes/undo, anonymous pairing, profile editing, staff login and complete maintenance status progression. Navigation checks compare `performance.timeOrigin` across tab/filter/detail/history interactions to detect document reloads. Delayed-response checks verify previous results and contextual pending feedback; typing checks verify one debounced search request.

Visual checks cover **375×812, 390×844, 430×932 and desktop 1440×900**, plus the preserved tablet matrix. Light/dark themes and Arabic RTL are included. The four targets are at least 44×44 pixels; pages do not overflow horizontally; the submit button can scroll fully above the fixed navigation. Screenshots are in [screenshots/update04](screenshots/update04) and the preserved refinement suite's screenshot directory. Representative phone and desktop captures were visually inspected.

## Limits

- Physical iOS/Android camera dialogs, keyboards and WebView safe-area behavior still need real-device verification. Browser emulation verifies markup, image upload and responsive layout, not native camera hardware.
- Existing historical reports are preserved, including any created before images became mandatory. New creation and supplied replacement attachment lists enforce the new rules.
- Standard browser Back/Forward restores URL state; custom return links explicitly restore filters. Exact scroll restoration remains subject to browser/Next behavior.
- Demo illustrations and incident descriptions are fictional. This update does not deploy publicly or modify another project.
- The installed Prisma/PostgreSQL stack emits a non-failing `pg` concurrent-query deprecation warning during integration runs; all assertions pass on the installed versions.

## Official references

- [Next.js native History API integration](https://nextjs.org/docs/app/guides/single-page-applications)
- [TanStack Query: retaining previous results](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries)
- [Official shadcn Textarea registry source](https://ui.shadcn.com/r/styles/new-york-v4/textarea.json)

Earlier phase and design reports remain historical records: [original acceptance](ACCEPTANCE.md), [design/profile/localization acceptance](REFINEMENT_ACCEPTANCE.md).

Local restart smoke check: API health OK, 25 demo reports, 281 locations, 16 expanded fixtures, and HTTP 200 from the maintenance queue route. The local application was left running on port 3000 with the demo database.
