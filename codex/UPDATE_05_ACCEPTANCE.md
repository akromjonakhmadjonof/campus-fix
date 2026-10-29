# Update 05 acceptance report

Date: 2026-10-29. Scope: the supplied [maintenance staff redesign brief](UPDATE_05_BRIEF.md). The existing student interface remains the design reference. This update supersedes Update 04's staff navigation while preserving the student destinations.

## Implemented

- Dedicated email/password login: 43/57 desktop split, navy Penn State shield branding, warm theme-aware grid and a 440px form. Mobile uses one panel with 24px horizontal padding. Existing Input styling, accessible password visibility, localized validation, pending feedback and a synchronous duplicate-submit guard are included. The login has no application navigation or registration/social-login controls.
- Preserved backend password verification, session cookies, rate limits and authorization. Protected staff routes mount only after the existing session endpoint verifies access. Successful authentication uses client navigation to a validated local destination, defaulting to Staff Account. Credentials are not retained as query mutation variables; the form resets after successful login.
- Shared PageHeader, ProfileSummary/ProfileAvatar, RecentReport, IssueCard, status timeline, settings rows, Input, Textarea, Radix Dialog and four-icon navigation. The [component audit](UPDATE_05_AUDIT.md) records the prior inconsistencies and reuse decisions.
- Staff Account shows the authenticated display name, initials fallback and localized role. Resolved by Me requires the stored resolver plus a matching staff resolution event. Recent work shows the actual resolution timestamp and links to staff details. The second metric explicitly counts open requests across campus.
- Account, Requests, My Work and Settings use the established icon rail on mobile and desktop. My Work reuses the personal resolved-history route. No assignment model or unsupported profile editing was introduced.
- Maintenance Requests retains existing search, filters, URL state, sorting, priority rules and TanStack Query behavior, with issue-type metadata in shared cards. Filtered empty history is distinguished from an account with no completed work.
- Staff details reuse the regular report presentation. Accept, start work and resolve retain their backend rules. Rejection uses the existing Dialog primitive with a required reason, cancel action and an alternate terminal outcome timestamp. Duplicate detection is unchanged.
- Shared Settings displays the real staff account and existing language/theme/motion preferences. Sign Out invalidates the backend session, removes staff cache entries and preserves anonymous reporter identity and device preferences.
- English, Spanish, Arabic, Russian and Uzbek cover all changed labels, errors and accessibility text. Arabic retains the existing RTL behavior and font fallback; official location names remain unchanged.

## Verification

| Check                                    | Result                                       |
| ---------------------------------------- | -------------------------------------------- |
| Repository Prettier                      | PASS                                         |
| ESLint, all workspaces                   | PASS                                         |
| TypeScript, all workspaces               | PASS                                         |
| API unit and real PostgreSQL integration | 24 PASS                                      |
| Preserved backend tests                  | 9 PASS                                       |
| Web unit, locale and route-safety tests  | 25 PASS                                      |
| API and Next.js production builds        | PASS                                         |
| Complete Playwright regression           | 31 PASS, 3 redundant mobile matrices skipped |
| Final affected-browser rerun             | 7 PASS, 1 redundant mobile matrix skipped    |

There are **58 passing unit/integration tests and 31 distinct passing browser checks**. The final browser rerun used the final production build and covered the full creator/staff lifecycle, login, logout, personal history, rejection and the staff visual matrix after the credential/cache refinements. The other 24 browser checks passed in the preceding complete run.

Functional assertions include valid/invalid credentials, localized validation, show/hide password without losing its value, duplicate-submit prevention, safe intended destinations, no protected-content flash, no hard document reloads, four accessible staff destinations, actual worker identity/counts/resolution dates, real backend logout, preserved anonymous identity/preferences, and reasoned rejection without resolution credit. Existing reporting, ownership, voting, pairing, sorting/filtering and complete accepted/start/resolved workflows also passed.

An initial database run launched during build/browser activity exceeded the default five-second login-test timeout, causing two dependent assertions to fail. The suite was rerun alone with `RUN_DB_TESTS=1` and `--testTimeout=15000`; all 24 tests passed in 5.11 seconds overall. No authentication rule or assertion was weakened. The ordinary root test command omits database cases unless that explicit flag is enabled, so database results above come from the separate enabled run.

## Visual review

The staff screenshot matrix covers **375x812, 390x844, 430x932, 768x1024 and 1440x900**, English light and Arabic dark layouts, plus login validation in all five languages. Browser assertions check shared header typography, four accessible navigation links, absence of horizontal overflow and sign-out clearance above the navigation after scrolling.

Representative captures were opened and visually inspected, including:

- [Desktop login](screenshots/update05/en-login-light-1440.png) and [mobile login](screenshots/update05/en-login-light-390.png).
- [Mobile Account](screenshots/update05/en-account-light-375.png) and [desktop workspace](screenshots/update05/en-account-light-1440.png), compared with the existing [student Account](screenshots/update04/en-account-light-390.png).
- [Requests](screenshots/update05/en-requests-light-430.png), [details](screenshots/update05/en-details-light-375.png) and [tablet My Work](screenshots/update05/en-my-work-light-768.png).
- [Arabic dark Account](screenshots/update05/ar-account-dark-430.png), [tablet login](screenshots/update05/ar-login-dark-768.png), [Settings](screenshots/update05/ar-settings-dark-390.png) and [rejection dialog](screenshots/update05/ar-rejection-dialog-mobile.png).
- [Empty personal history](screenshots/update05/en-staff-empty-state.png), [Spanish validation](screenshots/update05/es-login-validation-390.png) and [Russian validation](screenshots/update05/ru-login-validation-390.png).

The empty-account screenshot uses a controlled browser response fixture. Separate real-PostgreSQL assertions verify that a newly created test worker has zero resolved work and that only the actual resolving worker receives credit. Other screenshot records come from the isolated test database; they are not inserted into the demo database by this update.

## Data preservation and limits

- No database reset, reseed, schema migration or dependency change was performed for Update 05. No other project was modified. Demo verification still shows **25 reports and 281 locations**.
- The primary location source `seed.json` retains SHA-256 `af05d0a9e559c6d9e95d1d8c9cc9fadd0d75c9e8eff55ef2084a431586820f51`.
- Browser emulation covers responsive layout and interactions. Physical iOS/Android keyboards and React Native WebView safe-area behavior still require real-device verification; no pixel-perfect or physical-device claim is made.
- The installed PostgreSQL driver emits a non-failing concurrent-query deprecation warning during integration testing.
- Staff account changes remain administrator-managed. There is no supported assignment subsystem, so the UI does not claim personal active assignments.

Earlier acceptance reports remain historical records: [original phases](ACCEPTANCE.md), [student design refinement](REFINEMENT_ACCEPTANCE.md) and [Update 04](UPDATE_04_ACCEPTANCE.md).

Local restart smoke check: API health `ok`, 25 demo reports, 281 locations and HTTP 200 from `/en/staff`. The application is left running at [the staff workspace](http://localhost:3000/en/staff) on the demo database; the Codex browser-open request was queued successfully.
