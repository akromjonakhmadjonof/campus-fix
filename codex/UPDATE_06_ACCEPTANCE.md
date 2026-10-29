# Update 06 acceptance report

Implemented in the existing CampusFix application from `UPDATE_06_BRIEF.md`. The existing project, anonymous identities, staff authentication, history, demo database and authoritative `seed.json` were inspected before changes. No VINDEX code was used or modified.

## Delivered behavior

- Persistent notifications for successful new upvotes and Accepted, In Progress, Resolved and Rejected transitions. Notifications belong to the report creator's anonymous Profile. Verified actor-name snapshots render as plain text; only the report title navigates. Unnamed reporters use the localized Guest Reporter label.
- Account preview of four recent notifications, a paginated full inbox, recipient-scoped read actions, Mark All and an unread Account badge. Polling runs every 30 seconds while foregrounded. Native AppState forwards foreground changes; read state and inbox ownership survive approved device linking. Notifications with a creation timestamp after the observed Mark All cutoff stay unread.
- Authenticated staff Dashboard with current open backlog, reports received, unique resolutions, average work duration, average time to start and recorded upvotes. Official shadcn/ui/Recharts components render daily reports-versus-resolutions trends and horizontal location/issue rankings. Real database data drives hotspots and Needs Attention.
- Staff navigation remains four icons: Account, Requests, Dashboard, Settings. Personal My Work remains reachable from Staff Account. Global analytics and individual resolution credit stay separate.
- Status changes record the authenticated worker and action-time display name. Serializable transactions and version checks prevent silent overwrite; conflicts return 409 and refresh the visible record with a translated message. Duplicate votes and status retries do not duplicate notifications or history.
- English, Spanish, Arabic, Russian and Uzbek translations; Arabic RTL; existing light/dark theme, typography, shield, rounded surfaces and report-creation flow retained.

## Database and preservation

Migration `20261031000000_notifications_analytics` adds Notification, immutable VoteEvent, a StatusEvent actor-name snapshot and supporting indexes. Vote/status mutations create their notification in the same transaction. Retained existing votes are backfilled without retrospective inbox alerts. No reset or demo reseed was performed.

The migration passed against the isolated test database before being applied to `campus_fix_demo`. A local PostgreSQL backup was saved before migration. Before/after comparisons show **25 reports, 52 status events and 281 locations preserved**, with matching hashes for every existing Report, Staff, Location, Vote, AuditEvent and prior StatusEvent field. See [preservation evidence](UPDATE_06_PRESERVATION.json). `seed.json` SHA-256 remains `AF05D0A9E559C6D9E95D1D8C9CC9FADD0D75C9E8EFF55EF2084A431586820F51`.

## Metric definitions

[UPDATE_06_METRICS.md](UPDATE_06_METRICS.md) defines all cohorts, samples, root-location rollups and historical-cycle rules. The 7/30/90-day filter uses complete New York calendar days, with today excluded and the range displayed. Current backlog/attention are separately labeled current snapshots. The deterministic database scenario verifies **2 hours waiting** and **3 hours 30 minutes active repair**. Accepted does not start the repair-duration clock.

## Verification

- `pnpm check` with `RUN_DB_TESTS=1`: formatting, all-workspace lint/type checks and **68 passing tests**: API 34, web 25, preserved backend 9.
- `pnpm db:validate`: valid Prisma schema. Final web lint/type checks and API build also passed after the test-helper and schema metadata refinements.
- `pnpm build`: API and production Next.js build passed, including all localized routes.
- Browser regression result: **37 distinct browser scenarios verified, with 5 redundant matrix runs intentionally skipped**. The full 42-case run passed 35 and exposed two test-harness issues: an empty-state selector also counted Hotspots, and the shared worker hit the existing login throttle. After narrowing the selector and respecting Retry-After, all 9 affected notification/staff scenarios passed on rerun (1 redundant mobile empty-state capture skipped). The production login throttle was unchanged.
- Integration coverage includes recipient isolation, no actor IDs in notification DTOs, self-vote protection, concurrent duplicate votes, immutable name snapshots, undo/revote history, cursor pagination, idempotent reads, Mark All cutoff, approved profile merging, two distinct maintenance workers, personal credit, conflicting transitions, rejection notes, deterministic durations, incomplete/reopened historical cycles, empty periods, root rollups and daylight-saving boundaries.
- Browser coverage includes actual database metrics, notification polling and persistence, native foreground/background bridge simulation, plain actor names, client navigation, 7/90-day filters, authorization, stale-action refresh, all five locales and four-icon navigation. Existing creation, uploads, ownership, pairing, profile editing, filters, login/logout, rejection and staff workflows are included in regression checks.

## Screenshots reviewed

Actual browser screenshots are saved locally under ignored `codex/screenshots/update06/`. The matrix covers 375 × 812, 390 × 844, 430 × 932 and 1440 × 900, English light and Arabic dark screens, and all five dashboard translations. Assertions check overflow, chart dimensions, navigation count and runtime errors.

Reviewed Account preview, English/Arabic inboxes, English mobile/desktop Dashboard, Arabic dark Dashboard and Russian mobile Dashboard. Review caught and corrected RTL bar-label overlap. Empty inbox and empty dashboard captures are also included. The empty dashboard screenshot uses an explicitly labeled browser presentation fixture; separate PostgreSQL integration tests verify real empty aggregation. Other new screenshot scenarios use real test-database records.

## Live demo check

The restarted local application returned healthy status. Its authenticated 30-day dashboard returned 25 received reports, 20 current open requests, 4 resolutions, 85 recorded upvotes, 30 daily trend buckets and populated location/issue rankings. The web dashboard is available at http://localhost:3000/en/staff/dashboard. Existing demo credentials continue to work.

## Remaining limits

- Physical iOS/Android hardware was not exercised; browser tests simulate the native foreground bridge and the mobile workspace passes type/lint checks.
- Withdrawn votes predating this migration cannot be reconstructed. Existing status history receives the current name of its stored worker at migration; future events retain the action-time snapshot even after a rename.
- The live workflow still treats Resolved/Rejected as terminal. Imported historical reopened cycles are handled defensively; no reopening workflow was introduced.
- The PostgreSQL adapter emits a dependency deprecation warning about concurrent queries. Tests and builds pass; no unrelated database-driver upgrade was made.
- This update is local. No cloud deployment was performed.
