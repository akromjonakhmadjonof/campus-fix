# CampusFix — Navigation, Report Validation, Seed Data & Smooth Interactions

You are working on the existing CampusFix application.

This is an **incremental update**, not a new implementation or a redesign of the entire project.

Inspect the current codebase and implement only the requirements below.

Preserve all existing functionality, backend architecture, bilingual/multilingual support, design tokens, authentication, anonymous device identity, maintenance workflows, and the premium visual design system.

Do not reimplement completed features.

---

## 1. Remove the Account Page Menu Section

The Account/Home page currently has, or may have, a section titled "Menu" containing navigation links.

**Remove that entire section.**

Do not replace it with another menu card or grouped navigation section.

The Account page should focus on:

- The user's profile card.
- Recent reports created by the current user.
- A "See More" action for viewing additional reports.
- Relevant account information already present in the design.

Do not add oversized standalone navigation buttons to replace the removed section.

All main navigation should happen through the bottom navigation bar.

---

## 2. Bottom Navigation — Exactly Four Items

Redesign the global bottom navigation bar.

It must contain exactly four destinations, in this order:

1. Account
2. Reports
3. Create Report
4. Settings

### Icons

Use Lucide React.

Suggested icons:

| Destination | Icon |
|---|---|
| Account | `user-round` |
| Reports | `clipboard-list` |
| Create Report | `plus-circle` |
| Settings | `settings-2` |

### Important design requirements

**Display icons only. No visible text labels underneath the icons.**

The navigation should feel like a premium mobile application.

Requirements:

- Exactly four evenly distributed items.
- Consistent icon sizes.
- Consistent stroke widths.
- Consistent touch targets.
- Subtle active-state styling.
- Active icon uses the primary theme color.
- Inactive icons use muted foreground colors.
- Soft, restrained background and border treatment.
- Minimal visual clutter.
- No excessive shadows or gradients.
- Smooth active-state transitions.
- Proper spacing for iOS and Android safe areas.
- Respect the existing light and dark themes.

The bottom navigation should remain visible across the main application pages.

On nested pages, retain an appropriate consistent navigation experience without obstructing content.

On desktop, adapt the navigation gracefully while preserving the same four destinations. Do not introduce an additional unrelated menu system.

### Accessibility

Although visible labels are removed, every icon must have:

- Localized `aria-label`.
- Appropriate `aria-current` for the active destination.
- Keyboard accessibility.
- Visible focus indicators.
- Accessible tooltips where appropriate.

Support all existing application languages.

### Navigation behavior

Use Next.js client-side navigation.

Do not use `window.location.href`, `window.location.assign`, or other browser-level navigation for internal application routes.

Switching tabs must not reload the entire document.

Maintain the active tab correctly after navigation and browser history changes.

---

## 3. Report Creation — Every Field Is Required

Update the existing Create Report form.

The following fields must all be mandatory:

1. **Issue Title**
2. **What's Happening?**
3. **Issue Group**
4. **Issue Type**
5. **Campus Location**
6. **Where Exactly?**
7. **Image Attachment**

No field may be optional.

### Field 1 — Issue Title

A concise title describing the problem.

Example:

"Computer monitor not working"

Requirements:

- Required.
- Trim surrounding whitespace.
- Reject empty or whitespace-only input.
- Use sensible minimum and maximum character limits.
- Show clear localized validation feedback.

### Field 2 — What's Happening?

A detailed explanation of the issue.

Example:

"The computer turns on, but the monitor stays black."

Requirements:

- Required textarea.
- Reject empty or whitespace-only input.
- Require enough meaningful information to describe the issue.
- Provide an appropriate maximum length.
- Use a premium shadcn Textarea component.

### Field 3 — Issue Group

A required grouped category selector.

Examples:

- Classroom & Learning Spaces
- Plumbing & Water
- Electrical & Lighting
- IT & Technology
- Furniture & Equipment
- Building & Infrastructure
- Cleaning & Sanitation
- Safety & Accessibility
- Outdoor & Grounds

Use the existing database taxonomy where possible.

Do not replace existing seeded issue groups unnecessarily.

Load groups from the backend.

Do not hardcode the catalog exclusively in frontend components.

### Field 4 — Issue Type

A required selector depending on the chosen Issue Group.

Examples:

**Classroom & Learning Spaces**
- Projector
- Whiteboard
- Classroom Desk
- Classroom Chair

**Plumbing & Water**
- Water Pipe
- Sink
- Faucet
- Toilet
- Water Fountain
- Drain

**Electrical & Lighting**
- Light Fixture
- Electrical Outlet
- Switch
- Emergency Light

**IT & Technology**
- Computer
- Monitor
- Keyboard
- Mouse
- Network Connection
- Printer

**Furniture & Equipment**
- Table
- Chair
- Cabinet
- Door Hardware

**Building & Infrastructure**
- Door
- Window
- Ceiling
- Floor
- Wall
- Elevator

**Cleaning & Sanitation**
- Trash Bin
- Spill
- Restroom Cleaning
- Waste Disposal

**Safety & Accessibility**
- Emergency Exit
- Fire Safety Equipment
- Handrail
- Accessibility Equipment

**Outdoor & Grounds**
- Sidewalk
- Parking Surface
- Outdoor Lighting
- Bench
- Landscaping

These are examples, not instructions to create duplicate records if the taxonomy already contains equivalent types.

If the backend distinguishes group and type, preserve that relationship.

When the user changes Issue Group:

- Load or filter the available Issue Types.
- Clear any previously selected Issue Type that is no longer valid.
- Update the selector without a full-page reload.
- Preserve all unrelated form inputs.

An Issue Type must belong to its selected Issue Group.

Validate that relationship on the backend.

### Field 5 — Campus Location

Required hierarchical location selection.

Use the existing backend location tree populated from `seed.json`.

Do not hardcode campus locations into the frontend.

Buildings, parking lots, landmarks, and outdoor areas remain at the same top level.

Users should be able to select nested locations when available.

For example:

Sutherland Building → Floor 2 → Room

A valid selectable parent location should also be supported when deeper subdivisions are unavailable.

Do not require nonexistent room entries.

### Field 6 — Where Exactly?

A required description of the exact physical position of the issue.

Examples:

- "Third computer in the second row."
- "Under the second sink near the entrance."
- "The outlet on the left wall behind the instructor's desk."
- "Beside the north entrance to Lot A."

This is separate from the structured campus location.

Require a meaningful location description.

Do not accept empty or whitespace-only input.

### Field 7 — Image Attachment

At least **one image must be required**.

The form must not submit successfully without a valid image attachment.

Requirements:

- Support camera capture when available.
- Support image selection from the device.
- Support the existing React Native WebView flow.
- Display image previews.
- Allow replacing or removing attachments.
- Show validation errors when no image is attached.
- Validate supported file types.
- Enforce appropriate file-size limits.
- Upload through the existing backend media infrastructure.
- Preserve existing local media storage and API-served image URLs.

If multiple image support already exists, preserve it.

Do not store operating-system filesystem paths in user-visible frontend data.

---

## 4. Client and Backend Validation

Required fields must be enforced in both places.

### Frontend

Use the existing React Hook Form + Zod integration.

Requirements:

- Validate all seven fields.
- Display localized field-level errors.
- Identify invalid fields clearly.
- Focus or scroll to the first invalid field when appropriate.
- Preserve valid user inputs after validation failure.
- Disable duplicate submission while the request is pending.
- Display successful submission feedback.

### Backend

Update existing Zod/API validation and persistence checks.

Reject submissions when:

- Title is missing or invalid.
- Description is missing or invalid.
- Issue Group is missing or invalid.
- Issue Type is missing or invalid.
- Issue Type does not belong to Issue Group.
- Campus Location is missing or invalid.
- Exact-location description is missing or invalid.
- No valid image is attached.

Never rely on frontend-only validation.

Ensure invalid image uploads do not leave orphaned media records or permanently stored files.

Use the existing transactional/error-handling patterns where appropriate.

Do not weaken anonymous ownership or authorization checks.

### Duplicate detection

Preserve the existing duplicate-suggestion behavior.

When enough location, group, type, title, or description information has been entered, request likely duplicates from the backend.

Display matching reports without replacing or resetting the form.

Use debouncing where appropriate.

Users must still be able to confirm an existing report or create a distinct report.

Do not make the image requirement interfere with preliminary duplicate checking.

---

## 5. Seed More Diverse Maintenance Problems

Expand the existing demonstration data.

The application currently needs a broader selection of realistic maintenance reports.

Add fictional reports covering different issue groups, types, locations, and statuses.

Examples:

- Broken computer monitor in a classroom.
- Leaking faucet in a restroom.
- Damaged chair in a lecture room.
- Malfunctioning projector.
- Broken electrical outlet.
- Flickering hallway light.
- Jammed classroom door.
- Overflowing trash bin.
- Damaged sidewalk.
- Broken outdoor bench.
- Faulty printer.
- Water leaking from a ceiling.
- Damaged restroom fixture.
- Broken parking-area light.
- Network connection failure in a computer lab.

### Seed requirements

- Use the existing PostgreSQL and Prisma setup.
- Reuse the current taxonomy and location records.
- Add missing issue groups/types only where necessary.
- Do not create duplicate issue types or locations.
- Use valid existing location identifiers.
- Populate realistic fictional descriptions.
- Include a variety of statuses.
- Include variation in report creation times.
- Include different upvote counts.
- Include representative status histories.
- Associate seeded reports with safe fictional/demo identities.
- Use sample images only when appropriately licensed and available locally.

Ensure reports are spread across different buildings and campus areas.

The seeded data should make search, filtering, duplicate detection, sorting, and the staff queue meaningful.

Do not generate hundreds of nearly identical reports.

**Seeding must be safe and repeatable.**

Use stable identifiers or unique keys where necessary.

Do not wipe the database.

Do not reset existing user reports.

Do not overwrite actual locally created reports.

Prefer a separate additive demo-seed command if that is safer than changing the existing initialization seed.

---

## 6. No Hard Reloads — Smooth Client-Side Interactions

This is a high-priority requirement.

**Filtering, sorting, searching, changing categories, changing tabs, and interacting with existing reports must not trigger full-document reloads.**

The application should feel like a native mobile app, even when running inside a normal browser.

### Reports filtering

When a user changes:

- Category
- Issue Group
- Issue Type
- Campus Location
- Status
- Sort order
- Search query
- My Reports / All Reports filters

Only the relevant report data and components should update.

Do not remount the entire application.

Do not reset global UI state unnecessarily.

Do not flash a full-page loading screen.

Do not destroy the user's scroll position unnecessarily.

### Technical implementation

Use the existing TanStack Query infrastructure.

Use stable query keys for each filter combination.

Use `placeholderData: keepPreviousData` or the equivalent compatible approach when appropriate.

Maintain previous results while fetching updated results, with subtle pending feedback.

Use debounced search requests.

Avoid triggering a request on every keystroke when a short debounce is appropriate.

Update URL search parameters through client-side navigation or the native History API where supported by the installed Next.js version.

Do not use full-document navigation.

Do not force unnecessary server-component tree refreshes for local filter changes.

Avoid calling `router.refresh()` simply to apply filters.

Do not recreate the QueryClient on every render.

### Important UX behavior

Filtering should feel immediate.

Examples:

- Selecting "Plumbing" updates the issue list smoothly.
- Selecting "In Progress" filters visible reports without reloading.
- Searching for "computer" updates matching records after a short debounce.
- Changing the report group filters available issue types immediately.
- Upvoting a report updates the relevant count without reloading the page.
- Opening report details uses client-side navigation.
- Returning to the list should preserve useful filters and scroll position whenever practical.

### Data mutations

After successful mutations, use appropriate TanStack Query cache updates or targeted invalidation.

Do not reload the entire page just to display:

- A new vote.
- A changed report.
- An updated profile.
- A status change.
- A newly submitted report.

Show small contextual loading states instead of blanking the entire application.

Preserve the currently open page, form state, and focus where reasonable.

---

## 7. Maintain the Existing Premium Design

Follow the design system already established in the previous implementation.

Do not replace the application theme again.

Maintain:

- Nunito typography.
- Penn State shield branding.
- Consistent page headings and subtitles.
- Warm neutral backgrounds.
- Navy primary color.
- Consistent border radii.
- Subtle shadows.
- Light and dark themes.
- Existing Motion animations.
- Existing NProgress integration.
- shadcn/Radix component styling.

The bottom navigation should look like a natural part of the existing application.

Use official shadcn components and patterns wherever practical.

Do not introduce a new UI framework.

Avoid excessive component nesting, visual noise, and unrelated design changes.

---

## 8. Multilingual Support

All new or updated user-facing text must support the application's five existing languages:

- English
- Spanish
- Arabic
- Russian
- Uzbek

Translate:

- Bottom navigation accessible labels.
- Form fields.
- Placeholders.
- Validation messages.
- Issue group/type labels.
- Filter labels.
- Empty states.
- Loading messages.
- New status or error messages.

Preserve Arabic RTL behavior.

Do not translate official building names or room identifiers.

Ensure category and issue-type labels can be localized while retaining stable database identifiers.

---

## 9. Verification and Testing

After implementing the changes, verify the following.

### Navigation

- Exactly four bottom navigation icons appear.
- No visible text appears beneath the icons.
- Account Menu section is removed.
- Create Report remains accessible in the bottom navigation.
- Settings is accessible through the bottom navigation.
- Active states update correctly.
- Navigation works without document reloads.

### Report creation

- Every one of the seven fields is mandatory.
- Missing images are rejected.
- Empty or invalid fields produce useful errors.
- Issue Type depends on Issue Group.
- Location selection uses backend data.
- Backend rejects incomplete requests.
- Duplicate suggestions remain functional.
- Valid submissions still succeed.

### Seed data

- New issue types are available where needed.
- Multiple fictional reports exist across varied categories and locations.
- Reports have realistic status and timestamp distributions.
- Re-running the seed does not duplicate data or destroy existing records.

### Smooth interactions

- Filters update without hard reloads.
- Search is debounced.
- Sorting does not remount the page.
- Upvotes update without document reloads.
- Form values are preserved during duplicate checks.
- Loading indicators are contextual.
- Browser Back/Forward navigation remains functional.

### Visual checks

Test mobile viewport sizes:

- 375 × 812
- 390 × 844
- 430 × 932

Also verify a desktop viewport.

Check bottom-bar safe-area spacing and whether page content is obscured by the fixed navigation.

Test both light and dark themes.

Verify Arabic RTL navigation and form layout.

### Quality checks

Run available:

- TypeScript checks.
- ESLint.
- Prettier checks.
- Unit tests.
- Relevant integration tests.
- Playwright smoke tests.
- Production builds.

Fix regressions caused by this update.

---

## 10. Scope and Execution

This is an incremental change request.

Do not:

- Rebuild the application.
- Replace existing backend architecture.
- Create a new authentication system.
- Change anonymous device ownership.
- Remove maintenance features.
- Recreate the database.
- Reset user data.
- Redesign unrelated screens.
- Introduce additional navigation destinations.
- Replace the existing visual theme.
- Add unrelated features.

### Implementation order

1. Inspect the current navigation and Account page.
2. Remove the Account Menu section.
3. Implement the four-icon bottom navigation.
4. Update report creation validation.
5. Enforce the same requirements in the API.
6. Expand the issue taxonomy and additive demo seed.
7. Eliminate hard reloads from filters, search, sorting, and mutations.
8. Update all five locales.
9. Test visual behavior and functionality.
10. Run quality checks and fix regressions.

Do not stop after planning. Implement the changes in the existing codebase.

At completion, provide a concise summary of what changed, which tests passed, and any remaining limitations.

**The result must feel like one smooth, premium mobile application backed by a real, consistently validated ticket/reporting system.**
