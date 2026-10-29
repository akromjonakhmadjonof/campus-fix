# CampusFix

CampusFix is a local demonstration of campus maintenance reporting. Anonymous visitors create reports, review possible duplicates, confirm existing reports, and follow a factual maintenance timeline. Staff use a separate email/password sign-in. All incidents and worker identities must be fictional; there is no university integration.

## Run locally

Prerequisites: Node 24.22.1, pnpm 11.17+ (11.x), and PostgreSQL. Docker is optional. Run commands from this repository root:

```powershell
Copy-Item api/.env.example api/.env
Copy-Item web/.env.example web/.env.local
Copy-Item mobile/.env.example mobile/.env
pnpm install --frozen-lockfile
# Configure DATABASE_URL in api/.env for a new local database first.
pnpm db:deploy
pnpm db:seed:locations
# Set STAFF_EMAIL, STAFF_NAME and STAFF_PASSWORD locally (12–128 characters).
pnpm staff:create
pnpm db:seed:demo
# Optional additional 16 fictional maintenance scenarios; STAFF_EMAIL must identify the local worker.
pnpm db:seed:expanded
pnpm dev
```

Open [CampusFix](http://localhost:3000/en). The API listens on 127.0.0.1:4000. Next binds to 0.0.0.0:3000 and proxies /backend/* to /api/*. Use a fictional staff email such as maintenance.demo@example.invalid. Staff accounts are CLI-only; there is no signup route. Do not put passwords in source control or chat. The staff CLI can reset an existing account; staff:disable disables it.

This workspace is already configured: PostgreSQL 17.11 runs locally on port 55432, api/.env targets the clean campus_fix_demo database, and web/mobile local environment files are present. Run pnpm dev. The separate campus_fix_test database is used only for automated verification. Both databases were newly created; no existing database was reset. The base seeder supplies seven fictional reports. The separate additive expanded seed supplies 16 more across varied issues, locations, ages, votes and statuses; rerunning it preserves both its existing fixtures and locally created reports. This workspace currently contains 25 reports after adding the expanded catalog.

The fictional worker email is maintenance.demo@example.invalid. Its generated password is in the ignored local .local-postgres/staff-password.txt file; open it locally when signing in, or reset it with pnpm staff:create. Passwords are not printed here or committed. For another checkout, follow the setup commands above and choose your own local credentials.

The verified Windows ZIP installation can be restarted after a reboot with:

```powershell
& .local-postgres/binaries/pgsql/bin/pg_ctl.exe -D .local-postgres/data -l .local-postgres/server.log -o '-h 127.0.0.1 -p 55432' start
```

Run that only if the cluster is stopped. PostgreSQL runs as a local process, not an installed system service. The ZIP and cluster are ignored development artifacts, not application dependencies. See codex/ACCEPTANCE.md for the original phase results and codex/REFINEMENT_ACCEPTANCE.md for the subsequent design/profile/localization verification.

## Application

- /en, /es, /ar, /ru or /uz: anonymous Account, editable display name/avatar, own three latest reports and See more. The Account menu has been removed.
- /{locale}/reports: public feed, Mine filter, search, category/group/type/location/status filters, ordering and pagination.
- /{locale}/reports/new: recursive location, translated issue taxonomy, precise object position, one to three required image attachments, live duplicate suggestions and final review. All seven fields are mandatory: title, description, group, dependent type, campus location, exact position and image.
- /{locale}/reports/{id}: photos, votes, workflow milestones and immutable history.
- /{locale}/reports/{id}/edit: owner-only editing while Reported, including location/type and attachments; optimistic version checks.
- /{locale}/settings: five languages, light/dark/system, reduced motion, privacy, explicit browser/app pairing and secondary-session revocation. Arabic uses RTL layout.
- /{locale}/staff/login, /staff, /staff/requests, /staff/requests/{id}, /staff/resolved, /staff/settings: separate staff workspace, queue, duplicate suggestions and personal resolution history.

Legacy /issues, /report and /me routes remain compatible with existing links. The preserved backend/ Nest experiment is not used by pnpm dev. pnpm dev:nest runs it explicitly; do not run both APIs on port 4000.

Four icon-only destinations remain visible on mobile and desktop: Account, Reports, Create Report, Settings. Staff use the same rail with Account, Requests, My Work and Settings. My Work opens the existing personal resolution-history route. Every icon has a translated accessible label, keyboard focus and an active state.

Report filters use the supported Next.js History API integration, preserve previous results during fetching, and debounce search by 350 ms. Detail links retain the list URL so returning restores filters. Mutations update affected query caches. Preliminary duplicate checks do not require an image and never reset other form fields.

Staff sign-in uses a dedicated split-panel desktop layout and a single-panel mobile layout, with email/password only, a password visibility control, localized validation and no application navigation. Protected staff screens wait for backend session verification. Login returns to a safe intended staff route or My Workspace; logout clears staff-only cached data and returns to sign-in while retaining the separate reporter identity and preferences.

Staff Account uses the same profile and compact report components as the student Account. Its metrics show resolutions by the authenticated worker and campus-wide open requests. Personal history requires a matching stored resolution actor/event and displays the resolution date. Assignment and staff-profile editing are not supported, so the UI does not offer them. Rejection uses a shared dialog with a required reason and remains a terminal alternate outcome.

## Data and identity

The original root seed.json is authoritative: **38 root peers, 281 locations, maximum depth 3**. It is unchanged. The importer validates nested shapes and sibling names, uses escaped path keys and upserts without deleting missing entries. codex/SEED_COMPARISON.json records differences against the fallback research file. Campus names are reference material, not an officially verified inventory.

Prisma/PostgreSQL stores profiles, hashed sessions, pairing requests, staff, translated issue groups/types, locations, reports, votes, universal media, attachment junctions, immutable status events and audit entries. Three additive migrations initialize the api/ database, protect audit history, and add optional display name/avatar fields to the existing profile. The pre-existing backend/ migrations are preserved and belong to its separate experiment.

Browser and WebView cookie stores are independent. A 5-minute pairing code requires approval from its initiating session before profiles merge. Reports survive the merge and overlapping/self votes are removed. Linking grants access to the combined reports; it does not verify physical device identity. Clearing cookies may lose ownership access unless another linked session remains. No fingerprint, student ID or student email is collected. Display names and avatars are optional; the default is Guest Reporter. On approved linking, the initiating profile keeps its custom fields, filling any missing fields from the joining profile.

New staff passwords use salted Argon2id (earlier local scrypt hashes remain readable until reset); sessions use 256-bit random secrets with only SHA-256 hashes stored. Mutations require the custom request header and an allowed Origin when supplied. A non-browser client may omit Origin but still needs the custom header and credentials. Secure cookies are enabled in production; local HTTP is for development. Session, login, creation and pairing routes are throttled.

Images are decoded, bounded and re-encoded as WebP with metadata removed. Bytes persist under api/storage/media; clients receive /backend/media/{id}/content URLs, never disk paths. Unattached uploads and avatars are owner-only, including linked sessions. Avatars cannot be attached to public reports; current avatar references are excluded from staged-media cleanup. Keep the storage directory alongside database backups. No external photo hosting or AI service is needed. New reports require an owned, usable image and a type belonging to the submitted group. Invalid uploads cannot leave a media row or file; staged unused uploads retain the existing cleanup policy. Existing records are not retroactively deleted or rewritten. Expanded seed illustrations are original local vector compositions using ISC-licensed Lucide icons; see api/seed-assets/README.md.

## Mobile

```powershell
pnpm dev:mobile
adb reverse tcp:3000 tcp:3000
```

Use EXPO_PUBLIC_WEB_URL=http://localhost:3000 for Android with ADB reverse. A physical iPhone must use the computer's LAN address, for example http://192.168.1.20:3000, and that exact origin must be added to api/.env CORS_ORIGINS. Localhost and LAN IP are different cookie origins; explicitly pair them if desired.

Expo hosts the same Next app, validates the platform handshake, restricts navigation to the configured origin, handles Android Back and connection retry, and owns the native safe-area insets. Development cleartext permissions require APP_VARIANT=development. Release configuration requires HTTPS. Native camera, keyboard, cookie persistence and device-specific safe areas need real-device verification; browser emulation does not prove these.

## Verification

```powershell
pnpm db:validate
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
# Local verification cluster (never point these at the demo database):
$env:DATABASE_URL='postgresql://campusfix:'+(Get-Content .local-postgres/password.txt -Raw).Trim()+'@127.0.0.1:55432/campus_fix_test'
$env:RUN_DB_TESTS='1'
pnpm --filter @campus-fix/api test
$env:STAFF_EMAIL='maintenance.demo@example.invalid'
$env:STAFF_PASSWORD=(Get-Content .local-postgres/staff-password.txt -Raw).Trim()
$env:PW_CHANNEL='msedge'
pnpm db:seed:expanded
pnpm test:e2e
# Clear this shell override before starting the clean demo:
Remove-Item Env:DATABASE_URL
Remove-Item Env:RUN_DB_TESTS
```

Stop pnpm dev before E2E: the tests reserve API port 4000 and web port 3200. PW_CHANNEL=msedge uses an installed Edge browser; otherwise install Playwright Chromium. Tests retain screenshots/traces on failure and save visual artifacts in codex/screenshots/. No test clears an existing database; test records use random identifiers. See [latest staff acceptance](codex/UPDATE_05_ACCEPTANCE.md), [navigation/validation acceptance](codex/UPDATE_04_ACCEPTANCE.md), [original acceptance](codex/ACCEPTANCE.md), [implementation log](codex/IMPLEMENTATION_LOG.md) and [three-minute demo](codex/DEMO_SCRIPT.md).

## Tools, disclosure and submission

Next.js, React, next-intl, TanStack Query, React Hook Form/Zod, Tailwind, Lucide, Motion, NProgress, Fastify, Prisma, PostgreSQL and Expo WebView. Codex assisted implementation, test authoring, diagnosis and documentation; results were checked with builds, real PostgreSQL tests and actual browser screenshots. Existing illustrative fixture images are documented in design/ASSETS.md. Vindex was not accessed or used in this implementation.

Team members and the eventual demo-video link must be supplied by the project owner. This session does not submit a video, competition form, public deployment or project report. The challenge requires fictional data and an understandable codebase; review the code and explain the design before submitting.
