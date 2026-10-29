# PHASE 02 — POSTGRESQL, PRISMA, LOCATION SEED, TAXONOMY, MEDIA METADATA

Implement durable, normalized relational storage in the existing `api/` using **local PostgreSQL** and an installed compatible Prisma release. Follow current Prisma config and adapter conventions for the version actually present; do not paste outdated generator/provider code.

## 0. Inspect actual seed first

Search within `campus-fix/` for `seed.json`, including the root, `api/`, and `prisma/`. Print which one will be used and inspect a sample and validation errors. Preferred hierarchy: user-owned `seed.json` first; `codex/assets/locations-research.json` fallback only if no project seed exists. **Never silently overwrite the user's original seed.** If both exist, compare counts and create a short discrepancy report; use original unless visibly invalid. The fallback research list is not a certified university room inventory.

Input shape:

```json
[
  {
    "name": "Sutherland Building",
    "children": [{ "name": "First Floor", "children": [{ "name": "Room 101", "children": [] }] }]
  },
  { "name": "Lot A", "children": [] },
  { "name": "Tennis Courts", "children": [] }
]
```

Items may omit `children`; treat omission as `[]`. Root list includes buildings, parking lots, sports grounds, and other campus areas as **siblings**. Do **not** group everything under invented `Buildings`, `Parking`, `Athletics` parent records unless the user explicitly asks. Keep original names (aside from harmless trimming). Preserve actual floors/rooms if present; **do not manufacture missing rooms**, stairs, outlets, chairs or equipment. A report may select a root or any intermediate node. UI provides a free-text exact-location field for missing nodes. Detect duplicate sibling names and invalid nested shapes; report to log rather than silently dropping valid nodes.

## 1. Proposed relational model (refine to match existing schema)

Use UUID primary keys; concise table names in snake_case via Prisma `@@map`/`@map` if desired. Include `created_at`, `updated_at` and `deleted_at` (soft delete) on editable records, and consistent `created_by_*`/`updated_by_*` attribution where meaningful. Actor attribution supports `anonymous`, `staff`, and `system` rather than assuming all audit actors are staff. Maintain an immutable `audit_events` table for sensitive changes. Do not invent values or compromise referential integrity just to force generic fields into pure junction tables.

**`anonymous_profiles`**: uuid, display alias (non-PII, e.g. `Guest #A1B2`), created_at, updated_at, disabled_at nullable. Not a real hardware identity.

**`anonymous_sessions`**: uuid, profile_uuid FK, secret_hash unique, created_at, last_used_at, expires_at, revoked_at, client_context (`web`, `android`, `ios`, optional), non-sensitive user agent summary if needed. Unique authenticated token per browser/app installation. Store **only hash**, never raw bearer secret; token sent through HttpOnly cookie on normal web requests. Optionally store hashed/rotatable refresh or support session cookie.

**`profile_link_requests`**: uuid, initiating_profile_uuid, initiating_session_uuid, random short-lived code_hash, requested_session_uuid nullable, state (`open`, `awaiting_confirmation`, `confirmed`, `expired`, `cancelled`), expires_at, consumed_at, attempts, created_at, updated_at. No unlimited guesses, no plaintext code retention. Linking must be explicit and one-time with source approval.

**`staff`**: uuid, full_name, email normalized unique, password_hash (Argon2id preferred), active, created_at, updated_at, deleted_at, last_login_at. No real university data. No public registration. CLI can create/disable/reset.

**`staff_sessions`**: uuid, staff_uuid FK, opaque token_hash or server session secret hash, expires_at, revoked_at, created_at/updated_at. Separate from anonymous sessions to avoid role confusion. Do not expose password hashes.

**`locations`**: uuid, `parent_uuid` self-FK nullable, name, optional `type` (`building`, `floor`, `room`, `parking_lot`, `outdoor_area`, `landmark`, `facility`, `zone`, `unknown`), `source_key` unique stable key for idempotent import, sort_order, active, created_at, updated_at, deleted_at. Unique sibling identity scoped to parent/source key; no fixed maximum depth. Index parent, active, sort. Treat type inference as best-effort metadata, not official truth. Keep source name unchanged.

**`issue_groups`**: uuid, stable `code` unique, `label_en`, `label_es`, display_order, active, audit timestamps. Broad grouped selector, NOT a location grouping.

**`issue_types`**: uuid, group_uuid FK, stable `code` unique, `label_en`, `label_es`, display_order, active, audit timestamps. Specific object/system. Optional `other` code and free-text details on report.

**`reports`**: uuid, public human-friendly reference (e.g. `CF-000123` via safe sequence, not random collision), reporter_profile_uuid FK, location_uuid FK, issue_group_uuid and issue_type_uuid FKs, title, description, exact_location (required), custom_issue_name nullable (required if issue_type=`other`), status enum, created_at, updated_at, deleted_at, accepted_at nullable, started_at nullable, resolved_at nullable, rejected_at nullable, accepted_by_staff_uuid nullable, resolved_by_staff_uuid nullable, optional assigned_staff_uuid nullable, resolution_note nullable, rejection_reason nullable, optimistic `version` or transactional concurrency guard. Ensure group/type relationship validated. Index `(status, created_at)`, location/type, reporter, resolved staff. If exposing vote count as denormalized cache, guarantee correctness transactionally, otherwise count from votes.

**`report_votes`**: uuid, report_uuid FK, anonymous_profile_uuid FK, created_at, updated_at (if helpful), UNIQUE(report_uuid, anonymous_profile_uuid). No vote on own report; database uniqueness enforces one vote per principal. Undo by deleting vote or soft-delete with a robust active-unique constraint. Do not count linked sessions as distinct users; merging two profiles resolves overlapping votes safely.

**`report_status_events`**: uuid, report_uuid FK, `from_status` nullable for creation, `to_status`, actor_type (`anonymous`, `staff`, `system`), actor_uuid, note nullable, created_at. **Append-only** for reliable timeline and audit.

**`media`**: uuid, relative `storage_key` (server-only, non-guessable filename, never absolute path), original_filename sanitized, MIME type, bytes, sha256, width/height optional, status/soft delete and audit timestamps. This is a **universal media catalog**, no `report_uuid` column forced into media itself. Images served by media UUID API endpoint; public response never includes `storage_key` or real local disk path.

**`report_media`**: uuid (or composite key), report_uuid FK, media_uuid FK, sort_order, created_at and audit as useful, uniqueness `(report_uuid, media_uuid)`. Future domain tables can have their own junctions with universal `media`.

**`audit_events`**: uuid, actor_type, actor_uuid nullable, action, entity_type, entity_uuid, metadata minimal/redacted JSON, created_at. Record staff decisions, ownership edits, account linking, report edits, uploads and security-relevant actions. Do not store passwords/session tokens or unnecessary personal data.

Optional table **`report_relations`** only if staff marking likely duplicates as related is implemented (type, source_report, target_report, staff_uuid, note, timestamps, duplicate symmetric guard); never silently merge two public reports.

Keep migration SQL reviewable; add meaningful indexes and foreign keys. Preserve existing migrations and data. Soft-delete report records (or keep and mark archived) rather than hard delete through public APIs. Use DB transactions for multi-row actions.

## 2. Recursive location import — idempotent and explainable

1. Parse and validate JSON recursively with Zod (nonempty names, array children, optional children, protect against absurd depth and huge payload).
2. Traverse depth-first, passing real `parent_uuid`; root entries have `parent_uuid = NULL`.
3. Compute stable normalized path/source key (escaping separators) and upsert. Handle same room names in different buildings; same child `Room 101` is legal under different parents.
4. Preserve `sort_order` according to JSON. If correcting names would change keys, treat as a reviewed migration, never blindly delete and recreate.
5. Add/update present nodes; **do not remove other DB locations automatically** when seed changes; report stale candidates. Source may contain empty `children`/not-present and leaf lots.
6. Save deterministic counts: root count, total nodes, depth, inserted, updated, unchanged. Re-run twice and assert no duplication.
7. Treat campus names as reference/demo catalog, not proof of official room occupancy. If `codex/assets/locations-research.json` used, note it's publicly researched, may be incomplete and requires verification.
8. Seed should not depend on a live internet connection or external Penn State endpoints.

## 3. Seed issue groups/types — DB-backed taxonomy

Minimum grouped taxonomy (translated labels; expand carefully without duplicates):

- `classroom_furniture`: Chair, Desk, Table, Whiteboard, Podium, Cabinet, Other Furniture.
- `it_computing`: Computer, Monitor, Keyboard, Mouse, Projector, Printer, Network/Wi-Fi Equipment, Charging Station.
- `plumbing`: Pipe, Faucet/Tap, Sink, Toilet, Urinal, Water Fountain, Drain.
- `electrical_lighting`: Light Fixture, Switch, Power Outlet, Electrical Panel (do not give DIY repair advice), Emergency Light.
- `building_access`: Door, Lock, Window, Elevator, Stairwell, Ceiling, Wall, Floor Surface, HVAC/Ventilation.
- `cleaning_safety`: Spill, Trash Bin, Cleaning Issue, Safety Sign, Fire Safety Equipment (no dangerous operational instructions).
- `grounds_parking`: Streetlight, Sidewalk, Parking Surface, Gate, Bench, Landscaping, Sports Equipment.
- `other`: Other / Not Listed (requires text describing the object).

Labels stored as `label_en` and `label_es`; category/group must be translated without relying on hardcoded frontend lists. A single group/type can be selected independent of whether location is classroom/building/outdoor; don't prohibit valid combinations.

## 4. Fixture data and privacy

Create a separate **demo-only fictional reports seed** for the judging demo. Synthetic titles, position descriptions, timestamps, statuses, photos of objects (not real people), upvotes, and staff work histories; use existing campus location nodes but make all maintenance incidents fictional. Never seed real personal info. If using source images, use locally licensed/demo photos or clean placeholders with clear image labels; no runtime image hotlinks needed.

The seed command should be idempotent (stable fixture keys), should not reset production data, and should let the developer choose to include demo reports explicitly. A `staff:create` CLI securely hashes the provided password; prefer an interactive prompt or environment variable, never commit a live password or show one in logs. A demo script may seed fictional worker identity from env in development only.

## 5. Prisma + data checks

- Run Prisma schema validation and client generation.
- Generate/review migrations without destructive resets. Existing schema is source of truth if already populated; evolve it safely.
- Seed with the user's file. Execute it twice; prove location/issue type/report counts do not grow spuriously.
- Query a nested location breadcrumb, all roots, a location with no children, a report with media, and open staff queue.
- Add unit/integration tests for hierarchy traversal, uniqueness, status history and actor-permission integrity.
- API must serve locations and taxonomy from DB endpoints; frontend must not import the seed JSON directly as runtime data.
