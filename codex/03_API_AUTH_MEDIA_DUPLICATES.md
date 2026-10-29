# PHASE 03 — FASTIFY API, ANONYMOUS OWNERSHIP, STAFF AUTH, MEDIA, VOTES, DUPLICATES

Implement with the installed Fastify/Prisma/Node versions. Real API endpoints, Zod validation, bounded data, proper authorization, transactions, tests. Run on local PostgreSQL. No cloud services. All routes under `/api/*`, exposed to browsers/WebView through Next.js `/backend/*` rewrite. Avoid redundant Next.js route handlers that perform Fastify's business logic.

## 1. Endpoint contract (adapt HTTP names only if existing routes require)

**Public/anonymous runtime** (anonymous session created automatically if none exists; no student sign-in):

- `GET /api/health` — process health; optional DB readiness separately, avoid assuming DB is online.
- `POST /api/anonymous/session` — get/create an HttpOnly browser session cookie; return safe public profile data, not secret tokens. Ensure idempotent bootstrap on refresh; no duplicate session on every page load.
- `GET /api/anonymous/me` — pseudonymous profile summary, non-sensitive client/session fields, linked sessions summary, own report count, own recent tickets.
- `GET /api/locations` — active hierarchical trees (all roots, nested children); optional lazy `?parentUuid=` and search endpoint if needed for UX. Return uuid/name/type/children and breadcrumbs as appropriate, never only human name.
- `GET /api/issue-groups` — active groups plus translated issue types (code, label_en, label_es).
- `GET /api/reports` — public feed with pagination, `search`, `status`, `group`, `type`, `location` including descendant matching if requested, `sort`, and `scope=mine`; `mine` requires current profile and never trusts query `profileId`. Return aggregated vote counts + `hasVoted` + `isOwner`, first media URL, location breadcrumb, status; no raw storage path.
- `POST /api/reports/similar` — validated form state in request body (location UUID, issue type UUID, title, description, exact position, optional candidate report id), deterministic top 3–5 **unresolved** likely duplicates with score/reasons; no mutation. Ignore too-short/incomplete input gracefully.
- `POST /api/reports` — validated multipart or JSON-plus-upload reference, create ticket + initial status event + attachments transactionally after duplicate check; idempotency key for double-taps. Return public ticket and URL.
- `GET /api/reports/:id` — details, status history and milestone state, location breadcrumb, media URLs, actual vote count/hasVoted/isOwner, suggested duplicates if relevant.
- `PATCH /api/reports/:id` — only owning anonymous profile while status `reported`; allowed fields title, description, exact position, location, issue group/type, attachments within rules; never accept status, vote count, owner UUID, staff fields from anonymous clients; protect concurrent edits with version or last-update check.
- `POST /api/reports/:id/vote` — cast one confirmation vote for a report (cannot vote own report; unique constraint).
- `DELETE /api/reports/:id/vote` — undo own vote.
- `POST /api/media` — multipart photo upload into universal media catalog; authenticated anonymous session or staff session; return media uuid and safe URL. Associate with report in same operation or through short-lived pending uploads; avoid long-lived unclaimed uploads. Allow maximum e.g. three photos per report and 5 MB each, as configured.
- `GET /api/media/:id/content` — stream safe image bytes from server local storage with correct MIME/size/cache headers; use media UUID lookup. Public report attachments may be accessible to viewers; do not expose files unrelated to public reports by default.
- `POST /api/anonymous/link/start` — generate one-time account linking code for current session; rate limit, hash code, expire 5 minutes, return code only to initiating client.
- `POST /api/anonymous/link/request` — second client enters code, associates its _authenticated_ session as pending link, returns safe pending state; rate limit, never changes identity yet.
- `POST /api/anonymous/link/confirm` — **initiating client** explicitly approves the pending request, transactionally joins two pseudonymous profiles or adds second session to first; rotates/cancels code, logs event. If both have reports/upvotes, retain all created reports and merge votes with de-duplication to respect one vote/profile/report. No unverified hardware ID matching.
- `POST /api/anonymous/link/cancel` — cancel pending request.
- `GET /api/anonymous/link/status/:requestId` — authenticated participating sessions only; read polling for confirmation so second client can update itself.

**Staff** (all staff endpoints protected, in every handler):

- `POST /api/staff/login` — email/password, Argon2id verification, generic failure, rate limit; staff `HttpOnly` cookie separate from anonymous cookie. Block inactive staff.
- `POST /api/staff/logout` — revoke session/clear cookie.
- `GET /api/staff/me` — safe worker data, own assigned/unresolved counts and resolved-by-me counts/recent completions.
- `GET /api/staff/requests` — unresolved queue by default, pagination and filter/sort; default `(upvote_count DESC, created_at ASC)` (older first for ties). Allow explicit oldest, newest, most confirmed, type, group, location and status. All query constraints validated; no N+1 per-card requests.
- `GET /api/staff/requests/:id` — full workbench details plus likely duplicate suggestions and immutable event history.
- `POST /api/staff/requests/:id/status` — validated transition and note; require `rejectionReason` for reject, `resolutionNote` for resolve; use transaction/optimistic guard to prevent status race. Record staff actor + timestamp and update ticket resolution attribution.
- `POST /api/staff/requests/:id/assign-self` — optional, if UI exposes it; record staff assignment history.
- `GET /api/staff/resolved` — reports resolved by current worker, filter/sort/paginate.

No `POST /api/staff/register` or public signup. Provide CLI `pnpm --filter @campus-fix/api staff:create` (with flags or interactive prompts) and optional `staff:disable`/password reset CLI. CLI takes name/email/password, securely hashes, validates, ensures uniqueness, and avoids logging plaintext. Staff password hashes must not be in the repo. Do not use a hardcoded demo password in checked-in code.

## 2. Sessions, cookies, security

- Use cryptographically random >=256-bit opaque session secrets; store only a one-way hash in DB; cookie name unique for anonymous vs staff. Revoke/expire and optionally rotate.
- Same-origin requests through `http://localhost:3000/backend/…` simplify cookie behavior. Use `HttpOnly`, `SameSite=Lax` (or stricter compatible) and `Secure` when serving over HTTPS; dev HTTP-only permitted only when appropriate. Document `localhost` vs LAN `http://192.168...` and secure-cookie implications.
- Validate Origin/CSRF on cookie-authenticated **mutating** endpoints. Since same-origin reverse proxy is used, reject untrusted origins, treat missing Origin carefully for native/network clients, and do not rely on CORS alone. If necessary use CSRF token strategy and document.
- Rate limit report creation, vote toggles, staff login, and link-code guesses. Avoid bypass by changing client-provided IDs. Never read client `deviceId` as trusted ownership. No device fingerprint collection, platform hardware identifiers or fake cross-browser cookie-sharing claims.
- Return safe DTOs: no token hashes, full user agents, storage keys, absolute OS paths, internal Prisma errors or password hashes. Sanitize public display labels and enforce max lengths. Validate UUID/path parameters.
- Staff `isStaff` should come from a validated staff session on every request; never trust `role` in browser body or Next middleware alone.
- Access is scoped to the API authenticated profile, regardless of session platform. Report permissions work automatically after explicit browser↔app link.
- Cookie storage may be separate in Safari/Chrome vs RN WebView; `sharedCookiesEnabled` is not a cross-client authentication guarantee, especially iOS. Implement and test pairing rather than assuming equality.

### One-time pairing flow UX/API security

Client A (browser or app) opens Account → `Link app/browser` → starts link, displays short-lived random code and countdown. Client B opens Account → `Link existing profile` → enters code; server informs A a request is waiting. A **explicitly confirms** link (avoid unauthorized joining if code leaks). Server binds both authenticated sessions to one canonical `anonymous_profile_uuid`. On B, confirmation completes and user profile/reports refetch. Show clear warning that linking shares access to each other's reports and edit permissions; don't claim to verify the devices are physically the same. Cancel/revoke access later if practical; minimum track link event and include a way to revoke a secondary session in account settings if easily supportable. Link codes must be one-time, <=5-minute expiry, random, throttled and impossible to enumerate. Code alone without initiating-session approval must not grant control.

If both profiles contain records, perform merge transactionally: move B's reports to canonical A profile, handle report_votes collisions, update sessions and any pending link references, append audit event. Do not lose ownership or double vote. Concurrent requests must not cause a split state. Expose only opaque profile suffixes to users.

## 3. Media file system + DB

Actual bytes live under `api/storage/media/` (dev). Create directory automatically on API start; configured storage root may be overridden by absolute `MEDIA_STORAGE_DIR` for deployment but not exposed. Relative random storage key, **never original filename as path**. Derive final disk path using a safe resolved root and only DB keys; guard against path traversal and symlinks. Use `@fastify/multipart` or compatible plugin and streaming upload with limits to avoid memory exhaustion. Check MIME and magic bytes (allow JPEG, PNG, WebP; optional HEIC only if supported), enforce 5MB per file, max three per report; sanitize original filename; do not accept SVG/HTML/script MIME. Consider EXIF stripping to remove GPS if feasible; at minimum warn not to upload photos of people/personal IDs.

Insert `media` row and `report_media` row (or staged pending uploads) with failure cleanup. Files are **not** saved to `web/public`, not embedded in DB as base64, not returned as OS paths. DTO includes safe `url`, e.g. `/backend/media/1b.../content`; browser uses a normal URL so Next rewrite forwards to `api:4000`. `GET /api/media/:id/content` resolves metadata to file and streams; correct content-type, content-length, safe content-disposition, cache-control, `nosniff`, suitable ETag. Test 404 for unknown ID, wrong MIME, path traversal, missing file, large file. Preserve files on restart; ignore `api/storage/media/**` in Git.

Support uploaded photo preview in client with blob URL; revoke blob URL when finished. Native WebView file-picker/camera must be tested separately; do not assume a local API `file://` URL is accessible.

## 4. Duplicate detection — genuine and explainable

Implement deterministic server-side _likely duplicate_ suggestions. No cloud AI, no claim of perfect prevention, and **no forced block**. Minimum scoring inputs:

- Exact selected location or same deepest node, strongly weighted; parent/ancestor proximity weighted but **not treated as the same object automatically**.
- Same issue type (computer vs pipe), weighted; same group weaker.
- Overlap of normalized title/description/exact-position tokens (lowercase, punctuation/whitespace normalization, safe accent folding, stop words), or Postgres `pg_trgm` if migration and compatibility justify it.
- Prefer unresolved reports; ignore deleted/rejected/resolved for primary candidate list (resolved may be displayed in an opt-in historical view but not suggested as same active repair).

Suggested scoring proportions: exact location 35, same issue type 25, textual/exact-position similarity up to 35, recent unresolved 5; proximity to a parent vs actual room must score much lower. Return a 0–100 score, `reasons` array from explainable signals, `matchedLocation` breadcrumb, status, vote count and first image URL. Do not exaggerate precision. Top 3–5 only, sorted score descending then votes and age. Server final create re-runs candidate detection; client shows suggestions with `Upvote existing` and `Create anyway` controls. Still permit second reports if multiple physically distinct chairs/computers in same room; explicit physical position description protects against erroneous merges.

Duplicate endpoint must not allow unlimited arbitrary wide expensive searches; validate min text lengths, limit candidates and indexed queries. Debounce UI requests (~350–500 ms) and cancel stale ones; avoid flashing suggestions from earlier field values. Staff report details has a `Possible duplicates` section using the same matching service; show clickable cards. Staff may mark linked/related if a `report_relations` model exists, but must never silently delete or merge a report.

## 5. Status and event correctness

Report creation always adds `reported` event. Transition transaction checks allowed source/target, active staff, uses `version` optimistic compare or row lock, updates report timestamps and staff attribution, appends status event with time/note. Reject attempted student edits to status/owner/resolution fields even if provided in JSON. Resolve requires meaningful note. Reject requires meaningful reason. Derive current progress and timeline from persisted status/events, not hardcoded demo timestamps. `resolved` or `rejected` must not appear in staff **open** queue unless explicitly showing history filters.

## 6. Typed DTOs and validation

Centralize request/response Zod schemas and explicit typed DTOs in `api/` and web-facing types in `web/` (no `packages/` shared workspace). Use API schemas as source of truth where practical through OpenAPI generation; if duplicating small web types, keep contracts documented and testable. Return standard errors `{code, message, details?}`; no sensitive validation internals. Paginate with stable tie-breaker; clamp maximum page size and input text lengths. API should be consistent and discoverable, e.g. Swagger/OpenAPI optional if straightforward, not at expense of delivery.

## 7. API tests / mandatory abuse cases

- Two distinct sessions cannot edit each other's reports or vote as the same identity.
- After mutually confirmed linking, both sessions see and edit (while `reported`) the same canonical profile's reports.
- Supplying `ownerUuid`, `reporterProfileUuid`, role, or `status` from an anonymous user does not escalate privileges.
- Pair code cannot be replayed, guessed rapidly, self-confirmed without A's approval, used after expiry, or used without a session.
- No signup route exists; correct staff login/incorrect password/inactive staff behavior.
- Staff transitions valid/invalid with correct immutable timeline and resolved/rejected notes.
- Upvote unique after repeated requests; unvote idempotent; own report cannot be upvoted.
- Similar issues show suggestions in same building/room and same type; two unrelated issues in same building don't falsely become a mandatory duplicate.
- Uploaded media URL serves bytes after restart, not absolute filesystem path, and incorrect file paths/IDs cannot escape storage root.
- Open queue sorting and unresolved filtering are correct, `scope=mine` uses authenticated principal.
