# CampusFix — Notifications, Staff Analytics & Multi-Worker Intelligence

You are a senior full-stack TypeScript engineer and product designer working on the existing CampusFix application.

Your task is to implement three new capabilities:

1. **Persistent in-app notifications for anonymous reporters**
2. **A comprehensive maintenance analytics dashboard**
3. **Correct multi-worker attribution, statistics, and concurrent operations**

This is an incremental feature update.

**Do not rebuild CampusFix, change its existing design system, or reimplement completed functionality.**

First inspect the current codebase, Prisma schema, API routes, session architecture, report status history, staff authentication, frontend components, and localization.

Integrate the new functionality into the existing architecture.

---

# 1. Fundamental Requirements

The new features must reuse CampusFix's existing:

- Next.js frontend
- Fastify API
- Prisma and PostgreSQL
- Anonymous reporter identities
- Authenticated maintenance staff accounts
- Report and status-history models
- TanStack Query infrastructure
- next-intl localization
- Nunito typography
- Penn State shield branding
- Light and dark themes
- shadcn/ui components
- Responsive layouts
- Icon-only navigation

Do not create a separate design language.

Do not replace existing functionality.

Avoid unnecessary new dependencies.

The implementation must work in a normal browser and inside the existing React Native WebView.

All notifications and analytics must use actual persisted database information.

---

# 2. Reporter Notifications

Implement a persistent in-app notification system.

Notifications belong to anonymous reporter profiles, not individual report pages or browser-local notification arrays.

Each notification has one recipient.

## Notification events

### Event A — Someone upvotes your report

When another anonymous reporter upvotes a report, notify the report's creator.

Example:

**Guest Reporter upvoted your report**

"Broken computer in Sutherland Building"

Another example, when the person has customized their display name:

**Alex Morgan upvoted your report**

"Leaking faucet in Lares Building"

Use the actor's actual display name when available.

If the actor has not customized their name, use the localized equivalent of "Guest Reporter".

Never display random numerical guest names.

Do not display internal IDs.

Do not notify users when they upvote their own reports.

Do not create duplicate notifications when someone retries the same vote.

### Event B — Maintenance accepts a report

Example:

**Daniel Carter accepted your report**

"Broken classroom projector"

### Event C — Maintenance begins work

Example:

**Daniel Carter started work on your report**

"Leaking water pipe"

### Event D — Maintenance resolves a report

Example:

**Sarah Wilson resolved your report**

"Damaged classroom chair"

### Event E — Maintenance rejects a report

Example:

**Daniel Carter rejected your report**

"Broken electrical outlet"

Include an existing rejection reason in the notification detail if available and appropriate.

## Actor names

Notifications must clearly identify who performed the action.

For anonymous reporters:

- Use their customized display name when available.
- Otherwise use "Guest Reporter".
- Never expose technical identity details.

For staff:

- Use the authenticated maintenance worker's actual stored display name.
- Do not use one hardcoded generic maintenance identity.
- Different workers must appear under their own names.

Use the server-verified action actor, not a client-submitted actor name.

Store a safe display-name snapshot or equivalent event presentation data so historical notifications remain understandable.

Display names are labels, not verified legal identities.

## Absolutely no profile browsing

Actor names in notifications must be **plain text**.

Do not create:

- Clickable usernames
- User profile links
- Staff profile links
- Public profile pages
- User-following features
- Reporter directories
- Social account browsing

A notification may link to the affected report, but clicking the actor's name must do nothing.

Do not make the name look like an interactive link.

---

# 3. Notification Database

Inspect the current database architecture before adding anything.

Prefer reusing existing models if they already support these requirements.

Otherwise create a persistent `notifications` table.

Suggested fields:

```text
uuid
recipient_uuid
actor_kind
actor_uuid
actor_display_name
type
report_uuid
event_uuid
payload
created_at
read_at
```

The actual column names and relationships should follow existing CampusFix conventions.

Requirements:

- UUID primary keys.
- Recipient references the existing anonymous reporter profile.
- Actor references the applicable reporter or staff identity where appropriate.
- Actor kind distinguishes reporters from maintenance workers.
- Report references the affected report.
- Notification type is a controlled enum.
- Persist event data needed for presentation.
- Track creation and read timestamps.
- Use existing standard audit fields where required by the current schema.

Do not create a second anonymous identity system.

Do not create new user accounts for notifications.

## Consistency and idempotency

Notifications must be generated by successful backend events.

Never create a notification based solely on a frontend button click.

For upvotes:

- Create one notification for a successful new upvote.
- Ignore duplicate vote attempts.
- Do not notify the actor about their own vote.
- Preserve existing one-vote-per-reporter rules.

For status changes:

- Generate notifications only for actual successful transitions.
- Do not generate notifications for no-op status updates.
- Capture the authenticated staff actor.
- Handle retried requests without generating duplicate events.

Use transactions and an appropriate unique event key or idempotency strategy.

Notifications must not be lost or duplicated because of concurrent requests.

Preserve existing reporting and voting workflows.

---

# 4. Notification API

Implement endpoints using existing API conventions.

Suggested operations:

```text
GET    /api/notifications
GET    /api/notifications/unread-count
PATCH  /api/notifications/:uuid/read
PATCH  /api/notifications/read-all
```

The exact routes may be adapted to the existing API structure.

## Authorization

All notification queries must derive the recipient identity from the server-validated anonymous session.

A reporter must only be able to retrieve and modify notifications belonging to their own profile.

Do not trust a client-supplied recipient UUID.

Do not expose another reporter's notifications.

A maintenance worker must not automatically gain access to arbitrary reporter notification inboxes.

## Pagination

Use pagination or cursor-based loading.

Do not return unlimited notification histories.

Return sufficient information for:

- Notification type
- Actor display name
- Report title
- Report UUID
- Timestamp
- Read/unread state
- Relevant event details

Avoid exposing private session credentials or unnecessary internal records.

---

# 5. Notification User Interface

Integrate notifications into the existing reporter experience.

## Placement

The existing Account/Home page should show a compact notification preview.

Do not add a notification bell to the universal page header.

The current header design must remain unchanged.

Suggested Account section:

**Notifications**

Show the latest three to five notifications.

Include:

- Small event icon
- Actor display name
- Short event message
- Report title
- Relative timestamp
- Unread indicator

Add a subtle "See All" action.

This should open a dedicated notifications page without creating another bottom-navigation destination.

## Full notification page

Create a polished notification inbox.

Requirements:

- Newest notifications first.
- Clear unread/read styling.
- Mark individual notifications as read.
- Mark all notifications as read.
- Open the relevant report.
- Pagination or incremental loading.
- Friendly empty state.
- Contextual loading skeletons.
- Proper error and retry states.

Do not place multiple nested cards inside each other unnecessarily.

Use the same visual styling as existing report cards and grouped settings rows.

## Unread indicator

Display a small unread badge or dot on the existing Account navigation icon.

Do not add another tab.

Use the existing icon-only bottom navigation.

The unread count must reflect the current reporter's notifications.

## Near-real-time updates

Notifications should appear without requiring a manual page reload.

Use an efficient mechanism:

- Prefer existing realtime infrastructure if available.
- Otherwise use TanStack Query polling with a reasonable interval, approximately 20–30 seconds.
- Refresh when the app regains focus or visibility where appropriate.

Do not create unnecessary WebSocket infrastructure solely for this feature.

Do not poll aggressively while the application is inactive.

Use targeted cache invalidation for notification updates.

No full-document reloads.

## Scope limitation

Implement in-app notifications only.

Do not add:

- Firebase Cloud Messaging
- Expo push notifications
- Apple Push Notification service
- Web push subscriptions
- Email notifications
- SMS notifications

Those can be implemented later.

---

# 6. Staff Analytics Dashboard

Create a new dashboard accessible only to authenticated maintenance workers.

This is a **campus-wide operational analytics dashboard**, not a personal profile page.

The dashboard should answer:

- How many maintenance problems are outstanding?
- Where are problems occurring most frequently?
- What kinds of problems occur most often?
- How long does maintenance take?
- Are incoming reports increasing or decreasing?
- Which unresolved issues require attention?

All statistics must be calculated from actual PostgreSQL data.

Never use hardcoded numbers in the finished dashboard.

---

# 7. Staff Navigation

Update the staff's existing icon-only bottom navigation to four destinations:

1. Account
2. Requests
3. Dashboard
4. Settings

Suggested Lucide icons:

```text
Account    → user-round
Requests   → clipboard-list
Dashboard  → chart-no-axes-combined
Settings   → settings-2
```

Do not display text beneath the icons.

Use localized accessible labels and tooltips where appropriate.

Maintain existing navigation styling.

## My Work

The staff member's personal work history should remain accessible from their Account page.

Use a "See All" action or existing personalized work-history view.

Do not delete working My Work functionality.

If My Work was previously a separate tab, move its navigation entry without removing its actual functionality.

The new Dashboard tab is for campus-wide analytics.

---

# 8. Dashboard Design

Use the established premium CampusFix design system.

Do not create a visually separate admin dashboard.

Use:

- Existing Nunito typography
- Existing navy/off-white color palette
- Existing dark-theme tokens
- Consistent page header
- Shared cards
- Existing spacing
- Existing border radii
- shadcn Select, Tabs, and related controls
- Lucide icons

The page should look like the same application as the student Account and Reports pages.

## Mobile layout

Use:

- Compact metric cards in a two-column grid.
- Full-width charts.
- Short, readable chart titles.
- Scrollable report lists.
- Appropriate touch-friendly controls.
- Consistent section spacing.

## Desktop layout

Use:

- Wider metric grids.
- Side-by-side charts.
- More efficient space usage.
- Appropriate maximum content widths.
- Clean, responsive reporting tables or lists.

Avoid giant charts and excessive visual decoration.

---

# 9. Charts — Use Premade Components Only

**Do not build a custom charting library.**

Use the official **shadcn/ui Charts components built on Recharts**.

Reference:

https://ui.shadcn.com/docs/components/chart

Install the official chart component if it does not already exist.

Follow the installed Recharts version's supported APIs.

Use provided primitives such as:

```tsx
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";
```

Use the official supported Recharts primitives for line charts, bar charts, and other required chart types.

Do not manually implement chart plotting with SVG paths, canvas drawing, or custom chart frameworks.

Do not copy unrelated dashboards.

Use shadcn's existing visual conventions.

## Chart appearance

Requirements:

- Minimal gridlines.
- Clear axes.
- Subtle tooltips.
- No unnecessary 3D effects.
- No excessive gradients.
- Consistent legends.
- Theme-aware colors.
- Proper responsive sizing.
- Accessible chart descriptions.
- Localized labels.
- Readable mobile layouts.

Use the existing CSS chart tokens:

```css
--chart-1
--chart-2
--chart-3
--chart-4
--chart-5
```

Do not hardcode an unrelated color palette.

---

# 10. Dashboard Date Filtering

Add a global period selector.

Supported periods:

- Last 7 days
- Last 30 days
- Last 90 days

Default:

**Last 30 days**

The selected period should affect applicable analytics consistently.

Use proper date boundaries and the application's established time-zone handling.

For trend metrics, bucket data according to the selected period.

Avoid misleading comparisons where a selected period includes only part of a day or week.

The filter must update data without a full-page reload.

Use TanStack Query with appropriate query keys and cached results.

For current backlog metrics, explicitly label them as current snapshots rather than implying they represent reports created within the selected period.

---

# 11. Dashboard Core Metrics

Implement the following metrics.

## A. Current Open Requests

Count unresolved reports currently in active, nonterminal states.

Exclude:

- Resolved
- Rejected

Preserve existing status definitions.

Label clearly that this represents the current outstanding backlog.

## B. Resolved Requests

Count reports resolved during the selected reporting period.

Use actual successful resolution events.

Handle reopened reports consistently and document whether repeated resolutions count as separate cycles or unique reports.

Do not silently double-count.

## C. Average Resolution Time

This is a critical requirement.

**Resolution time means the elapsed time between In Progress and Resolved.**

Example:

```text
Reported:     9:00 AM
Accepted:    10:00 AM
In Progress: 11:00 AM
Resolved:     2:30 PM
```

Resolution time:

**3 hours 30 minutes**

Do not calculate it from the initial report creation timestamp.

Use actual stored status-transition timestamps.

Exclude rejected and never-resolved reports.

Do not use frontend clocks or guessed durations.

Display an appropriately formatted duration.

Examples:

- 45 min
- 3h 20m
- 1d 4h

## D. Most Reported Locations

Show the locations with the highest number of reports during the selected period.

Use the recursive campus location hierarchy.

A report belonging to a nested classroom should be counted under the correct top-level building or campus area.

Support buildings, parking lots, and outdoor locations.

Avoid counting a single report multiple times when aggregating ancestors.

If displaying specifically "Most Reported Buildings", exclude nonbuilding locations from that chart.

Use a shadcn horizontal or vertical bar chart.

## E. Most Common Issue Types

Show the most frequently reported maintenance issues.

Examples:

- Computers
- Chairs
- Water pipes
- Electrical outlets
- Projectors

Use actual issue-type taxonomy records.

Use a premade shadcn bar chart.

Do not hardcode a fixed list of displayed results.

## F. Total Upvotes

Show the number of successful upvotes recorded during the selected period.

Count distinct stored vote events, not cached counters blindly.

Do not include duplicate vote attempts.

---

# 12. Reports vs. Resolutions Trend

Add a chart titled:

**Reports vs. Resolutions**

Use a premade shadcn/Recharts line chart.

Display two series:

- Reports created
- Reports resolved

The chart should reveal whether incoming maintenance requests are increasing faster than requests are being resolved.

Use actual timestamps.

Group values by day or week depending on the selected reporting period.

Use a subtle legend and responsive tooltip.

Avoid overcrowded axis labels.

Do not invent chart values.

---

# 13. Waiting Time Analytics

Add:

**Average Time to Start Work**

Definition:

Elapsed time from report creation to the first transition into In Progress.

Example:

```text
Reported:     9:00 AM
In Progress: 11:00 AM
```

Waiting time:

**2 hours**

Use the existing status-history records.

An intermediate Accepted status does not change the starting timestamp for this metric.

Only include reports that actually reached In Progress.

Calculate the average over reports whose first work-start event falls within the selected period.

Do not confuse waiting time with resolution time.

---

# 14. Needs Attention Section

Create a useful staff dashboard section called:

**Needs Attention**

This should surface unresolved reports that deserve staff review.

Include relevant report cards for:

- Oldest unresolved reports
- Highly upvoted unresolved reports
- Reports waiting a long time before work begins

Use existing report information.

Do not create a new AI priority-scoring engine.

Keep prioritization explainable.

Each card should show:

- Report title
- Campus location
- Current status
- Age
- Upvote count
- Reason it is highlighted

Examples:

"Waiting 6 days"

"18 people confirmed this issue"

Clicking a card should open the existing staff report-details page.

Preserve existing backend sorting and authorization.

---

# 15. Problem Hotspots

Implement a focused analytics section:

**Campus Problem Hotspots**

A hotspot represents a location with a notable concentration of maintenance reports.

For example:

```text
Woodland Building
24 reports

Most common issue:
Electrical problems — 11 reports
```

Use the current location hierarchy and issue taxonomy.

Show a small list or compact chart of the top locations and their leading issue groups.

Do not label a location as statistically abnormal unless a real comparison or threshold supports that conclusion.

"Most reported" is sufficient when only ranking by volume.

Do not add AI-generated explanations.

---

# 16. Multiple Maintenance Workers

CampusFix must correctly support **multiple independent maintenance staff accounts working simultaneously**.

Do not design the dashboard as if there is only one maintenance worker.

This is critical.

## Identity

Each maintenance worker must have an independent authenticated account.

Use existing staff account records.

Staff names must come from the database.

Do not hardcode names such as:

"Maintenance Worker"

or:

"Admin"

for all actions.

## Status changes

When a staff member changes a report's status, persist the authenticated staff actor.

For example:

```text
Report created by Guest Reporter.

Daniel Carter accepted the report.

Sarah Wilson started work.

Sarah Wilson resolved the report.
```

The history must accurately identify the person responsible for each transition.

Do not attribute all actions to the currently logged-in worker.

Do not overwrite historical actor information when another worker takes action.

## Personal and global metrics

Clearly distinguish:

**Global dashboard metrics**

Statistics across all maintenance workers and all relevant campus reports.

**Personal staff metrics**

Statistics for the currently authenticated maintenance worker.

Example:

"Resolved by Me" must count reports actually resolved by that worker.

Do not count work performed by another staff member.

Do not confuse report assignment with report resolution.

If an assigned worker differs from the worker who actually resolved the report, preserve both facts correctly.

## Concurrent updates

Multiple workers may open the same report simultaneously.

Prevent stale requests from silently overwriting newer status changes.

Use existing database transaction patterns and appropriate optimistic concurrency or conditional status-transition validation.

For example:

1. Daniel opens a Reported issue.
2. Sarah opens the same issue.
3. Daniel changes it to In Progress.
4. Sarah attempts a stale transition based on Reported.

The backend must detect whether Sarah's requested transition remains valid.

Do not silently overwrite Daniel's change.

Return a meaningful conflict response when necessary.

The frontend should refresh the report and show a localized message.

Avoid duplicate status-history entries or notifications.

## Staff work history

Preserve a truthful history of:

- Who accepted a report
- Who started work
- Who resolved a report
- Who rejected a report
- When each action occurred

Do not assume every report has one permanent worker unless an existing assignment feature explicitly defines that relationship.

---

# 17. Analytics Backend

Implement staff-protected analytics endpoints following existing API conventions.

Suggested endpoint structure:

```text
GET /api/staff/analytics/overview
GET /api/staff/analytics/trends
GET /api/staff/analytics/locations
GET /api/staff/analytics/issues
GET /api/staff/analytics/attention
```

Exact routes may differ if the existing API structure suggests a cleaner approach.

Requirements:

- Authenticate staff on every endpoint.
- Validate reporting-period parameters.
- Aggregate from PostgreSQL.
- Avoid loading all reports into the browser to calculate statistics.
- Handle empty datasets.
- Return stable, typed response shapes.
- Use efficient queries.
- Avoid N+1 query patterns.
- Consider indexes for dates, status, location, actor, and notification recipient.

Do not introduce an external analytics provider.

Do not use artificial chart data.

## Aggregation rules

Define and document each metric consistently.

Use status-history events as the source for transition timestamps.

Avoid using `updated_at` as a substitute for actual lifecycle transition times.

If a report is reopened after resolution, distinguish separate work cycles.

Do not calculate negative durations.

Handle invalid or incomplete historical records defensively.

Make the aggregation semantics consistent between metric cards and charts.

For example, if repeated resolutions count as work cycles in the resolution-time metric, make that clear rather than silently mixing distinct-report counts and cycle counts.

---

# 18. Backend Data Integrity

Reuse existing audit fields and history tables.

Add schema changes only where required.

Recommended considerations:

- Notification recipient indexes.
- Notification read-state indexes.
- Event idempotency constraints.
- Status-history actor references.
- Status-history timestamps.
- Report date/status indexes.
- Efficient location ancestor aggregation.

Use Prisma migrations.

Do not reset or drop the database.

Do not delete existing reports.

Do not overwrite current staff accounts.

Do not recreate the location taxonomy.

Preserve data integrity across migrations.

If a current field already supports a requirement, reuse it rather than creating a duplicate.

---

# 19. Optional Demonstration Data

If the current demonstration database lacks enough variation to meaningfully exercise the new analytics, provide an additive demo-seed extension.

It may include:

- Several fictional staff workers.
- Reports resolved by different workers.
- Varied work-start and resolution timestamps.
- Reports from multiple campus buildings.
- Different issue groups.
- Different upvote counts.
- A mixture of old and recent unresolved reports.
- A small number of notification events.

All records must be fictional.

Seed operations must be idempotent.

Do not reset the existing database.

Do not overwrite real user-created local records.

Do not fabricate staff accomplishments for existing worker accounts.

---

# 20. Localization

All new features must support:

- English
- Spanish
- Arabic
- Russian
- Uzbek

Translate:

- Notification messages
- Actor-action phrases
- Dashboard headings
- Metric labels
- Chart legends
- Chart tooltips
- Date-range selectors
- Empty states
- Loading states
- Error messages
- Status labels
- Relative timestamps
- Accessibility labels

Use structured notification events and translation keys.

Do not store English notification sentences as the only source of display text.

Prefer storing:

- Event type
- Actor display-name snapshot
- Report reference
- Necessary event data

Then render the message using next-intl.

Ensure changing language also changes notification message language.

Preserve proper Arabic RTL handling.

Use locale-aware dates and duration formatting.

Do not translate official campus place names unnecessarily.

---

# 21. Smooth Updates

Both the notification system and the dashboard must feel responsive.

Use existing TanStack Query conventions.

Requirements:

- No hard page reloads during date filtering.
- No hard reloads when marking notifications as read.
- No hard reloads for status updates.
- Stable chart containers.
- Contextual loading states.
- Subtle pending indicators.
- Appropriate cache invalidation.
- Preserve previously loaded data during refetch when suitable.
- Avoid unnecessary component remounting.
- Avoid duplicate backend requests.

Do not replace whole pages with skeletons for every minor update.

Avoid polling the entire dashboard continuously when there is no need.

Refetch analytics when relevant changes occur or when the page regains focus, using sensible freshness settings.

---

# 22. Testing

Implement tests for the new functionality.

## Notification tests

Verify:

1. Reporter A creates a report.
2. Reporter B upvotes it.
3. Reporter A receives a notification.
4. The notification identifies Reporter B by display name.
5. Reporter B cannot read Reporter A's notifications.
6. A repeated vote does not generate duplicate notifications.
7. Staff changes the report's status.
8. Reporter A receives a status notification.
9. The status notification identifies the correct staff worker.
10. Marking a notification as read persists.
11. Clicking the notification opens the correct report.
12. Actor names are plain text, not profile links.
13. The existing anonymous ownership system remains intact.

## Multiple worker tests

Use at least two fictional staff identities.

Verify:

1. Staff A accepts a report.
2. Staff B starts work.
3. Staff B resolves the report.
4. Each action is attributed to the correct worker.
5. Personal resolution metrics reflect only actual worker actions.
6. Global metrics include all relevant workers.
7. Concurrent stale transitions are handled safely.
8. Historical actor information remains correct.

## Analytics tests

Verify:

- Current open-request count.
- Resolved count.
- Average resolution time.
- Average waiting time.
- Most reported locations.
- Most common issue types.
- Total upvotes.
- Date filtering.
- Problem hotspots.
- Oldest unresolved reports.
- Empty datasets.
- Rejected-report exclusion.
- Reopened-report handling.

Create a deterministic test case such as:

```text
Reported:     09:00
Accepted:     10:00
In Progress: 11:00
Resolved:     14:30
```

Expected:

```text
Waiting time:     2 hours
Resolution time:  3 hours 30 minutes
Total turnaround: 5 hours 30 minutes
```

Make sure the backend calculates these correctly.

## Visual tests

Inspect mobile and desktop screenshots.

Suggested viewports:

- 375 × 812
- 390 × 844
- 430 × 932
- 1440 × 900

Check:

- Notification layout.
- Unread indicators.
- Dashboard metric cards.
- Chart responsiveness.
- Long location names.
- Dark-theme rendering.
- Arabic RTL.
- Empty states.
- Mobile navigation.

Use actual browser screenshots where available.

---

# 23. Strict Scope Boundaries

Do not:

- Redesign the entire application.
- Replace the current theme.
- Change typography.
- Modify the student report creation process unnecessarily.
- Replace authentication.
- Create public user profiles.
- Make notification actor names clickable.
- Introduce social following.
- Add push notifications.
- Introduce cloud services.
- Add an external analytics service.
- Build custom chart rendering logic.
- Create another frontend.
- Remove existing staff features.
- Reset the database.
- Change unrelated APIs.
- Modify VINDEX.

Implement only the new features and directly necessary supporting changes.

---

# 24. Implementation Order

Follow this order:

1. Inspect the existing database, status history, staff identity, and anonymous reporter architecture.
2. Add notification persistence and idempotent event creation.
3. Implement secure notification API endpoints.
4. Implement Account notification preview and full notification inbox.
5. Implement unread indicators and background refresh behavior.
6. Verify multi-worker action attribution and concurrency safety.
7. Implement the analytics aggregation service and API endpoints.
8. Install or reuse official shadcn/Recharts chart components.
9. Build the staff dashboard using existing design-system components.
10. Integrate the new Dashboard navigation destination.
11. Preserve personal staff work history through the Account page.
12. Complete all five translations.
13. Add deterministic tests and optional additive demo data.
14. Run visual verification and quality checks.
15. Fix regressions.

Do not stop after producing a plan.

Implement the changes directly in the existing repository.

---

# 25. Final Acceptance Criteria

The update is complete when:

- Report creators receive persistent notifications for new upvotes.
- Report creators receive notifications for successful status changes.
- Notifications display the correct reporter or maintenance worker name.
- Actor names remain plain text without profile navigation.
- Notifications support read/unread states.
- Notifications open the corresponding report.
- Unread indicators update without full reloads.
- Staff have a dedicated analytics dashboard.
- Dashboard metrics are computed from the actual database.
- Charts use official shadcn/ui and Recharts components.
- Most reported locations and issue types are visible.
- Average waiting and resolution durations are accurate.
- Reports versus resolutions trends are displayed.
- Needs Attention highlights actionable unresolved reports.
- Problem hotspots use real location and issue data.
- Multiple staff accounts are supported correctly.
- Every status transition records the responsible authenticated worker.
- Global and personal work metrics are properly separated.
- Concurrent staff changes cannot silently overwrite each other.
- Existing CampusFix design remains consistent.
- All five languages work.
- Arabic RTL remains supported.
- Mobile and desktop layouts are polished.
- Relevant tests and production builds pass.

At completion, provide a concise implementation report, including:

- Database changes
- Notification behavior
- Dashboard metrics
- Charts implemented
- Multi-worker handling
- Tests executed
- Screenshots reviewed
- Any remaining limitations

**Build a dashboard that helps maintenance staff make better decisions, and a notification system that keeps students informed without requiring conventional user accounts.**

Proceed with implementation.
