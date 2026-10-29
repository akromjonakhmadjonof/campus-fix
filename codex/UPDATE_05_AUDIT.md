# Update 05 shared-component audit

Scope: [owner-provided staff brief](UPDATE_05_BRIEF.md). The existing student interface is the source of truth. No database reset, reseed, migration, dependency upgrade, or authentication-provider change is part of this update.

| Area inspected    | Previous inconsistency                                                                   | Applied approach                                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login             | Ordinary report form inside the app shell; no dedicated responsive composition           | Dedicated 43/57 desktop split, navy branding, warm theme-aware grid, single-panel mobile layout, existing Input primitive, password toggle and inline localized errors; no bottom navigation |
| Staff page chrome | Extra welcome/logout strip above the shared page header                                  | Shared PageHeader alone; logout moves to Settings                                                                                                                                            |
| Account           | Generic pairing-card container with email and large navigation buttons                   | Extracted shared ProfileSummary around the existing ProfileAvatar; staff initials and actual account name; no unsupported edit control                                                       |
| Metrics           | Counts mixed into navigation buttons                                                     | Compact surface cards with personal resolved count and explicitly campus-wide open count; no assignment claims                                                                               |
| Recent work       | Full feed cards using report creation dates                                              | Shared compact RecentReport variant showing the resolution event date; staff detail links and personal work-history destination                                                              |
| Requests          | Shared feed already existed                                                              | Kept ExploreScreen, filters, URL state, priority rules, statuses, images and cache behavior; added localized issue type metadata for staff                                                   |
| Details           | Shared report presentation already existed; plain note field and immediate reject action | Kept common photos, location, timeline, statuses and duplicates; reused Textarea and Dialog for reasoned rejection; explicit rejected timestamp                                              |
| Settings          | Shared preferences existed without staff account section                                 | Same SettingsScreen, grouped rows and locale/theme controls, plus actual staff ProfileSummary and backend sign-out                                                                           |
| Navigation        | Staff inherited the student Create Report destination                                    | Same four-icon rail with Account, Requests, My Work and Settings; shared geometry and focus styling                                                                                          |
| Access state      | Inline login on protected screens; detail protection relied on API errors                | Shared staff route guard waits for backend session verification before mounting protected content; safe local return destination                                                             |

## Data semantics

`resolvedById` is written by the existing resolution transaction. Personal history now additionally requires a matching immutable `RESOLVED` event with the authenticated staff actor. Deleted reports are excluded from counts. The API exposes `resolvedAt` from the event; My Work's newest/oldest ordering uses the terminal transition's update time. Other queue ordering rules are unchanged. A contradictory status filter on personal history returns no results.

There is no staff assignment or editable staff avatar/name API. The interface therefore uses account initials, shows administrator-managed details, and omits assigned-work controls. The campus-wide open metric is explicitly labeled. No fictional work is inserted by the UI.

## Shared styling

The implementation keeps the existing Nunito typography, Arabic font fallback, Penn State shield, semantic theme tokens, radius scale, small shadows, shared cards, NProgress and reduced-motion behavior. The navy branding surface uses the existing light-theme brand color consistently in both themes. New CSS concerns layout, compact staff metrics and authentication composition; it does not establish a separate staff theme.
