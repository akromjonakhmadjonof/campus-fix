# CampusFix — Premium UI/UX Refinement and Design-System Upgrade

You are a senior product designer and frontend engineer specializing in premium, mobile-first React applications.

Your task is to refine the **existing CampusFix application** into a highly polished, elegant, cohesive, Apple-inspired experience.

This is an **incremental improvement task**.

The application has already been implemented. You must preserve existing functionality, backend behavior, routes, report ownership, staff functionality, and other working features.

Do not rebuild the application.

Do not repeat previous implementation phases.

Implement only the changes described in this prompt and the minimal supporting code required to make them work correctly.

---

# 1. Primary Design Reference

I am attaching a CampusFix UI design reference image to this Codex conversation.

**Inspect the attached image carefully before writing code.**

This image is the primary visual reference for the new design direction.

It contains:

1. Account / Home screen
2. Reports screen
3. Report details screen
4. Settings screen
5. Desktop layout preview
6. Dark-theme preview

Your objective is to bring the existing application as close as practical to this visual reference while respecting the functional requirements below.

The reference is not permission to remove working features.

If a detail in the reference conflicts with an explicit requirement in this prompt, this prompt takes precedence.

## Required visual qualities

The application must feel:

- Premium and carefully art-directed
- Apple-inspired
- Modern and minimal
- Warm and approachable
- Visually consistent
- Smooth and responsive
- Professional and trustworthy
- Designed as one coherent product

Avoid generic AI-generated dashboard styling.

Do not randomly design components.

Use established shadcn/ui components, official shadcn blocks, Radix primitives, and Tailwind utilities as the foundation.

You may inspect available shadcn blocks and templates online, where access permits.

Adapt existing components to our design tokens rather than introducing unrelated visual styles.

Do not add excessive decorative elements, unnecessary layering, oversized gradients, or heavy shadows.

---

# 2. Universal Page Header

Redesign the header system across **every application page**.

The header must consistently contain:

1. Penn State shield/lion logo
2. Appropriate horizontal spacing
3. Page title
4. Page subtitle

Both the title and subtitle are mandatory.

## Logo

Use the actual Penn State shield/lion mark.

**Only the shield/lion symbol, without Penn State text or wordmark.**

Search the existing project assets first.

If a suitable official logo asset is already available, reuse it.

Otherwise, use a properly sourced, permitted logo asset.

Do not invent a similar-looking lion logo.

Do not replace it with a Lucide icon or emoji.

Use the same logo size and placement on all pages.

## Header typography

Every page title must have the same:

- Font family
- Font size
- Font weight
- Line height
- Letter spacing

Every page subtitle must follow its own consistent typography specification.

Use concise, meaningful page titles and subtitles.

For example:

**Account**

Title: Welcome

Subtitle: Your campus, your impact.

**Reports**

Title: Reports

Subtitle: Explore and support campus improvements.

**Create Report**

Title: New Report

Subtitle: Tell us what needs attention.

**Report Details**

Title: Report Details

Subtitle: Track progress and updates.

**Settings**

Title: Settings

Subtitle: Make CampusFix yours.

These are suggested English strings. Translate them naturally into every supported language.

Avoid unnecessarily long subtitles that cause awkward wrapping on mobile devices.

## No header action icons

Do not add notification bells, settings gears, edit pencils, search icons, or other action icons inside the common header.

The universal header should be clean and focused on the logo, title, and subtitle.

Actions belong in the relevant page content.

## Back navigation

Some pages require a back action.

Redesign back navigation as a refined, consistent reusable component.

Use an appropriately sized Lucide chevron or arrow inside a subtle interactive surface.

Do not place random arrows with inconsistent sizes or padding.

Back navigation may appear in a separate navigation row before the page header, without breaking the universal header's composition.

Ensure the behavior is correct for direct page visits as well as ordinary navigation.

All back controls must be accessible and have localized labels.

---

# 3. Theme Replacement

Replace the existing visual theme with the following design system.

Use the provided values as the color source of truth.

## Light theme

```css
:root {
  --background: rgb(251, 250, 247);
  --foreground: rgb(9, 10, 13);

  --card: rgb(246, 246, 243);
  --card-foreground: rgb(9, 10, 13);

  --popover: rgb(252, 252, 249);
  --popover-foreground: rgb(9, 10, 13);

  --primary: rgb(31, 60, 108);
  --primary-foreground: rgb(251, 250, 247);

  --secondary: rgb(233, 235, 239);
  --secondary-foreground: rgb(14, 18, 23);

  --muted: rgb(237, 237, 234);
  --muted-foreground: rgb(83, 88, 97);

  --accent: rgb(226, 233, 240);
  --accent-foreground: rgb(12, 18, 26);

  --destructive: rgb(197, 54, 55);
  --destructive-foreground: rgb(251, 250, 247);

  --border: rgb(213, 216, 219);
  --input: rgb(223, 225, 229);
  --ring: rgb(31, 60, 108);

  --chart-1: rgb(81, 116, 175);
  --chart-2: rgb(59, 141, 93);
  --chart-3: rgb(33, 150, 167);
  --chart-4: rgb(205, 156, 52);
  --chart-5: rgb(153, 97, 166);

  --sidebar: rgb(246, 246, 243);
  --sidebar-foreground: rgb(26, 29, 35);
  --sidebar-primary: rgb(31, 60, 108);
  --sidebar-primary-foreground: rgb(251, 250, 247);
  --sidebar-accent: rgb(226, 233, 240);
  --sidebar-accent-foreground: rgb(12, 18, 26);
  --sidebar-border: rgb(213, 216, 219);
  --sidebar-ring: rgb(31, 60, 108);
}
```

## Dark theme

```css
.dark {
  --background: rgb(11, 13, 18);
  --foreground: rgb(236, 235, 232);

  --card: rgb(19, 22, 28);
  --card-foreground: rgb(236, 235, 232);

  --popover: rgb(17, 20, 25);
  --popover-foreground: rgb(236, 235, 232);

  --primary: rgb(116, 153, 214);
  --primary-foreground: rgb(4, 6, 9);

  --secondary: rgb(30, 34, 40);
  --secondary-foreground: rgb(229, 228, 226);

  --muted: rgb(28, 31, 37);
  --muted-foreground: rgb(149, 152, 159);

  --accent: rgb(33, 39, 48);
  --accent-foreground: rgb(229, 228, 226);

  --destructive: rgb(222, 78, 75);
  --destructive-foreground: rgb(249, 248, 245);

  --border: rgb(44, 49, 56);
  --input: rgb(37, 41, 48);
  --ring: rgb(116, 153, 214);

  --chart-1: rgb(116, 153, 214);
  --chart-2: rgb(83, 174, 119);
  --chart-3: rgb(67, 175, 193);
  --chart-4: rgb(225, 175, 74);
  --chart-5: rgb(198, 139, 211);

  --sidebar: rgb(14, 18, 23);
  --sidebar-foreground: rgb(194, 196, 200);
  --sidebar-primary: rgb(116, 153, 214);
  --sidebar-primary-foreground: rgb(4, 6, 9);
  --sidebar-accent: rgb(33, 39, 48);
  --sidebar-accent-foreground: rgb(229, 228, 226);
  --sidebar-border: rgb(44, 49, 56);
  --sidebar-ring: rgb(116, 153, 214);
}
```

## Tailwind configuration

Keep the existing Tailwind CSS v4 and shadcn integration.

Ensure all semantic tokens are properly mapped with `@theme inline`.

Preserve appropriate mappings for:

- Colors
- Fonts
- Border radii
- Shadows
- Sidebar tokens
- Charts

Continue using `tw-animate-css` and `shadcn/tailwind.css` where required by the installed configuration.

Do not duplicate imports or create conflicting CSS layers.

---

# 4. Typography — Nunito

Use **Nunito** as the primary application font.

The typography must feel elegant, clear, warm, and consistent.

Use a correct font-loading implementation, preferably through Next.js font tooling.

Do not introduce recursive CSS variables such as:

`--font-sans: var(--font-sans)`

Use a separate generated font variable when necessary.

Provide appropriate fallbacks for scripts not fully supported by the chosen Nunito font files, particularly Arabic and Cyrillic.

## Consistent typography hierarchy

Define reusable typography styles or components.

For example:

- Page title / H1
- Section heading / H2
- Card heading / H3
- Body
- Secondary body
- Label
- Caption
- Metadata

All instances of the same text role must share consistent specifications.

Suggested mobile defaults:

| Role | Size | Weight |
|---|---:|---:|
| Page title | 24px | 700 |
| Section heading | 17px | 700 |
| Card heading | 15px | 700 |
| Body | 14px | 400–500 |
| Secondary text | 13px | 400 |
| Caption | 12px | 400–500 |

Adapt these values if necessary after comparing with the design reference.

Do not introduce random text sizes.

Maintain readable line heights.

Use consistent spacing above and below headings.

## UX writing

Treat text as part of the design.

Review:

- Text length
- Readability
- Tone
- Clarity
- Button labels
- Line wrapping
- Empty-state messages
- Help text
- Error messages

Use concise, friendly, natural language.

Avoid overly technical labels visible to ordinary students.

Do not show internal database terminology, session identifiers, client IDs, or implementation details in the interface.

Do not truncate essential information just to fit a card.

Where truncation is appropriate, make the complete information accessible in the detailed view.

---

# 5. Border Radius and Shadows

The previous theme used a base radius of `2rem`.

That is too rounded for our intended visual direction.

Use a softer, more restrained and consistent system.

Suggested base radius:

```css
:root {
  --radius: 0.875rem;
}
```

Keep the same radius logic in dark mode.

Use shadcn's radius scale rather than assigning unrelated corner radii manually.

Examples:

- Small inputs and controls: `rounded-md`
- Cards and grouped settings: `rounded-lg`
- Larger panels: `rounded-xl`
- Fully pill-shaped elements only when semantically appropriate

Avoid making every card look like a giant pill.

Use subtle shadows similar to:

```css
--shadow-xs: 0 1px 3px 0px rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0px rgb(0 0 0 / 0.10),
             0 1px 2px -1px rgb(0 0 0 / 0.10);
--shadow-md: 0 1px 3px 0px rgb(0 0 0 / 0.10),
             0 2px 4px -1px rgb(0 0 0 / 0.10);
```

Maintain a coherent shadow scale for other elevations only if needed.

Do not apply shadows to every element.

Prefer subtle separation through surface colors, borders, and spacing.

---

# 6. Account Page — Major Redesign

The default page is the user's Account / Home page.

Redesign this page using the attached design reference.

This is one of the most important requested changes.

## Profile card

The profile card must feel like a premium personal-profile component.

Its composition should resemble a well-designed social profile:

- Circular avatar on the left
- Display name to the right
- Short supporting text below the name
- Small, tasteful edit affordance
- Comfortable spacing
- Clean typography
- No excessive borders or nested cards
- No unnecessary decorative backgrounds

The user profile should visually feel personal, not technical.

## Default guest identity

Every new anonymous user starts with the exact display name:

**Guest Reporter**

Do not generate visible names like:

- Guest 83912
- Anonymous #8291
- User-39281
- Device 01829

The generated backend device/session identifier must remain internal.

The visible default name is always:

`Guest Reporter`

Spanish and other locales may show an appropriate localized placeholder, but never a generated numeric suffix.

## Profile editing

A guest must be able to edit:

1. Display name
2. Profile picture

Nothing else is required.

Do not introduce:

- Email
- Password
- Date of birth
- Phone number
- Personal address
- University ID
- Social-media accounts
- Biography
- Location tracking

These are anonymous reporter profiles, not full registered accounts.

## Edit interaction

A small edit affordance on the profile card should open a polished dialog or sheet.

The user can:

- Enter a display name
- Select or upload an avatar
- Preview the avatar
- Save changes
- Cancel changes

Validate the display name reasonably.

Handle file type and size validation.

Show localized success and error feedback.

Persist profile changes through the existing backend and anonymous ownership mechanism.

Use existing universal media storage if available.

Do not change or weaken report ownership permissions.

The user should see the saved profile after reloading.

Where browser and mobile identities have already been linked through the existing mechanism, the same profile should appear in both.

If no custom avatar exists, use an elegant default avatar with a neutral illustration or initials.

## Remove technical information

The account profile card must not display:

- Client ID
- Device UUID
- Session token
- Hardware information
- Browser information
- Operating system
- Raw profile identifiers
- Technical account metadata

These details may remain internally stored where necessary.

Do not remove the actual anonymous-device ownership system.

Only remove unnecessary technical information from the user-facing profile design.

---

# 7. Account Page — Recent Reports

Below the profile card, show:

**Your Recent Reports**

Display a few reports created by the current user.

Follow the attached visual reference for card proportions, spacing, and hierarchy.

Each report preview should show meaningful information, such as:

- Report title
- Small thumbnail
- Location
- Status
- Relative submission time

Keep the cards compact and elegant.

Do not overcrowd them.

Include a subtle **See More** action aligned with the section heading.

This action should navigate to the Reports page, preferably showing the current user's reports where the existing filtering system supports it.

Do not add a large dedicated Reports button to the account page.

The section should work with empty data.

If the user has no reports, show a friendly empty state with a useful path to create one.

---

# 8. Account Menu — Important

Create or refine a proper menu section on the Account page.

Use premium grouped-list styling based on shadcn components.

The menu must include:

- **Create Report**
- Settings
- Language
- Theme
- Help / Support, if already supported

**IMPORTANT: Do not remove Create Report from the menu. It must stay available and functional.**

The user specifically wants to keep the Create Report option in the menu.

We are removing oversized standalone Create Report and Reports shortcut buttons from the Account page, not removing those capabilities.

## Menu interactions

Create Report:
Navigate to the existing report creation page.

Settings:
Navigate to a standalone Settings page.

Language:
Open an appropriate language selector or navigate to the language setting.

Theme:
Open an appropriate appearance selector or navigate to the theme setting.

All menu items must function.

Use consistent row heights, icons, chevrons, labels, and separators.

Avoid excessive nesting.

---

# 9. Settings — Standalone Page

Settings must exist as a separate page.

Do not render the full settings interface inside the Account page.

Access Settings through the Account menu.

Keep existing navigation working where applicable, but do not add an oversized Settings shortcut button to the account profile.

## Settings design

Use the attached reference's premium grouped settings composition.

Use clear sections such as:

- Appearance
- Language
- Preferences
- About

Only include controls that work or are explicitly marked unavailable.

## Appearance

Support:

- Light
- Dark
- System

Persist the user's selection.

Use the new theme tokens everywhere.

Prevent unnecessary theme flicker.

## Language

Support five languages:

- English — `en`
- Español — `es`
- العربية — `ar`
- Русский — `ru`
- Oʻzbekcha — `uz`

## Other settings

Preserve existing working settings.

Do not invent fake controls.

Keep the page visually calm and uncluttered.

---

# 10. Five-Language Internationalization

Extend the current next-intl setup.

Existing languages:

- English
- Spanish

Add:

- Arabic
- Russian
- Uzbek

Required locale routes:

```text
/en
/es
/ar
/ru
/uz
```

Keep English as the default.

## Complete translation coverage

Translate all existing application screens and interactions, including:

- Account
- Reports
- Report details
- Report creation
- Duplicate suggestions
- Settings
- Profile editor
- Staff pages
- Status labels
- Buttons
- Menus
- Inputs
- Placeholders
- Validation errors
- Toasts
- Empty states
- Loading messages
- Accessibility labels

Do not leave untranslated English labels scattered throughout the UI.

Preserve actual campus building names and official room identifiers.

Do not translate proper nouns where doing so would make locations difficult to recognize.

Use natural, grammatically appropriate translations.

## Arabic RTL

Arabic must work correctly as a right-to-left language.

Implement:

- `dir="rtl"` for Arabic
- Correct text alignment
- Appropriate navigation direction
- Logical spacing properties
- Correct menu and chevron orientation
- Correct dialog alignment
- RTL-compatible forms
- Proper mixed Arabic/Latin text handling
- An Arabic-capable font fallback

Avoid hardcoded left/right assumptions.

Use logical CSS properties where practical.

The Penn State logo should not be mirrored.

Status timelines, progress indicators, and navigation must remain understandable in RTL layouts.

## Russian and Uzbek

Ensure Cyrillic glyph coverage.

For Uzbek, use consistent modern Latin Uzbek orthography.

Do not accidentally mix Russian and Uzbek language strings.

## Language switcher

Display languages by their native names.

Changing language must preserve the current route when possible.

Persist the locale preference using the existing mechanism.

Verify no broken routes occur when switching among all five languages.

---

# 11. Dropdowns, Selects, and Menus

Audit all existing dropdown components.

Replace inconsistent or browser-default-styled dropdowns with the appropriate shadcn/Radix components.

Choose the right component for the interaction:

- Select for choosing one value
- DropdownMenu for actions
- Popover + Command for searchable selections
- Dialog or Sheet for complex mobile selection workflows

Use an existing official shadcn implementation instead of hand-rolling custom dropdown logic.

Ensure consistent:

- Trigger heights
- Padding
- Font sizes
- Border radius
- Focus indicators
- Popover width
- Icons
- Selection states
- Keyboard behavior
- Dark-theme appearance

For long hierarchical campus-location selectors, retain the existing functional data and selection behavior while improving its visual presentation.

Do not break form validation or report submission.

All dropdowns must work on mobile touchscreens and inside the React Native WebView.

For Arabic, respect RTL alignment and direction.

---

# 12. Consistent UI Across All Pages

Perform a focused visual audit of every existing page.

Apply a unified design system.

The goal is that the application looks like it was designed by one experienced designer rather than assembled from unrelated component examples.

## Audit the following

### Typography

- H1 consistency
- H2 consistency
- Labels
- Body text
- Metadata
- Captions
- Button typography

### Layout

- Page horizontal padding
- Header spacing
- Section spacing
- Card gaps
- Mobile content width
- Desktop content width
- Responsive grid behavior

### Components

- Cards
- Buttons
- Inputs
- Textareas
- Selects
- Dropdown menus
- Dialogs
- Sheets
- Tabs
- Badges
- Status labels
- Report cards
- Form sections
- Navigation
- Back buttons

### Visual details

- Border radius
- Shadows
- Borders
- Surface colors
- Icon sizes
- Icon stroke widths
- Hover states
- Pressed states
- Disabled states
- Focus states
- Loading states
- Skeletons

Define shared patterns so that future changes can be made centrally.

Do not create numerous one-off overrides.

Avoid deeply nested surfaces or cards inside cards when they do not improve comprehension.

Prefer simple, premium composition.

---

# 13. Reports and Report Details Visual Refinement

Use the attached reference to improve existing report layouts.

Do not rewrite backend reporting logic.

## Reports page

Maintain the existing report functionality.

Refine:

- Report cards
- Thumbnails
- Status badges
- Vote displays
- Category filters
- Location filters
- Search controls
- Spacing and typography

The reports page should feel like a premium social/ticket-feed experience.

## Report details

Keep the existing report details and ownership permissions.

Refine:

- Main report information
- Photo gallery
- Location hierarchy
- Category and item information
- Status timeline
- Similar reports
- Action buttons

Ensure the progress indicator is visually consistent with the new theme.

Distinguish completed, current, and upcoming statuses clearly.

Do not imply rejected reports were successfully resolved.

Do not remove any working duplicate-detection features.

---

# 14. Responsive Design

Mobile is the primary experience.

Use the attached mobile reference as the main visual target.

Do not implement a desktop-first layout and merely compress it on mobile.

## Mobile

- Compact header
- Proper safe-area spacing
- Comfortable touch targets
- Refined bottom navigation where already present
- Minimal visual clutter
- Balanced section spacing
- Stable scrolling

## Desktop

Use the same visual language.

Refine:

- Sidebar or navigation structure
- Content max widths
- Card grids
- Report list density
- Profile layout
- Settings composition

Do not stretch mobile cards across the entire desktop viewport.

Desktop should feel like a purposeful adaptation of the same product.

---

# 15. Microinteractions

Preserve and refine existing Motion and NProgress integrations.

Animations should be subtle and purposeful.

Appropriate examples:

- Profile edit dialog opening
- Menu selection feedback
- Theme changes where appropriate
- Language selection
- Card hover states
- Navigation feedback
- Smooth status transitions

Avoid exaggerated spring animations.

Respect reduced-motion preferences.

Do not create motion solely to make the interface look busy.

---

# 16. Functional Preservation

This task is a visual refinement and a small set of new profile/localization features.

Do not break existing functionality.

Preserve:

- Anonymous device-based report ownership
- Existing browser/mobile identity linking
- Report creation
- Report editing permissions
- Report browsing
- Report details
- Upvotes
- Duplicate detection
- Maintenance authentication
- Maintenance staff workflows
- Report status transitions
- Status history
- Local media storage
- Existing database records

Backend changes should be limited to what is required for the new editable guest display name and avatar, if those fields and endpoints do not already exist.

Reuse existing profile and media tables where possible.

Do not create duplicate profile systems.

Do not reset the database.

Do not modify the Prisma schema unnecessarily.

Do not change report ownership from the device/session model to ordinary email authentication.

---

# 17. Visual Verification — Mandatory

Do not stop when TypeScript compiles.

You must visually inspect the application.

Use Playwright or another available screenshot-testing approach.

Capture representative screens at:

- 375 × 812
- 390 × 844
- 430 × 932
- 768 × 1024
- 1440 × 900

Compare the rendered pages with the attached reference image.

Pay particular attention to:

- Header composition
- Penn State shield sizing
- Page title and subtitle alignment
- Profile card proportions
- Avatar sizing
- Text density
- Card spacing
- Border radius
- Menu rows
- Report cards
- Bottom navigation
- Settings grouping
- Dark theme

Iteratively refine the UI.

Do not claim pixel-perfect results without visual inspection.

Also verify the Arabic experience in RTL mode, including at narrow phone widths.

---

# 18. Acceptance Criteria

The refinement is complete when:

1. Every page has a consistent header with Penn State shield, title, and subtitle.
2. No unrelated action icons appear in the universal header.
3. The new light and dark color palettes are applied consistently.
4. Nunito is the primary typeface, with appropriate multilingual fallbacks.
5. Headings and body text follow a consistent typography system.
6. Border radii are softer and less exaggerated than before.
7. The Account page has a premium redesigned profile card.
8. New guests display "Guest Reporter", never a random numbered name.
9. Guests can edit and persist their display name and profile picture.
10. Technical client/device information is not shown on the profile card.
11. Recent user reports appear beneath the profile card.
12. "See More" opens the appropriate Reports view.
13. Standalone oversized Create Report and Reports buttons are removed from the Account page.
14. **Create Report remains in the Account menu and works.**
15. Settings is a standalone page accessible through the Account menu.
16. English, Spanish, Arabic, Russian, and Uzbek are fully supported.
17. Arabic uses correct RTL layout.
18. Dropdowns use polished shadcn/Radix styling.
19. Back navigation is consistent and elegant.
20. Existing report and staff functionality remains intact.
21. Mobile and desktop designs are visually coherent.
22. Type checking, linting, and relevant tests pass.
23. Actual screenshots have been inspected and refined against the reference.

---

# 19. Execution Instructions

Follow this implementation order:

1. Inspect the existing application and attached design reference.
2. Identify existing theme, fonts, navigation, header, profile, and localization components.
3. Implement the new design tokens and typography.
4. Implement the unified page header and back-navigation components.
5. Redesign the Account profile card.
6. Implement editable guest name and avatar using existing backend capabilities where possible.
7. Refine the Account menu and recent reports.
8. Ensure Settings is a standalone page.
9. Add Arabic, Russian, and Uzbek localization.
10. Update dropdowns and shared UI components.
11. Apply visual consistency across other existing pages.
12. Verify mobile and desktop layouts.
13. Capture and review screenshots.
14. Run tests and fix regressions.

Do not stop after planning.

Do not recreate the application.

Do not change unrelated features.

Do not make unnecessary architectural changes.

Implement the refinements, verify them, and provide a concise final summary.

---

# 20. Final Delivery

When complete, report:

- Design-system changes
- New fonts and theme configuration
- Header changes
- Account page changes
- Profile editing behavior
- Menu and Settings changes
- Languages added
- RTL verification
- Dropdown improvements
- Screenshots reviewed
- Tests executed
- Any remaining limitations

**The final result should feel like a premium, carefully designed application, not a generic template.**

Use the attached reference as the visual target, preserve all working CampusFix functionality, and implement the requested changes now.
