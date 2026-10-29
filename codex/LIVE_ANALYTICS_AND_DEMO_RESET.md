# Live analytics correction and requested demo reset

## Analytics

The dashboard already read PostgreSQL through `GET /api/staff/analytics`; its values were not hardcoded. The defect was the reporting cutoff: all period metrics stopped at midnight and omitted today's work. A cached, already-open dashboard also had no periodic refresh.

The 7/30/90-day periods now include today so far, starting at local midnight `days - 1` days ago in New York and ending at the current snapshot instant. Daily series include today and still contain exactly the selected number of buckets. Explicit UTC ISO parameters prevent the database driver from shifting the cutoff into the future. Labels explain today's partial data in all five languages.

Successful status changes already invalidate every cached analytics period; that behavior is retained. Dashboard queries now refresh on entry/focus and every 30 seconds while foregrounded. The endpoint uses `Cache-Control: private, no-store`. Returning after a completion shows the new resolved/open counts; another open dashboard receives the update on its next refresh. Values continue to come from one consistent SQL snapshot.

Verification passed:

- Seven PostgreSQL analytics tests, including today's reports/resolutions/votes, exact inclusive start/exclusive cutoff, spring/fall daylight-saving boundaries, durations, historical cycles, authorization and trend totals.
- Four desktop/mobile browser scenarios covering existing filters/conflicts and the new complete-request regression. The latter completes a real test request, checks resolved +1/open −1 in all three API periods and today's chart bucket, revisits the cached dashboard through client navigation, and verifies another open dashboard updates without reloading.
- API/web lint, API type checking, all 37 web unit tests, formatting and API/Next production builds.

Regression activity used `campus_fix_test`, separate from the freshly reset demo.

## Requested database reset

Reset all 16 application data tables in **local `campus_fix_demo`** in one transaction. Retained schema, migrations and immutable-history guards. Reloaded the original root `seed.json` and issue taxonomy, then restored the maintenance account with its existing password hash. Prior reporter/staff sessions and pairing requests were cleared; users must sign in again.

Before resetting, created and checked a PostgreSQL custom-format backup:

`.local-postgres/backups/before-demo-reset-2026-10-29T13-17-54-481Z.dump`

The matching manifest is `.local-postgres/backups/demo-reset-2026-10-29T13-17-54-481Z.json`. Existing media files remain available for restoring that backup. The reset script is `api/src/reset-demo.ts`; it requires `--reset-local-demo`, rejects production, and only accepts the exact local `campus_fix_demo` database at port 55432. It preflights source locations, taxonomy and images before making changes.

Seeded data:

| Item                                             |      Count |
| ------------------------------------------------ | ---------: |
| Locations from the owner's seed                  |        281 |
| Requests                                         |         20 |
| Distinct request owners                          |         20 |
| Report image attachments                         |         20 |
| Reported / Accepted / In progress                | 12 / 4 / 4 |
| Resolved initially                               |          0 |
| Confirmations and matching immutable vote events |    40 each |
| Status history events                            |         32 |
| Corresponding notifications                      |         52 |

All requests use **Sutherland Building**, a real entry in the supplied location file. Four clusters each contain five similar reports from different fictional users: a leaking drinking fountain, a failed computer, a stained ceiling tile and an unstable chair. Exact positions identify the shared object within each cluster. Every description has at least 420 characters, contains a distinct observation plus full context/requested work, and explicitly identifies the incident as fictional.

Images are real locally stored WebP attachments, served through the existing media API. The four matching source assets are reused across similar reports: the project's existing generated fountain/computer images and its labeled ceiling/chair illustrations. No external image URLs or placeholder UI records were added. Profiles, reports, attachments, votes, notifications and history are persisted in the database.

The original `seed.json` remains byte-for-byte unchanged: SHA-256 `AF05D0A9E559C6D9E95D1D8C9CC9FADD0D75C9E8EFF55EF2084A431586820F51`.

## Live verification

After restarting the application, the restored staff login succeeded. Verified every one of the 20 attachments returns valid WebP content through the media API and every request's similar-results response contains its four same-location/same-issue peers. Each 7/30/90-day snapshot returns 20 received, 20 open, 0 resolved and 40 recorded confirmations. The four issue rankings each contain five requests, and the location ranking contains Sutherland Building with 20.

Evidence is saved in [DEMO_RESET_VERIFICATION.json](DEMO_RESET_VERIFICATION.json). Actual Dashboard and one detailed request per issue group were captured in ignored `codex/screenshots/live-demo-reset/`; reviewed the Dashboard, full-text chair request with possible matches, and fountain request. No seeded request was completed merely to test the live demo; completion regression tests used the separate test database.
