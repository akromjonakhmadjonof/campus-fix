# PHASE 01 — PRODUCT REQUIREMENTS, UX FLOWS, ROLES AND ROUTES

Read this before DB/API/UI work. Translate it into a short implementation checklist in `codex/IMPLEMENTATION_LOG.md`; then build, not merely document.

## Product vocabulary

- **Anonymous profile**: a server-side pseudonymous principal representing one or more explicitly linked browser/WebView installations. No names/email/student IDs.
- **Session**: cryptographic browser/app-installation credential, stored in a secure `HttpOnly` cookie where supported. Authorizes one anonymous profile. Multiple sessions may point to the same profile via intentional pairing.
- **Staff**: a password-authenticated maintenance worker with separate permissions; first/last display name or preferred full name, email, secure hash. Created/disabled via CLI/admin DB operations, never self-registration.
- **Location**: recursive campus place; root items include buildings, lots, athletic facilities and landmarks, all peers. A report can select _any_ selectable node.
- **Issue group**: broad grouped selector (`Classroom & Furniture`, `IT & Computing`, `Plumbing`, `Electrical & Lighting`, `Doors & Building`, `Cleaning & Safety`, `Grounds & Parking`, `Other`).
- **Issue type**: specific reportable thing (`chair`, `computer`, `pipe`, etc.), belonging to one group. Optional `other` with required free-text label.
- **Report**: a public maintenance ticket, not an account/private message. Has one reporter profile, one location node, group/type, description, precise position details, optional photos, current status, vote count and history.
- **Upvote/confirmation**: one anonymous profile confirms an existing report. It's not a staff acceptance and must not alter report status.

## Client routing — anonymous visitors

Root `/` redirects to the detected locale's **Account** (not to a dashboard of campus-wide reports). Locale prefix mandatory: `/en/...` or `/es/...`.

- `/{locale}` — **My Account**: minimal profile summary (anonymous profile short ID, app/browser platform from non-sensitive client info, linked sessions count if known, anonymous profile creation date, current device/session activity as available), settings entry/sections (language, theme, reduced motion, account linking), **most recent 3–5 reports created by this profile only** and `See all my reports` action. Do not display email/name or guess specific phone model. Clear CTAs: `Create report`, `Browse reports`.
- `/{locale}/reports` — **Reports feed**: all publicly visible reports from all anonymous profiles; social-style cards, thumbnails, metadata, status, vote count, upvote action, filter pills and search. Support `scope=mine` to show only own reports when arriving from Account `See all`; show filter state clearly and let user return to `All`. Search by title, description, type and location; filter status, group, nested location, sorting (recent, most confirmed, oldest, status). Pagination or infinite scroll with deterministic ordering. Owners can see `Mine` label and an edit affordance; strangers see view/upvote only.
- `/{locale}/reports/new` — **Create report**: location selector (root → optional children), issue group → issue type, title, detailed description, exact identifying position text, photo input/previews; duplicate suggestions appear _before pressing final submit_ once sufficient inputs are present, and also checked on submit. Each suggested card shows reason, photo if any, status, location, votes; open detail or confirm/upvote; `Create anyway` remains possible, with explicit acknowledgment if high confidence duplicates are shown. Confirming an existing report should not create a new one.
- `/{locale}/reports/{id}` — **Report details**: report header, image carousel/gallery, precise location breadcrumb, object/type, description, status badge, **visible progress bar with labeled stages**, timeline of real status events, current votes, upvote/undo vote if eligible, similar reports suggestions when relevant; edit allowed only for creator while status `reported`. Others only read/upvote, no edit/status actions.
- `/{locale}/reports/{id}/edit` — protected creator form for editable fields while `reported`, with server authorization and attachment changes; rejected/accepted/in-progress/resolved not editable by student. If not owner, return 403 on API and render not permitted, never fake the gate purely in UI.
- `/{locale}/settings` — optional dedicated settings screen or section from Account; same theme/language/linking controls available without an extra bottom tab. Keep minimal; user explicitly wants settings in account.
- `/{locale}/link` — optional account linking flow; can be an Account dialog/sheet rather than extra page.

### Mobile navigation

Bottom tabs **Account (default), Reports, Create**. The report detail and edit views preserve navigation context; avoid duplicate tabs and fake iPhone status bars. Settings opens from Account. Bottom tabs must have safe-area padding and clear active indicators. No mandatory fourth `Profile/Settings` tab.

### Desktop navigation

Adaptive premium header/sidebar with Account, Reports, Create. Staff context gets its own navigation. This is the exact same Next.js app. Do not merely stretch a mobile phone frame across desktop. No separate frontend or duplicated business logic.

## Staff routing

- `/{locale}/staff/login` — email + password sign-in, no public signup/forgot-password service. Provide generic failure messages and sensible protection.
- `/{locale}/staff` — **Staff Account/Home**: fictional worker profile, summary of their assigned/current/resolved work, small list of recently resolved reports, link to all their solved tickets, navigation to Requests and settings.
- `/{locale}/staff/requests` — **Open requests queue**: only unresolved reports by default (`reported`, `accepted`, `in_progress`). Default sorting **most upvotes first, oldest first as tie-breaker**; visible sort controls `Oldest first`, `Newest first`, `Most confirmed`, optional category/location/issue type and status filters. Show priority from transparent issue data if captured; never fabricate emergency scores. Include status, age, count, exact location and small image.
- `/{locale}/staff/requests/{id}` — ticket workbench: full details, exact location, images, comments/history, vote count, **potential duplicates in a separate compact section**, staff actions according to transition rules, optional assign to self, decision notes. Follow optimistic UX only if data is durably saved; refresh all data on successful mutation.
- `/{locale}/staff/resolved` — tickets resolved by this maintenance worker. Include search/filter and meaningful resolution notes.
- `/{locale}/staff/settings` — appearance/language/worker identity view; password change only if fully implemented securely, otherwise omit it.

## States and progress indicator

Authoritative status enum and transitions:

- `reported` — newly submitted, awaiting review (public display **Reported / Reportado**).
- `accepted` — staff confirms ticket validity and accepts it (**Accepted / Aceptado**).
- `in_progress` — maintenance work underway (**In Progress / En progreso**).
- `resolved` — work finished; staff supplies a required resolution note (**Resolved / Resuelto**).
- `rejected` — ticket cannot proceed; staff supplies a required visible reason (**Rejected / Rechazado**).

Allowed staff transitions: `reported → accepted`, `reported → rejected`, `accepted → in_progress`, `accepted → rejected`, `in_progress → resolved`. Optionally staff can `reported → in_progress` directly for efficient demo only if logged with an explanatory transition. No anonymous status changes; do not allow transitions from `resolved`/`rejected` without explicitly implementing a documented reopen action and immutable history. Students can edit report contents only in `reported`. Do not use both `pending` and `reported` as independent statuses.

**Progress bar:** use named milestones, not a fake repair completion percentage: Reported → Accepted → In Progress → Resolved. The bar fills based on actual completed _workflow stages_. Rejected state is a distinct red stop state, **not 100% progress**. Show real event dates/times, who acted in role-safe terms (e.g. `Maintenance staff`, no unnecessary staff private data), and a clear current status. The brief requires the key `Reported → In Progress → Resolved` path; the extra `Accepted` step must not make it harder to demonstrate.

## Ownership and permissions matrix

| Operation                              | Anonymous profile                        | Original reporter      | Staff                                  |
| -------------------------------------- | ---------------------------------------- | ---------------------- | -------------------------------------- |
| Browse all public reports and statuses | Yes                                      | Yes                    | Yes                                    |
| Create report                          | Yes                                      | Yes                    | If useful, yes                         |
| Vote a report once                     | Yes, except self                         | Yes, except own report | Read-only or no vote                   |
| See own reports in Account             | Own only                                 | Own only               | Own staff data                         |
| Edit report while `reported`           | No                                       | Yes                    | May correct/moderate if logged         |
| Edit report after accepted             | No                                       | No                     | Restricted staff actions               |
| Withdraw/hard delete                   | No by default                            | Not required           | No hard delete; archive if implemented |
| Transition status                      | No                                       | No                     | Yes, authorized transitions            |
| View/work the staff queue              | No                                       | No                     | Yes                                    |
| Create staff account in UI             | No                                       | No                     | No; CLI/admin only                     |
| Link anonymous sessions                | With both clients' explicit confirmation | Same                   | Not applicable                         |

The API enforces all permissions, not just hidden buttons. Anonymous report ownership is about server-side credentials, not `deviceId` claims from the client.

## Interactions that must actually work

- Report details from every card; account `See all` opens feed in `mine` mode.
- Upvote and undo upvote update DB and counts; handle two tabs/concurrent requests correctly with uniqueness constraints.
- Images upload and load across server restart, through stable media URLs.
- Location chooser shows nesting and breadcrumb, supports root-only selection and `Other / not listed` in descriptions, never requires nonexistent room.
- Grouped issue-type selection reflects DB seed (no hardcoded independently divergent list).
- Duplicate suggestions update as location/type/text changes, debounce + cancellation; final create rechecks to avoid stale suggestions. Suggestion ≠ automatic rejection.
- Staff actions persist statuses and timeline; reporter sees changes upon refresh (real-time websockets not mandatory). Poll/refetch if desired for freshness, but don't mislabel polling as push notifications.
- Settings language changes route while preserving context; theme system/dark/light works; motion preference persists and respects OS.
- 0 reports, empty search, network unreachable, upload failure, permission denial, unauthorized staff access, rejected ticket, and invalid token have dedicated non-deceptive feedback.

## Visual tone

Follow reference image: very light neutral app background; compact rounded white surfaces, pale separators, tightly controlled blue accent, Lucide icons, small clear titles and fine typography, tasteful status chips and premium bottom tabs. Apple's design _quality_ is the aim, not a direct copy of Apple's copyrighted assets. Motion is subtle; honor reduced motion. Desktop is polished, spacious, and task-focused.

## Deliberate non-goals

No Penn State SSO, real student identity capture, notifications without actual delivery, direct real university database integration, unverified asset inventory/QR scanning, live map requirement, public moderation by students, AI API dependence, native app business screens, or speculative admin organization tree.
