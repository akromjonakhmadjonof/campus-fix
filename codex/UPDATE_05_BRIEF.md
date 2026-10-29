# CampusFix — Maintenance Staff Experience & Authentication UI Redesign

You are a senior product designer and frontend engineer specializing in premium, responsive application interfaces.

Your task is to redesign and refine the **existing CampusFix maintenance staff experience** so it looks, feels, and behaves like a natural part of the recently redesigned student application.

**This is an incremental update to an existing working application.**

Do not rebuild the project. Do not recreate completed features. Do not change unrelated functionality.

Focus specifically on:

1. Maintenance staff login page.
2. Maintenance staff Account/Home page.
3. Maintenance Requests page.
4. Staff report details and management interfaces.
5. Staff Settings page.
6. Shared visual consistency between student and maintenance interfaces.
7. Responsive mobile and desktop behavior.

---

# 1. Core Design Principle

CampusFix must feel like **one application with two different user experiences**, not two unrelated applications.

There are two experiences:

**Student / Anonymous Reporter**
- Personal account
- Reports
- Create report
- Settings

**Maintenance Staff**
- Personal staff account
- Maintenance requests
- Personal work history
- Settings

The interfaces may display different content and actions, but they must share the same:

- Brand identity
- Typography
- Colors
- Spacing system
- Border radii
- Component styling
- Header system
- Navigation patterns
- Animations
- Responsive behavior
- Theme system

**The existing redesigned student interface is the visual source of truth.**

Inspect its actual components before modifying the maintenance interface.

Reuse the same shared design-system primitives wherever possible.

Do not create a second independent set of staff-only UI components when existing shared components can be reused.

---

# 2. Maintenance Staff Login — Visual Reference

The required login design is inspired by a premium two-panel authentication screen.

I will describe the reference precisely.

## Desktop composition

At desktop sizes, the login page uses a full-height, two-column layout.

### Left panel — Branding

Approximately 40–45% of the viewport width.

Use a solid deep navy surface based on the existing CampusFix primary color.

The panel should feel elegant, calm, and intentionally minimal.

At the top-left:

- Actual Penn State shield/lion logo, without the Penn State text wordmark.
- CampusFix product name may appear as separate interface typography.
- Comfortable outer padding.

Around the vertical center:

- Small rounded icon container with a relevant maintenance or campus-service icon.
- Large, elegant headline.
- Short supporting text.
- Optional subtle security or trust statement with a small icon.

Suggested copy:

**Headline:**

"Keeping campus running."

**Description:**

"Manage maintenance requests, track progress, and help keep Penn State Abington in working order."

**Supporting statement:**

"Authorized facilities staff access"

Do not copy the VINDEX branding, wording, vehicle references, or unrelated content.

The text must have excellent contrast against the navy background.

Use restrained typography and generous whitespace.

Avoid illustrations, excessive decoration, or unnecessary cards.

### Right panel — Authentication

Approximately 55–60% of the viewport width.

Use the existing warm off-white background color:

`rgb(251, 250, 247)`

Add a very subtle square grid pattern behind the form.

The grid should consist of thin, low-contrast lines.

Suggested treatment:

- Approximately 48–56px grid spacing.
- Very subtle line opacity.
- No strong color contrast.
- No distracting grid overlays.
- Theme-aware appearance.

Use the grid as a decorative background, not as an interactive element.

Center a narrow authentication form horizontally and approximately vertically.

Maximum form width should be around 420–460px.

Do not place the form inside a large elevated card.

The form should feel integrated into the page background, like the reference.

## Form heading

Small uppercase eyebrow text:

"CAMPUSFIX STAFF"

Use subtle letter spacing and the existing primary color.

Main heading:

"Welcome back."

Supporting description:

"Sign in to manage campus maintenance requests."

The copy should feel professional, friendly, and concise.

Do not create an exaggerated marketing headline.

---

# 3. Staff Login Form

The login form must contain exactly the necessary authentication fields.

## Email

Label:

"Email address"

Use the existing premium shadcn Input styling.

Requirements:

- Email input type.
- Appropriate autofill attributes.
- Required validation.
- Localized errors.
- Visible focus state.

## Password

Label:

"Password"

Use a password input with a small show/hide visibility control inside the field.

Requirements:

- Correct password input behavior.
- Toggle visibility without clearing the value.
- Keyboard accessibility.
- Proper accessible labels.
- Required validation.

## Submit button

Use one prominent primary button:

"Sign in"

Requirements:

- Full width.
- Existing navy primary color.
- Appropriate hover and pressed states.
- Disabled or loading state during submission.
- Proper pending feedback.
- No duplicate submissions.

Use the existing backend maintenance authentication flow.

Display invalid-credentials errors cleanly without exposing sensitive details.

## Remove unnecessary authentication elements

The maintenance login page must NOT contain:

- Continue with Google
- OAuth providers
- Create account
- Sign up
- Register
- Social login
- Passwordless login
- Guest login
- An "OR" separator
- Forgot Password unless a real password-recovery flow already exists

There is no public staff registration.

Maintenance accounts are created through the existing backend/database administration process.

Do not create a signup page or signup endpoint.

Do not change the existing authentication architecture.

## Login navigation

After successful authentication:

- Navigate to the maintenance Account/Home page.
- Preserve any existing safe intended-destination behavior where applicable.
- Update authentication state without a hard document reload.
- Avoid flashing protected staff content before authorization completes.

The login page should not display the normal application bottom navigation.

---

# 4. Mobile Login Layout

The mobile version must closely resemble the mobile reference.

At narrow screen widths, remove the separate left branding panel.

Show a single full-height warm off-white page.

Maintain the subtle grid-pattern background.

Layout order:

1. Penn State shield/lion mark and CampusFix branding.
2. Small uppercase staff-access eyebrow.
3. Large welcome heading.
4. Short supporting description.
5. Email input.
6. Password input.
7. Sign-in button.

Use deliberate vertical spacing.

Suggested page padding:

20–24px horizontally.

Do not make the form excessively narrow or surround it with oversized cards.

The inputs should be comfortably touchable.

The login button should feel prominent without using exaggerated rounding.

Handle mobile keyboard appearance correctly.

The form should remain usable inside:

- Mobile Safari
- Chrome for Android
- React Native WebView

Use the existing Nunito typography, not VINDEX's font configuration.

---

# 5. Maintenance Staff Account/Home Page

This is the most important staff-page redesign.

The maintenance Account page should be visually similar to the existing student Account page, but personalized for maintenance work.

**Do not create an unrelated administrative dashboard.**

Use the student Account page as the design reference.

## Staff profile card

At the top, show a premium profile card with:

- Circular avatar
- Maintenance worker's actual display name
- Role label
- Small, concise secondary description

Example:

**Alex Morgan**

Maintenance Staff

Penn State Abington Facilities

This is fictional example content, not a hardcoded account.

Use the actual authenticated staff account data.

Do not show raw internal identifiers.

Use the same avatar styling, card spacing, typography, and edit affordances as the student profile card where suitable.

If profile editing is supported, reuse the existing approach.

Do not introduce student-style anonymous guest identity into the authenticated staff profile.

## Maintenance statistics

Below the profile card, display a small set of useful personal work metrics.

Suggested:

- Resolved by Me
- Currently Working On
- Pending Requests

Only display statistics supported by existing backend records.

"Resolved by Me" must mean the current staff member actually performed the resolution transition, based on the stored actor/status history.

Do not count every resolved report on campus as resolved by the current employee.

For "Currently Working On," use explicit staff assignment when available.

If staff assignment does not exist, do not pretend that a report belongs to the current worker. Prefer another truthful existing metric.

Use the same card language and compact metric styling as the student side.

Avoid gigantic KPI cards or an unnecessarily complicated dashboard.

## Recently Resolved by Me

Create a section:

"Recently Resolved"

Subtitle or supporting context may clarify that these were resolved by the current staff member.

Display compact report cards using the existing shared ReportCard component or a closely related variant.

Each record should show:

- Report title
- Location
- Small thumbnail
- Resolved status
- Resolution date

Include a subtle:

"See All"

The action should open the staff work-history view, filtered appropriately.

Do not route this action to an unrelated public report list.

Use real database records.

Do not display fictional completed work for a real authenticated staff account.

Provide a polished empty state when the staff member has not resolved anything yet.

## Active Work

If the current implementation supports staff assignments, include an additional concise section showing active assigned requests.

Do not introduce a complex new assignment subsystem solely to support this UI.

If assignments are unsupported, omit that section.

---

# 6. Maintenance Staff Navigation

The maintenance experience should use the same premium navigation system as the student experience.

On mobile, use the same icon-only bottom navigation component, styling, sizing, animation, and safe-area behavior.

Recommended staff navigation:

1. Account
2. Requests
3. My Work
4. Settings

Suggested Lucide icons:

- `user-round`
- `clipboard-list`
- `check-check`
- `settings-2`

No visible text labels underneath the icons.

Provide translated accessible labels.

"My Work" should display existing personal staff activity or work-history data. It does not require inventing a separate complex workflow.

Reuse existing staff routes and filtered views where practical rather than unnecessarily duplicating pages.

On desktop, adapt to the same style of sidebar or navigation layout used by the student application.

Do not retain an old-looking staff navigation system.

Do not create a separate staff-only visual theme.

---

# 7. Maintenance Requests Page

Redesign the existing staff Requests page to match the premium student Reports page.

It should feel like the same ticket-feed interface with additional staff capabilities.

## Visual design

Reuse:

- Page header
- Typography
- Card styles
- Status badges
- Location display
- Filter controls
- Search fields
- Icons
- Spacing
- Empty states
- Loading skeletons
- Motion effects

Do not render the staff queue as a generic old-fashioned admin dashboard.

## Request cards

Each request should show:

- Issue title
- Short description
- Campus location
- Issue group and type where appropriate
- Photo thumbnail
- Report age
- Current status
- Upvote count

Use clear visual hierarchy.

Avoid overcrowding cards with too many buttons.

Opening a request should reveal the available maintenance actions on the details page.

## Sorting and filtering

Preserve existing staff sorting and filtering functionality.

The queue should continue to support unresolved requests and existing priority rules.

Maintain existing filtering by relevant fields such as:

- Status
- Location
- Category
- Issue type
- Report age
- Upvotes

Do not rewrite the queue prioritization algorithm unless necessary to repair a bug introduced by the redesign.

## Smooth interactions

Filtering and sorting must update the relevant content without full-document reloads.

Preserve TanStack Query behavior and existing URL/filter state handling.

Use contextual loading states.

Avoid unnecessary skeleton flashing and scroll jumps.

---

# 8. Maintenance Report Details

The maintenance report details page must visually match the regular student report details page.

Use the same shared visual components for:

- Report title
- Photos
- Description
- Location hierarchy
- Issue group/type
- Status badge
- Progress timeline
- Related reports
- Duplicate suggestions
- Supporting metadata

Staff should see the same underlying report presentation as students.

The difference is the maintenance action area.

## Staff actions

Preserve existing working actions, including applicable:

- Accept request
- Reject request
- Begin work
- Resolve request
- Update status

Use the current backend's actual status-transition rules.

Do not invent unsupported status transitions.

Use a clean, clearly separated action area.

Prefer a premium shadcn Dialog, Sheet, or Select where appropriate.

Avoid scattering action buttons throughout the page.

Require any necessary confirmation or reason fields according to existing backend behavior.

## Status timeline

Use the same premium status progress component as the student page.

The timeline should accurately represent:

- Completed stages
- Current stage
- Future stages
- Rejected status as an alternate outcome

Do not treat rejection as successful resolution.

Ensure status changes update the UI smoothly without a hard page reload.

## Duplicate suggestions

Keep the existing likely-duplicate section.

Style it consistently with the rest of the report details interface.

Do not alter the duplicate detection algorithm as part of this visual refinement.

---

# 9. Staff Settings Page

The staff Settings page should use the same visual system and preferably the same reusable settings components as the student Settings page.

Do not keep a legacy staff-only settings design.

Support the existing application preferences:

- Language
- Light theme
- Dark theme
- System theme
- Other already implemented preferences

Preserve five-language support:

- English
- Spanish
- Arabic
- Russian
- Uzbek

Maintain Arabic RTL support.

Keep settings arranged in refined grouped sections.

## Staff-specific settings

Include any genuinely supported staff-specific options.

Do not invent controls that do nothing.

Staff account details may appear in a clean profile/account section if appropriate.

## Sign Out

Provide a clear, accessible Sign Out action.

It should:

- End the authenticated staff session.
- Clear appropriate staff authentication state.
- Redirect to the login page.
- Preserve the separate anonymous reporter identity where the existing architecture requires it.
- Not destroy unrelated device-linked reports or local preferences.

Do not implement logout through a hard-coded frontend-only state reset.

Use the existing backend logout/session mechanism.

---

# 10. Universal Header Consistency

Staff pages must use the same header component as student pages.

Every application page should display:

- Penn State shield/lion logo
- Page title
- Page subtitle

No unnecessary action icons inside the universal header.

Reuse the existing header implementation.

Example staff headings:

**Account**

Title: My Workspace

Subtitle: Your maintenance activity at a glance.

**Requests**

Title: Maintenance Requests

Subtitle: Review and manage campus issues.

**My Work**

Title: My Work

Subtitle: Track your completed and active work.

**Settings**

Title: Settings

Subtitle: Customize your experience.

Translate naturally into all five languages.

Do not change the established header style just for staff.

---

# 11. Shared Design System — Mandatory Audit

The maintenance interface currently looks visually outdated compared to the student interface.

You must identify and eliminate the inconsistencies.

Inspect every staff-facing component for:

- Wrong background colors
- Old primary colors
- Inconsistent card radius
- Incorrect font sizes
- Wrong font family
- Excessive shadows
- Old button styles
- Inconsistent input heights
- Different dropdown styling
- Different status badge styles
- Inconsistent headings
- Different navigation layouts
- Excessive container nesting
- Unnecessary borders
- Unbalanced whitespace
- Incorrect mobile spacing

Use the existing CampusFix theme tokens.

Use Nunito everywhere.

Use the established restrained border-radius scale.

Use semantic Tailwind classes.

Avoid hardcoded visual values that conflict with the theme.

Prefer official shadcn/Radix components and existing shared CampusFix components.

Do not introduce a separate design-system library.

**A staff page and a student page displaying the same kind of information should use the same visual component whenever feasible.**

---

# 12. Localization

All changed staff screens must support:

- English
- Spanish
- Arabic
- Russian
- Uzbek

This includes:

- Login headings
- Login labels
- Validation errors
- Authentication errors
- Staff account labels
- Personal metrics
- Recently resolved reports
- Requests
- Filters
- Status actions
- Confirmation dialogs
- Settings
- Sign Out
- Empty states
- Accessibility labels

Do not hardcode English strings inside components.

Use the existing next-intl infrastructure.

Maintain proper Arabic RTL layout.

Check the login form, profile card, navigation, and staff action dialogs specifically for RTL alignment issues.

Do not translate official building names or room identifiers.

---

# 13. Authentication and Security Preservation

The staff authentication backend already exists.

Do not replace it.

Do not create a new authorization system.

Do not add public registration.

Do not weaken permissions.

Only authenticated staff may access protected maintenance pages and execute staff-only mutations.

Ensure the redesign does not expose protected UI during authentication loading.

Preserve backend authorization for status changes.

Use existing server-side session validation.

Avoid exposing sensitive authentication information to the UI.

Do not store passwords in frontend state beyond what is needed for the immediate submission.

Do not log passwords or credentials.

---

# 14. Responsive and Mobile Experience

Mobile-first quality remains mandatory.

At mobile sizes:

- Reuse the premium icon-only bottom bar.
- Keep cards compact.
- Maintain consistent side padding.
- Preserve safe-area spacing.
- Prevent horizontal overflow.
- Avoid content disappearing beneath navigation.
- Use touch-friendly controls.
- Make maintenance status actions easy to use.

At desktop sizes:

- Use the established desktop navigation treatment.
- Keep content appropriately constrained.
- Make effective use of wider viewports.
- Allow staff to process requests efficiently.
- Preserve the same fonts, colors, and components.

The desktop login must use the split-panel composition described above.

The mobile login must use the single-panel adaptation.

Do not force the login page into the authenticated application shell.

---

# 15. Visual Verification

You must visually inspect the implementation.

Do not stop after compiling.

Use Playwright screenshots or an equivalent available browser-testing approach.

Capture the following pages:

1. Desktop staff login.
2. Mobile staff login.
3. Staff Account/Home.
4. Staff Requests.
5. Staff Report Details.
6. Staff Settings.
7. Desktop staff workspace.
8. Dark-theme staff interface.

Suggested viewport sizes:

- 375 × 812
- 390 × 844
- 430 × 932
- 768 × 1024
- 1440 × 900

Compare the staff screens with existing student screens.

Pay particular attention to:

- Header dimensions
- Typography
- Card geometry
- Background treatment
- Navigation
- Avatar styling
- Filter controls
- Status badges
- Page spacing
- Buttons
- Dialogs
- Dark-theme surfaces

Iterate until both experiences look like one cohesive application.

Do not claim pixel-perfect verification unless screenshots were actually reviewed.

---

# 16. Functional Verification

Test the following workflows.

## Login

- Valid staff credentials successfully authenticate.
- Invalid credentials display an appropriate error.
- Password visibility toggle works.
- No signup or Google authentication options exist.
- Authenticated staff are redirected appropriately.
- Unauthenticated users cannot access protected staff routes.

## Staff Account

- Correct authenticated staff identity appears.
- The profile layout matches the student design language.
- "Resolved by Me" uses actual staff action history.
- Recent resolved reports link to their details.
- Empty states work.
- Personal statistics are not fabricated.

## Requests

- Existing sorting and filtering still work.
- Requests open correctly.
- Upvotes and priorities display correctly.
- No hard page reloads occur during filtering.

## Report Details

- Existing status transitions work.
- Progress history updates correctly.
- Duplicate suggestions remain accessible.
- Staff permissions remain enforced.

## Settings

- Language switching works.
- Theme switching works.
- Arabic RTL works.
- Staff logout succeeds.

## Quality

Run:

- TypeScript type checking
- ESLint
- Prettier checks
- Relevant unit tests
- API integration tests
- Playwright browser tests
- Production builds

Fix regressions introduced by this redesign.

---

# 17. Execution Boundaries

This is an incremental staff-interface redesign.

Do not:

- Rebuild CampusFix.
- Reimplement anonymous student reporting.
- Change report schemas unnecessarily.
- Reset or reseed the database.
- Replace existing authentication.
- Introduce OAuth.
- Add account registration.
- Build a new staff backend.
- Remove working maintenance actions.
- Change duplicate detection.
- Recreate student pages.
- Add unrelated features.
- Introduce another UI framework.
- Modify VINDEX.

Use existing code and shared components wherever practical.

Keep any backend modifications minimal and directly related to making truthful staff-specific information available.

---

# 18. Implementation Order

Execute in the following order:

1. Inspect the current staff and student interfaces.
2. Identify shared components and outdated staff-specific components.
3. Redesign the staff login page.
4. Implement responsive split-panel and single-panel login layouts.
5. Redesign the staff Account/Home page.
6. Implement accurate personal staff metrics and recent resolved-work lists using existing data.
7. Unify staff navigation with the new application navigation system.
8. Refine the Requests page.
9. Refine maintenance Report Details.
10. Unify Settings.
11. Complete localization and RTL adjustments.
12. Verify functionality and authorization.
13. Capture screenshots and refine visual consistency.
14. Run quality checks.

Do not stop after planning.

Implement the changes directly in the existing project.

---

# 19. Final Acceptance Criteria

The task is complete only when:

- The staff login matches the described premium split-panel design.
- The login uses CampusFix branding and the existing color theme.
- Mobile login looks equally polished.
- Email/password is the only login method.
- No signup or social-login controls appear.
- Staff Account matches the student Account visual language.
- Staff identity and real personal work history are displayed.
- Requests look like the premium student Reports interface.
- Staff report details share the same visual system.
- Status management remains functional.
- Staff Settings match student Settings.
- Both experiences use consistent headers, typography, colors, radii, and navigation.
- All five languages work.
- Arabic RTL remains correct.
- Mobile and desktop layouts are polished.
- Existing authentication and maintenance behavior are preserved.
- Screenshots and relevant tests have been reviewed.

At completion, provide a concise summary of the changes and verification results.

**CampusFix should look and feel like one premium application, whether the person using it is a student reporting a broken chair or a maintenance worker resolving that report.**

Proceed with implementation.
