# CampusFix — Complete Project Foundation Setup

You are acting as a senior full-stack TypeScript engineer responsible for initializing the technical foundation of **CampusFix**, a cross-platform campus maintenance reporting application.

Your objective is to create a clean, maintainable, production-quality development foundation for a 24-hour coding competition.

**This task is exclusively about project initialization, tooling, architecture, reusable UI infrastructure, native WebView hosting, and backend foundations.**

Do not implement application features or business logic.

Execute the setup directly, install the required dependencies, configure the projects, and verify everything possible.

---

# 1. Working Directory and Existing Project

## Current working directory

You are running inside:

`campus-fix/`

This directory is already created.

## Existing reference application

An existing Next.js application is available at:

`../vindex/web/`

This is a mature frontend project whose technical setup, design-system implementation, generic components, fonts, configuration, and development conventions should be reused where appropriate.

**IMPORTANT: The VINDEX project is strictly read-only.**

You may inspect and copy appropriate files from `../vindex/web/`, but you must never modify, delete, rename, reformat, install dependencies inside, or otherwise alter that project.

Do not run commands that mutate the source project.

CampusFix must remain a completely independent application.

## Mandatory first action

Before generating files, thoroughly inspect the reusable foundations of `../vindex/web/`.

Examine, where available:

- `package.json`
- `tsconfig.json`
- `next.config.ts`
- `eslint.config.*`
- `.prettierrc*`
- `postcss.config.*`
- `components.json`
- Global stylesheets
- Tailwind v4 configuration and theme tokens
- Fonts and font-loading implementation
- Generic shadcn/ui components
- Generic layout primitives
- Theme configuration
- Generic providers
- Internationalization setup
- Navigation progress implementation
- Motion integration
- Generic utilities
- Generic hooks
- Testing configuration
- Git hooks and development scripts

Identify which files are genuinely reusable without depending on VINDEX business logic.

Prefer adapting working VINDEX implementations rather than generating unnecessarily different implementations of the same infrastructure.

Do not copy the entire project.

When useful code is coupled to VINDEX-specific features, extract only its generic technical behavior into a new independent CampusFix implementation.

---

# 2. Required Monorepo Structure

Create the following workspace:

```text
campus-fix/
├── web/
├── mobile/
├── api/
├── .gitignore
├── .editorconfig
├── .prettierignore
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── README.md
```

Use **pnpm workspaces**.

Do not create a `packages/` directory.

Do not create `desktop/`.

Do not introduce Nx, Turborepo, Lerna, or additional monorepo frameworks.

Use simple pnpm workspace scripts.

Suggested workspace names:

- `@campus-fix/web`
- `@campus-fix/mobile`
- `@campus-fix/api`

Follow the same pnpm version as the existing VINDEX application when compatible.

The root project should be private and should define the `packageManager` field.

Use the compatible Node.js version required by the selected tools, and document the requirement.

---

# 3. Technology Stack

## Web

- Next.js 16
- React 19
- TypeScript
- Next.js App Router
- Tailwind CSS 4
- shadcn/ui
- Radix UI
- Lucide React
- next-intl
- nprogress
- Motion for React
- TanStack React Query
- Axios
- React Hook Form
- Zod
- @hookform/resolvers
- Sonner
- Day.js
- class-variance-authority
- clsx
- tailwind-merge
- tw-animate-css

## Mobile

- Expo
- React Native
- TypeScript
- react-native-webview
- react-native-safe-area-context

## API

- Node.js
- Fastify
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod

## Development tooling

- pnpm
- ESLint
- Prettier
- TypeScript strict mode
- Vitest
- Playwright for web E2E testing

Use versions compatible with the existing VINDEX setup and current official framework requirements.

Prefer the stable, working versions already used by VINDEX for the web application. Verify compatibility rather than blindly upgrading everything.

Avoid installing dependencies that have no immediate infrastructure purpose.

---

# 4. Web Application Initialization

Initialize `web/` as a Next.js application.

Requirements:

- App Router
- TypeScript
- `src/` directory
- Tailwind CSS 4
- Strict TypeScript configuration
- Absolute imports using the `@/` alias
- ESLint
- Prettier

Use the conventional Next.js development and build system.

Do not use Vite.

Do not configure static export. The application will initially run through a local Next.js Node.js server.

The web application is the single source of truth for:

- Application UI
- Routing
- Frontend state
- Browser-side logic
- Internationalization
- API consumption
- Platform-aware behavior

The same web application will eventually run inside the React Native WebView.

Do not create separate web and mobile user interfaces.

---

# 5. Reuse VINDEX's Design-System Foundations

This is one of the most important requirements.

Inspect `../vindex/web/` carefully and selectively copy or adapt reusable design-system infrastructure.

## 5.1 Fonts

Inspect VINDEX's font configuration.

Reuse its generic typography setup, including:

- Font files when locally owned and reusable
- Font loading
- `next/font` configuration
- Font-family variables
- Font-weight definitions
- Font-related CSS variables
- Typography utilities
- Consistent application of fonts

Prefer copying actual local font assets and their configuration instead of redownloading fonts unnecessarily.

Do not include VINDEX-specific branding or logo assets.

Preserve font-loading performance practices.

## 5.2 Tailwind and design tokens

Reuse generic infrastructure for:

- Tailwind CSS v4
- Global CSS
- Color tokens
- Typography tokens
- Spacing
- Border radius
- Shadows
- Light and dark themes
- CSS variables
- Component styling conventions
- Responsive design foundations

Use semantic design tokens instead of scattering hardcoded colors throughout components.

Do not blindly copy VINDEX's visual identity.

CampusFix must have an independent design system whose branding and colors can be customized later.

For now, prioritize a coherent, neutral foundation.

## 5.3 shadcn/ui and Radix

Inspect the actual shadcn components in VINDEX.

Copy reusable generic components when they have no business-specific dependencies.

Examples may include:

- Button
- Input
- Textarea
- Label
- Card
- Badge
- Dialog
- Alert Dialog
- Dropdown Menu
- Select
- Checkbox
- Radio Group
- Tabs
- Tooltip
- Popover
- Sheet
- Skeleton
- Separator
- Scroll Area
- Sonner integration

This is not a requirement to recreate every component from scratch.

Only copy suitable existing components and the dependencies they actually require.

Fix imports to point to CampusFix's local structure.

Do not copy components for:

- Vehicle management
- Diagnostics
- Authentication or account management
- Organization or tenant management
- VINDEX navigation
- VINDEX dashboards
- VINDEX domain workflows

Also do not copy generic components that bring in these dependencies indirectly.

Keep shadcn components independently editable within CampusFix.

Configure `components.json` correctly.

## 5.4 Generic utilities

Reuse clean, generic utilities where appropriate.

For example:

- `cn()`
- Formatting helpers
- Generic class-name utilities
- Generic responsive hooks
- Generic accessibility helpers

Avoid creating a large shared utility library without a demonstrated need.

---

# 6. Internationalization — English and Spanish

Implement internationalization using `next-intl`.

Supported languages:

- English (`en`)
- Spanish (`es`)

Default language: English.

Use locale-prefixed routes:

```text
/en
/es
```

## Requirements

- Configure next-intl for Next.js 16 App Router.
- Follow the current official routing approach.
- Use `proxy.ts` where appropriate for Next.js 16.
- Create locale-aware navigation helpers.
- Provide a language switcher.
- Preserve the current route when changing languages.
- Respect the selected locale throughout the application.
- Support browser language negotiation where appropriate.
- Fall back safely to English for unsupported locales.
- Avoid duplicated routing logic.

Suggested structure:

```text
web/src/
├── app/
│   └── [locale]/
├── i18n/
│   ├── routing.ts
│   ├── navigation.ts
│   └── request.ts
└── messages/
    ├── en.json
    └── es.json
```

Adapt any existing generic internationalization conventions from VINDEX where they are suitable.

Do not copy VINDEX's actual business translations.

Provide only the minimal generic translations necessary for the initial application shell.

Do not create CampusFix feature translations yet.

Ensure internal backend proxy paths and Next.js assets are excluded from locale rewriting.

---

# 7. Navigation Progress — NProgress

Install and configure `nprogress`.

Inspect whether VINDEX already contains a reusable navigation progress implementation.

If it does, prefer adapting that implementation.

## Requirements

- Display a thin progress bar near the top of the viewport during client-side route navigation.
- Integrate correctly with Next.js App Router.
- Integrate correctly with next-intl navigation.
- Work when switching between English and Spanish.
- Avoid triggering on external links.
- Avoid triggering on modified clicks that open a new tab.
- Avoid unnecessary progress feedback when staying on the same route.
- Complete progress when navigation finishes.
- Avoid permanently stuck progress indicators.
- Avoid duplicate progress indicators.
- Keep configuration centralized.

Do not use removed Pages Router APIs such as `router.events`.

Use a supported App Router strategy, with properly instrumented navigation and route-completion detection.

Prefer reusing existing working VINDEX code over adding another progress-bar dependency.

The bar should be subtle, fast, and visually consistent with the design tokens.

---

# 8. Motion and Animations

Install and configure `motion`.

Use the current Motion for React API.

Inspect the VINDEX application for reusable generic motion utilities, presets, or hooks.

Reuse only generic implementations.

## General principles

Animations should be:

- Subtle
- Fast
- Consistent
- Accessible
- Performance-conscious
- Optional where not necessary

Create a lightweight foundation for future:

- Dialog transitions
- Sheet transitions
- Page-content entrances
- List transitions
- Status changes
- Small interactive effects

Prefer transform and opacity animations.

Respect `prefers-reduced-motion`.

Do not create elaborate page transitions or animate every component.

Do not add animation demo pages or unnecessary animated sample components.

Motion should be available and configured, but application-specific animations will be added later.

---

# 9. Application Providers

Create a clean provider setup.

Include only providers that have an immediate infrastructure purpose.

Examples:

- TanStack Query provider
- Theme provider, if the copied design system requires one
- next-intl provider
- Sonner toaster
- Platform runtime provider, if necessary

Avoid deeply nested providers when simple utilities would work.

Keep providers in client components only when required.

Do not turn the entire Next.js application into a client component unnecessarily.

Prefer React Server Components as the default where applicable, with clear client-component boundaries.

---

# 10. HTTP Client and TanStack Query

Configure Axios and TanStack Query for future use.

Do not implement actual CampusFix API calls.

## Axios

Create one centralized Axios client.

For browser-side application requests, use the relative backend path:

`/backend`

Do not hardcode absolute localhost API URLs in browser code.

Prepare:

- Base configuration
- Request timeout
- Basic error normalization
- Typed API error handling

Do not introduce authentication interceptors, token refresh, or authorization logic.

## TanStack Query

Create a centralized QueryClient configuration.

Use sensible defaults for:

- Stale time
- Retry behavior
- Error handling

Do not install query persistence packages at this stage.

Do not introduce offline synchronization or background queues.

TanStack Query should be ready for feature development but should not contain feature-specific queries.

---

# 11. Forms and Validation

Configure:

- React Hook Form
- Zod
- @hookform/resolvers

Prepare minimal generic integration utilities only if necessary.

Do not generate reporting forms or application-specific validation schemas.

Use standard TypeScript type inference from Zod where possible.

---

# 12. Platform Detection and Mobile Bridge

The web application must run in two contexts:

1. A normal browser.
2. A React Native WebView.

Create a minimal platform abstraction.

Suggested API:

```ts
type Platform = 'web' | 'android' | 'ios';

interface PlatformInfo {
  platform: Platform;
  isNative: boolean;
  isWeb: boolean;
}
```

Expose this information through a reusable hook or equivalent abstraction:

```ts
const { platform, isNative, isWeb } = usePlatform();
```

## Bridge communication

Use:

- `window.ReactNativeWebView.postMessage` for web-to-native communication.
- React Native WebView `onMessage` for receiving web messages.
- `injectJavaScript` for native-to-web communication.

Implement a small, versioned message protocol.

Only the following functionality is required now:

- Web application announces readiness.
- Native container sends platform information.
- Web application identifies Android or iOS.
- Browser runs without a native bridge.
- Bridge connection state is available.
- Unknown or invalid messages are ignored safely.

Handle message ordering and initialization races.

Validate received messages.

Do not rely exclusively on user-agent detection.

Do not import React Native modules into the Next.js application.

Avoid using browser globals during server-side rendering.

Platform detection must be hydration-safe.

## Future extensibility

Design the bridge so that native capabilities can be added later, including:

- Camera
- Image selection
- File access
- Native notifications
- Device information

**Do not implement these features now.**

Do not add Expo ImagePicker yet.

Do not introduce unnecessary generic RPC frameworks or heavy bridge abstractions.

Since there is no shared packages directory, keep the protocol minimal and maintain matching message definitions on the web and mobile sides.

Document the protocol clearly.

---

# 13. Mobile Application — Thin WebView Container

Initialize `mobile/` using Expo and React Native with TypeScript.

Use the simplest supported Expo application template.

Do not introduce Expo Router, React Navigation, tabs, or native pages.

The mobile application should contain only the code necessary to host the web application and interact with its platform bridge.

## Required behavior

- Render the Next.js application inside WebView.
- Occupy the available screen.
- Respect Android and iOS safe areas.
- Support portrait and landscape layouts without breaking the container.
- Show a loading indicator during the initial load.
- Show a simple retry interface if the web application cannot load.
- Avoid rendering browser-style navigation controls.
- Handle Android hardware back navigation using WebView history when appropriate.
- Properly clean up event listeners.
- Identify the native operating system to the web application.

Do not recreate web routes as native routes.

Do not create native headers, bottom tabs, or duplicated layouts.

The web application will handle its own navigation and interface.

The mobile app is a host, not a second frontend.

---

# 14. Localhost and Development Networking

This is a critical requirement.

The project is intended to work locally without requiring cloud deployment.

The Next.js application will run on:

`http://localhost:3000`

The Fastify backend will run on:

`http://localhost:4000`

## Configurable mobile URL

Support:

`EXPO_PUBLIC_WEB_URL`

Provide `mobile/.env.example`.

The WebView must load the configured URL.

Do not hardcode a single development-machine IP.

## Supported environments

### Desktop browser

Use:

`http://localhost:3000`

### iOS Simulator

Support:

`http://localhost:3000`

when the simulator shares access to the development computer's loopback interface.

### Android Emulator

Prefer Android Debug Bridge reverse forwarding:

`adb reverse tcp:3000 tcp:3000`

This allows the emulator's WebView to load:

`http://localhost:3000`

Also document:

`http://10.0.2.2:3000`

as an alternative emulator-to-host address, including its limitations for secure-context browser APIs.

### Physical Android device

Support either:

- `adb reverse` over USB with the WebView pointed to `localhost:3000`, or
- The development computer's LAN IP address.

### Physical iOS device

Use a reachable LAN address or another explicitly configured accessible development endpoint.

Do not assume localhost on a physical iPhone refers to the development computer.

## Host binding

Configure Next.js development scripts to listen on:

`0.0.0.0`

Allow the application to be reached from appropriate local network interfaces.

Any cleartext HTTP permissions necessary for Expo/WebView development must be development-scoped wherever technically feasible.

Avoid unrestricted insecure transport settings for production builds.

Document platform-specific limitations.

Do not introduce ngrok, cloud tunnels, or external hosting as a requirement.

## Offline expectations

The application should be capable of running on a local network without an internet connection after required dependencies, native builds, and development tooling have been prepared.

Do not claim that a physical mobile device can load a development-machine web server without an appropriate USB-forwarded or network connection.

Do not implement offline caching, service workers, or embedded offline web bundles yet.

---

# 15. API Foundation

Initialize `api/` as a standalone TypeScript Fastify server.

Use Node.js and Fastify without additional application frameworks.

Suggested structure:

```text
api/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/
│   ├── plugins/
│   ├── routes/
│   ├── lib/
│   ├── app.ts
│   └── server.ts
├── .env.example
├── prisma.config.ts
├── package.json
└── tsconfig.json
```

Adapt directory names where necessary for clarity.

## Core configuration

Implement:

- Fastify initialization
- Environment configuration
- Zod environment validation
- Centralized error handling
- Sensible logging
- Graceful shutdown
- Development server startup
- TypeScript strict mode
- A health-check endpoint

The only required endpoint is:

`GET /api/health`

It should return a simple response indicating that the API process is running.

Do not add domain-specific API endpoints.

## PostgreSQL

Use locally installed PostgreSQL.

Do not require Docker.

Do not require Supabase, Neon, Firebase, or any hosted database.

Provide:

`DATABASE_URL`

through `api/.env.example`.

Never commit credentials.

## Prisma

Install and configure the current compatible Prisma version.

Use `prisma.config.ts` when required by the installed Prisma version.

Prepare:

- PostgreSQL datasource
- Prisma client generation configuration
- Migration commands
- Database connection module
- Proper connection lifecycle handling

Follow the installed Prisma version's requirements for driver adapters and generated-client output.

Do not copy outdated Prisma configuration patterns from older tutorials.

**Do not create CampusFix database models yet.**

Do not create User, Report, Issue, Category, Location, Attachment, Vote, or Status models.

Do not invent a schema just to make Prisma work.

It is acceptable for database migrations to remain uninitialized until the domain model is designed.

Ensure API startup does not unnecessarily fail just because no domain tables exist.

Do not automatically create, drop, or reset databases during project initialization.

Do not introduce seed data yet.

---

# 16. Web-to-API Communication

Use Next.js as the same-origin entry point for frontend API requests.

The Fastify API listens locally on port 4000.

Configure a Next.js rewrite:

```text
Frontend:
  /backend/:path*

Forward to:
  http://127.0.0.1:4000/api/:path*
```

For example:

```text
GET http://localhost:3000/backend/health
```

should reach:

```text
GET http://localhost:4000/api/health
```

This behavior should also work when the web application is loaded inside React Native WebView.

The rewrite runs on the Next.js server, so the mobile device does not need a separate direct connection to Fastify.

Do not add unnecessary frontend CORS workarounds.

Ensure next-intl routing does not intercept `/backend`.

Do not create duplicate Next.js API routes that replicate Fastify functionality.

Keep backend business logic exclusively in `api/`.

---

# 17. Web Directory Organization

Create a small, clear foundation-oriented structure.

Suggested layout:

```text
web/
├── public/
├── src/
│   ├── app/
│   │   └── [locale]/
│   │       ├── layout.tsx
│   │       └── page.tsx
│   ├── components/
│   │   └── ui/
│   ├── hooks/
│   ├── i18n/
│   ├── lib/
│   │   ├── api/
│   │   ├── platform/
│   │   └── utils.ts
│   ├── messages/
│   │   ├── en.json
│   │   └── es.json
│   ├── providers/
│   └── styles/
├── tests/
├── .env.example
├── components.json
├── next.config.ts
├── package.json
└── tsconfig.json
```

Adjust to Next.js conventions and reused VINDEX infrastructure as necessary.

Prefer keeping the structure compact.

Do not create dozens of empty files or speculative abstraction layers.

Do not create feature-specific directories until feature implementation begins.

A minimal neutral page is permitted for verifying:

- Next.js rendering
- Font loading
- Design tokens
- English/Spanish locale switching
- Basic platform identification

Do not build a dashboard, landing page, reporting page, or component showcase.

---

# 18. Development Scripts

Configure convenient scripts at the monorepo root.

Suggested commands:

```text
pnpm dev
pnpm dev:web
pnpm dev:api
pnpm dev:mobile

pnpm build
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm format
pnpm format:check
pnpm test
pnpm test:e2e
pnpm check

pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

Expected behavior:

- `pnpm dev` starts web and API together.
- `pnpm dev:web` starts Next.js.
- `pnpm dev:api` starts Fastify.
- `pnpm dev:mobile` starts Expo.
- `pnpm check` runs applicable formatting, linting, type checking, and unit tests.
- Database scripts target only the API workspace.

Use a minimal process runner if necessary.

Do not automatically launch Expo when running the regular web/API development command.

Do not run migrations automatically on every server startup.

Avoid scripts that assume PostgreSQL is already running unless the script specifically requires it.

Make package-level and root-level commands consistent.

---

# 19. Code Quality

Reuse sensible code-quality practices from VINDEX.

## TypeScript

Enable strict mode.

Avoid:

- `any`
- Unnecessary type assertions
- Untyped message payloads
- Non-null assertions without justification
- Suppressed TypeScript errors

Use clear type names and interfaces.

## ESLint

Reuse VINDEX's generic ESLint conventions where compatible.

Preserve useful rules that improve code correctness and consistency.

Do not carry over VINDEX-specific architectural boundaries or module naming conventions.

## Prettier

Reuse the existing formatting conventions.

Ensure the configuration works for all three projects where applicable.

## Testing

Configure Vitest for appropriate unit tests.

Add a small number of infrastructure-oriented tests for:

- Platform message validation
- Browser platform fallback
- Generic shared utilities where necessary

Configure Playwright for the Next.js application.

A basic locale-routing smoke test is sufficient at initialization.

Do not generate comprehensive application test suites before features exist.

Do not add tests for future CampusFix workflows.

## Git hooks

Inspect VINDEX's Git-hook setup.

Reuse it only if the required scripts can be adapted cleanly and remain lightweight.

Do not copy VINDEX-specific commit validation or architecture scripts blindly.

Do not create complicated Git hooks that slow down hackathon development.

---

# 20. Accessibility and Responsive Foundation

Ensure generic UI infrastructure supports:

- Keyboard interaction
- Visible focus states
- Proper labels
- Semantic HTML
- Sufficient color contrast
- Responsive layouts
- Touch-friendly controls
- Reduced-motion preferences
- Screen-reader-friendly loading indicators

Because the same Next.js application will run inside a mobile WebView, it must not assume a desktop-only viewport.

Configure responsive viewport behavior correctly.

Do not lock the interface into fixed dimensions.

Do not build any CampusFix screens yet.

---

# 21. Environment Variables

Provide `.env.example` files with documented values.

Suggested configuration:

## Web

```env
NEXT_PUBLIC_API_BASE_PATH=/backend
```

Add other environment variables only when necessary.

## Mobile

```env
EXPO_PUBLIC_WEB_URL=http://localhost:3000
```

Document when to override this value for different devices.

## API

```env
NODE_ENV=development
HOST=127.0.0.1
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/campus_fix
```

These are example values, not real credentials.

Do not commit real environment files or secrets.

Use environment validation where appropriate.

---

# 22. Git and Repository Hygiene

Create a root `.gitignore` that covers:

- `node_modules`
- `.next`
- `.expo`
- Build outputs
- Temporary files
- Environment secrets
- Logs
- Test results
- Playwright artifacts
- Local uploads
- Generated database artifacts that should not be committed

Do not ignore source files, lockfiles, migrations, or generated files that are intentionally required for reproducible builds.

Use one pnpm lockfile at the repository root.

Do not create nested Git repositories.

Do not modify the Git configuration of the VINDEX repository.

Do not copy VINDEX's Git history.

---

# 23. Documentation

Create a root README with practical setup instructions.

Include:

1. Project overview
2. Technology stack
3. Directory structure
4. Prerequisites
5. Node.js and pnpm versions
6. Installation
7. Environment configuration
8. Starting PostgreSQL
9. Starting the API
10. Starting the web app
11. Starting the Expo mobile app
12. Running the Android Emulator
13. Running the iOS Simulator
14. Android `adb reverse` setup
15. Physical phone LAN configuration
16. Browser/WebView communication architecture
17. Internationalization configuration
18. API proxy configuration
19. Development scripts
20. Troubleshooting

Explain that Next.js serves the web application and Expo hosts it through WebView.

Explain that the backend is local.

Document any limitations requiring a real device, simulator, platform SDK, or live PostgreSQL instance.

Do not create unnecessary documentation files or lengthy architectural essays.

---

# 24. Explicitly Forbidden Implementation

Do not implement:

- Authentication
- User registration
- Account management
- Issue reporting
- Issue browsing
- Report search
- Duplicate detection
- Upvotes
- Issue status management
- Facilities administration
- Dashboards
- Campus maps
- Photo uploading
- Camera capture
- Native push notifications
- Background synchronization
- AI features
- Application-specific database models
- Business-specific API routes
- Business-specific components
- Application-specific state stores

Do not use:

- Electron
- Capacitor
- Expo Router
- React Navigation
- Supabase
- Firebase
- Hosted databases
- Unnecessary microservices
- An additional shared packages workspace
- Docker as a mandatory dependency

Do not recreate VINDEX business code.

Do not use VINDEX branding.

Do not introduce infrastructure that is unrelated to the current technical foundation.

---

# 25. Implementation Sequence

Perform the work in this order:

### Phase 1 — Inspect VINDEX

Examine `../vindex/web/`.

Identify reusable configuration, fonts, generic components, providers, and development conventions.

### Phase 2 — Initialize monorepo

Create pnpm workspaces, root configuration, and package scripts.

### Phase 3 — Initialize web

Create the Next.js application and configure TypeScript, Tailwind, and dependencies.

### Phase 4 — Reuse frontend foundations

Copy and adapt fonts, generic design-system assets, shadcn components, theme configuration, and reusable utilities.

### Phase 5 — Configure web infrastructure

Set up:

- next-intl
- NProgress
- Motion
- Axios
- TanStack Query
- Sonner
- Providers
- Platform abstraction

### Phase 6 — Initialize mobile

Create the Expo application.

Configure WebView hosting, platform identity communication, safe areas, loading, and connection-error handling.

### Phase 7 — Initialize API

Create Fastify, TypeScript, Prisma, PostgreSQL configuration, and the health-check endpoint.

### Phase 8 — Connect development servers

Configure Next.js backend rewrites and local development networking.

### Phase 9 — Configure tooling

Set up scripts, linting, formatting, tests, and repository hygiene.

### Phase 10 — Verify

Run the appropriate checks and fix discovered setup problems.

---

# 26. Verification and Acceptance Criteria

The initialization is complete when the following criteria are satisfied.

## Workspace

- `pnpm install` succeeds.
- pnpm recognizes web, mobile, and API workspaces.
- There is one root lockfile.
- No unnecessary packages workspace exists.

## Web

- Next.js starts successfully.
- React and TypeScript compile.
- Tailwind styles work.
- Reused fonts load correctly.
- Generic shadcn components are available.
- English routes work.
- Spanish routes work.
- Locale switching works.
- NProgress is integrated with navigation.
- Motion is configured and available.
- Platform detection defaults correctly in a normal browser.
- Production web build succeeds.

## Mobile

- Expo project configuration is valid.
- React Native WebView loads a configured development URL.
- The native platform can identify itself to the web application.
- Loading and connection-error states are handled.
- The app has no duplicate native navigation system.

If a simulator or device is unavailable, perform static and tooling checks instead and report the limitation.

## API

- Fastify compiles.
- The health-check endpoint works.
- Prisma configuration is valid.
- PostgreSQL environment configuration is documented.
- The API does not contain business models or business routes.

## Integration

- Next.js can proxy `/backend/health` to Fastify.
- The web application can run without React Native.
- The mobile wrapper can host the same application.
- The VINDEX source repository remains unchanged.

## Quality

- ESLint passes.
- Prettier checks pass.
- TypeScript checks pass.
- Unit tests pass.
- Relevant builds pass.

Do not claim successful tests that were not actually executed.

If PostgreSQL, Android SDK, Xcode, or physical devices are unavailable, explain precisely what could not be verified.

---

# 27. Final Delivery

After completing the setup, provide a concise report covering:

### Created structure

Show the final directory tree, excluding dependencies and generated build output.

### Reused VINDEX resources

Specify which files or configurations were copied or adapted from:

`../vindex/web/`

Indicate any important modifications made to detach them from VINDEX.

### Installed dependencies

Summarize the relevant libraries for each workspace.

### Verification

Identify which checks passed, failed, or could not be run.

### Development commands

Provide the exact commands for:

- Installing dependencies
- Configuring environment files
- Starting web and API
- Starting Expo
- Setting up Android `adb reverse`
- Running quality checks

### Remaining work

Mention any missing prerequisites or development-environment limitations.

Do not implement application features to resolve those limitations.

---

# 28. Final Engineering Principles

Follow these principles throughout:

**Reuse before rebuilding.**

The existing VINDEX frontend contains valuable tested infrastructure. Adapt its generic foundations rather than introducing unnecessary alternative implementations.

**One frontend, multiple environments.**

The Next.js application owns the UI and frontend application logic. React Native is only a native host.

**Offline-first development environment, not offline application features.**

All core development servers should run locally. No cloud services should be required for the initial setup.

**Keep the backend separate.**

Fastify owns the API and Prisma integration. Next.js is primarily the frontend and local same-origin proxy.

**No premature business architecture.**

Do not invent domain boundaries, modules, database entities, workflows, or abstractions before the CampusFix feature requirements are implemented.

**Small, high-quality foundation.**

The result should feel like the beginning of a professionally maintained application, not an oversized enterprise framework.

**Do the work.**

Do not stop after suggesting a plan.

Inspect the reference project, create the files, install the dependencies, configure the workspaces, execute verification commands, fix discoverable errors, and report the final state.

Do not modify `../vindex/web/` under any circumstances.

Proceed with implementation now.
