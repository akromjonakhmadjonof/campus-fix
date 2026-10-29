# CampusFix backend

NestJS/Fastify modular monolith with Prisma 7.10.1, PostgreSQL 18.6 and strict ESM
TypeScript. Node 24.22.1 and pnpm 11.17.0 are selected by the workspace.
Start with the root README for the complete application.

## Local configuration

Application commands run from `backend/`; pnpm's package filter selects that
directory. Only `backend/.env` is loaded, with process variables taking priority.
Copy `.env.example` and fill the database passwords/URLs and seed staff password.

```sh
pnpm --filter @campus-fix/backend db:up
pnpm --filter @campus-fix/backend db:deploy
pnpm --filter @campus-fix/backend db:seed
pnpm --filter @campus-fix/backend dev
```

Compose provides persistent development and test clusters on loopback ports 5432
and 5433. For an existing local PostgreSQL installation, provision equivalent
roles/default privileges from `database/init.sh` deliberately; the application
does not alter or adopt an existing database automatically.

The bootstrap `postgres` role provisions only fresh volumes. `campus_migrate`
owns schema/migrations, while `campus_app` gets schema usage and table CRUD.
The migration wrapper removes runtime access to `_prisma_migrations`.
Passwords changed in environment files do not change existing database roles;
ask the database administrator to rotate those roles without deleting the volume.

| Setting                                     | Purpose                                                    |
| ------------------------------------------- | ---------------------------------------------------------- |
| DATABASE_URL                                | Runtime application-role PostgreSQL URL                    |
| MIGRATION_DATABASE_URL                      | Migration-role URL used only by migration commands         |
| SHADOW_DATABASE_URL                         | Separate development shadow database                       |
| DB_SSL / DB_SSL_CA_FILE                     | Verified TLS and optional private CA                       |
| CORS_ORIGINS                                | Exact web origins; no wildcard                             |
| UPLOAD_DIR                                  | Local writable photo directory, default uploads            |
| SEED_STAFF_PASSWORD                         | Explicit development/test seed password, 12–128 characters |
| HOST / PORT                                 | Defaults to 127.0.0.1:4000                                 |
| LOG_LEVEL                                   | Structured log verbosity                                   |
| DB_POOL_MAX                                 | Pool size per process, default 10                          |
| DB_CONNECT_TIMEOUT_MS / DB_QUERY_TIMEOUT_MS | Bounded connection/query waits                             |
| RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS       | In-memory per-IP request budget                            |
| TRUST_PROXY                                 | Explicit trusted IPv4/CIDR proxy addresses only            |
| SWAGGER_ENABLED                             | Development docs; prohibited in production                 |
| OIDC_ISSUER / OIDC_AUDIENCE / OIDC_JWKS_URI | Optional legacy Projects sample only; all or none          |

Production requires verified database TLS, HTTPS origins, Secure cookies and
disabled Swagger. Local development does not require OIDC or an external service.
Migration URLs in production require `sslmode=verify-full`.

## Domain and API

All routes below have prefix `/api/v1`. The web app calls the same API through
`/backend/v1`. DTOs reject unknown fields, protected ownership fields, malformed
IDs and invalid enum/pagination values.

| Method/path                     | Behavior                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------- |
| POST /sessions                  | Issue/reuse anonymous browser credential                                     |
| GET /locations                  | Persisted hierarchical location inventory                                    |
| GET /summary                    | Status counts and seven UTC days of report activity                          |
| GET /reports                    | Search, category, status, location subtree, activity, sorting and pagination |
| GET /reports/:id                | Public report/details/history with viewer-specific capabilities              |
| POST /reports/similar           | Deterministic similar open-report candidates                                 |
| POST /photos                    | Validate/re-encode and privately stage one image                             |
| GET /photos/:id                 | Attached image public; staged image owner-only                               |
| POST /reports                   | Create report and atomically claim an owned staged image                     |
| PATCH /reports/:id              | Owner edit while Reported                                                    |
| POST /reports/:id/confirm       | Idempotent confirmation for this browser                                     |
| GET /staff/session              | Current local staff display name, or null                                    |
| POST /staff/login               | Verify local username/password, rotate staff session                         |
| POST /staff/logout              | Revoke the session and clear its cookie                                      |
| PATCH /staff/reports/:id/status | Staff-only forward transition plus required note                             |

`GET /health/live` and the compatibility `GET /api/health` are process liveness.
`GET /health/ready` checks the database. `/docs` is opt-in outside production.
Errors use `{statusCode,code,message,requestId}`; response bodies omit raw SQL,
credentials, exception stacks, session identifiers and password hashes.

Report pagination defaults to 12, caps at 60 and permits at most 10,000 pages.
Newest ordering uses creation time and ID; confirmation ordering adds count.
List totals and rows share a repeatable-read transaction. Offset pagination can
shift when new reports arrive.

Similarity examines the latest 100 unresolved reports sharing the exact selected
location or category. Score = 0.45 for matching location + 0.25 for matching
category + 0.30 times Unicode-word Jaccard similarity. Scores ≥0.45 produce up to
five candidates, with deterministic ID tie-breaking. This is a local heuristic,
not AI classification or a guarantee that duplicates are detected.

## Ownership and staff security

Guest credentials contain 256 random bits, are stored only as SHA-256 hashes, and
expire after 30 days. Staff sessions expire after eight hours. Cookies are
HttpOnly, SameSite=Strict, path=/, and Secure in production. Request body IDs are
never trusted as ownership. No browser fingerprint, name, email or student ID is
collected. Clearing cookies or changing devices loses access to that browser's
previous reports; reports remain public.

Mutations require `X-CampusFix-Request: 1`, plus an allowlisted Origin when
present. The non-simple header, strict cookies and restricted CORS prevent
cross-site form submissions. The public controllers explicitly enforce guest or
staff credentials on every protected mutation. Session creation/login/upload
also have route-specific rate limits.

Passwords use Node's salted scrypt and timing-safe verification. Unknown usernames
perform password derivation too. Staff login never exposes whether a username
exists. Seed credentials are fictional and must be chosen locally; there is no
committed universal password. Production staff provisioning is an administrative
task; the demo seeder refuses production.

Report/image creation and status/history writes use transactions. Status updates
use a compare-and-update predicate, allowing only Reported → In progress →
Resolved. Stale or competing transitions return 409. Confirmation insertion uses
a compound primary key with SQL conflict skipping, so concurrent clicks count once.
A user can obtain another guest credential by clearing cookies; this is browser
deduplication, not proof of unique people.

The legacy `/projects` example and its OIDC guard/tests are retained. These routes
remain inaccessible without a configured provider and a valid RS256 access token
with the expected issuer/audience, subject, expiry and read/write scope. They are
not used by CampusFix screens.

## Photos and privacy

Uploads allow one JPEG, PNG or WebP, at most 6 MiB and 20 million decoded pixels.
Sharp checks real image content, rejects animations, applies orientation,
resizes to at most 1600 pixels and encodes fresh WebP without source metadata.
Random server filenames prevent caller-controlled paths. Unattached images are
readable only by their owner; attached images and report text are public.

The application request logger omits IP addresses, bodies, query strings, headers
and raw errors. Hosting/proxy logs may have different retention.
Users are told to avoid personal information in public text/photos.

Local files require a persistent mounted directory and backup alongside PostgreSQL.
There is no automated content moderation or emergency dispatch. Abandoned staged
uploads and expired session records currently require an operational cleanup
policy; do not delete GuestSession rows referenced by public reports. No destructive
automatic cleanup is enabled. Rate limits are per process, not distributed.

## Migrations and seed

The original Project migration is preserved. The additive campus migration adds
Location, GuestSession, Staff, StaffSession, Report, Attachment, Confirmation and
StatusChange plus category/status enums, constraints and query indexes.

```sh
pnpm --filter @campus-fix/backend db:validate
pnpm --filter @campus-fix/backend db:generate
# After an intentional development schema edit:
pnpm --filter @campus-fix/backend db:migrate --name describe_change
# Apply reviewed committed migrations:
pnpm --filter @campus-fix/backend db:deploy
pnpm --filter @campus-fix/backend db:status
```

Migration commands do not run during application startup. Development diffing
uses a separate shadow database; never point it at application data.
Production changes should follow an expand/backfill/contract rollout.

The seeder only accepts NODE_ENV=development/test and the named campus_fix or
campus_fix_test database. Location names/hierarchy are copied from the repository's
seed.json and retain stable path-derived IDs; room details are not independently
verified. Six reports have fixed IDs and fictional descriptions/generated photos.
Reruns preserve existing reports and refresh the maintenance.demo password to the
explicit SEED_STAFF_PASSWORD. The seeder does not run on application startup.

## Verification and operations

The backend tests compile decorator metadata with tsc and run with node:test.
Integration tests require explicit NODE_ENV=test and a DATABASE_URL whose database
name is exactly campus_fix_test. Cleanup deletes only records owned by each test
run, never resets a database or removes volumes.

Campus coverage includes CSRF checks, private upload access, malformed image
rejection, attachment theft rollback, owner editing, subtree filters, duplicate
review, concurrent confirmations, staff login/logout, stale status transitions,
history and expired-session denial. Legacy tests cover JWT signatures/claims,
permissions, database roles, readiness failures and request limits.
The web suite adds real reporting/staff journeys and responsive screenshots.

The workflows describe the runnable cloud checks; **they have not been executed
in this authoring session**. No dependency install, database migration, full build
or database-backed test has run on the user's computer. See the root README for
the limited checks that did run.

Container targets:

```sh
docker build -f backend/Dockerfile --target migrate -t campus-backend-migrate .
docker build -f backend/Dockerfile --target runtime -t campus-backend .
docker run --rm --env-file /secure/path/migration.env campus-backend-migrate
docker run --rm -p 4000:4000 --env-file /secure/path/runtime.env \
  -v campus-photos:/app/backend/uploads campus-backend
```

Runtime runs as non-root and excludes migration/bootstrap credentials. Mount a
read-only CA when required. SIGINT/SIGTERM close HTTP and database resources.
Configure TLS termination, trusted proxy addresses, per-replica connection
budgets, staff provisioning, backup restoration checks and retention deliberately.
Do not expose a production instance using demonstration credentials.
