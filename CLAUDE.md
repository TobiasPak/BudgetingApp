# ClearBooks

## Project Overview

ClearBooks is a personal & business finance and tax app for California
workers across all income types — W-2 employees, 1099 contractors,
self-employed/sole proprietors, and gig workers (Uber, DoorDash, Airbnb),
including hybrid users who combine several of these.

Planned feature areas (not yet built — see Current Status):
- Bank connectivity via Plaid (12,000+ institutions, OAuth, auto-categorization,
  recurring subscription detection)
- Personal budgeting envelopes with progress bars and overspend alerts
- Income tracking across W-2/1099-NEC/1099-K sources, with OCR form upload (Veryfi)
- Business expense tracking: personal/business split, Schedule C categories,
  receipt OCR, partial-deduction flagging (meals 50%, home office %, mixed-use)
- Mileage tracking: manual entry + MileIQ import, current IRS standard rate
- **Tax tracker (core differentiator)**: live dual federal (IRS) + California
  (FTB) tax calculations updated on every income/expense event — brackets,
  self-employment tax, QBI deduction, standard deduction, CA SDI, quarterly
  payment tracking for both agencies, tax savings fund, year-end PDF/CSV
  export mapped to Schedule C / Form 1040 / CA Form 540

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite (rolldown-vite/oxlint toolchain) |
| Routing | React Router v6 (v7 package, `react-router-dom`) |
| State | Zustand (client state) + TanStack Query (server/async state) |
| UI / Styling | shadcn/ui (radix base, Nova preset) + Tailwind CSS v4 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Backend | Firebase Cloud Functions (Node.js + TypeScript) |
| Database & Auth | Firebase Firestore + Firebase Auth |
| Bank connectivity | Plaid (not yet integrated) |
| Receipt OCR | Veryfi (not yet integrated) |
| Mileage | Manual entry + MileIQ import (not yet built) |
| Email | Resend or SendGrid (not yet integrated) |
| Tax engine | Custom Node.js module, IRS + CA FTB (not yet built) |
| Package manager | npm |

Note: `npm create vite@latest` currently defaults to React 19 + rolldown-vite.
React was explicitly pinned to `^18.3.1` per spec; the rolldown-vite/oxlint
toolchain (vite 8.x, oxlint instead of eslint) was kept as-is since that's
what the installed create-vite version ships.

## Current Status

**First feature built: Budget envelopes + dashboard home. Foundation otherwise unchanged.**

Implemented:
- Project scaffold (Vite + React 18 + TypeScript), clean `npm install`
- Routing: `/` (dashboard home), `/budget` (Budget envelopes), `/about` (placeholder)
- Tailwind v4 + shadcn/ui wired up (`components.json`, `src/lib/utils.ts`,
  components: `button`, `card`, `progress`)
- Semantic color tokens `--success`/`--info`/`--warning` added to
  `src/index.css` (light + dark values) alongside the pre-existing
  `--destructive`, since the installed shadcn Nova theme's `--chart-1..5`
  are grayscale in this preset, not a colorful palette
- TanStack Query `QueryClientProvider` wired in `src/main.tsx`
- **`useBudgetStore`** (Zustand) — first real store, seeded with 8 mock
  budget categories; `updateSpent`/`addCategory` actions available but not
  yet invoked by any UI
- **Budget envelopes page** (`/budget`): per-category cards with progress
  bars and overspend alerts (derived, not stored — see `src/lib/budget.ts`),
  monthly + yearly (×12 derived) summary
- **Dashboard home** (`/`): 3-column layout — centered "money overview" donut
  (2 of 4 slices real, derived from `useBudgetStore`; 2 are mock constants)
  flanked by 4 tall panels (Spending, Budget, Income, Tax). Only the Budget
  panel is interactive (links to `/budget`); Spending/Income/Tax render full
  mock content (trend arrows, insight lines) but aren't clickable — those
  domains have no store/feature yet
- React Hook Form, Zod, `@hookform/resolvers`, Recharts still installed as
  dependencies with documented (not yet used) conventions
- Firebase client SDK initialized (`src/lib/firebase.ts`) reading
  `VITE_FIREBASE_*` env vars; does not throw with empty/placeholder values
- Firebase project scaffold: `firebase.json`, `.firebaserc` (placeholder
  project id `clearbooks-dev`), locked-down `firestore.rules`,
  `firestore.indexes.json`, Firestore/Auth/Functions emulator config
- Cloud Functions scaffold in `functions/` (own `package.json`/`tsconfig.json`,
  `firebase-admin` + `firebase-functions` installed, compiles clean, no real
  functions yet)
- Git hygiene: `.gitignore` added, `node_modules` untracked from git

Not yet implemented: authentication, Firestore-backed data (Budget is
mock/local Zustand state only), Spending/Income/Tax features (dashboard
panels are static mock content), Plaid/Veryfi/Resend integrations, tax
engine, real forms, real charts, dark-mode toggle (theme is class-based
and CSS-ready, but nothing flips the `.dark` class yet).

**Before real use**: a real Firebase project must be created (console or
`firebase projects:create`) and swapped into `.firebaserc` via
`firebase use --add`. Firebase Hosting was intentionally skipped in this
setup — nothing to deploy yet.

## Architecture / Folder Conventions

```
src/
  assets/          # static images/icons (currently empty — template assets removed)
  components/
    ui/            # shadcn-generated primitives (button, card, progress)
    budget/        # Budget feature components (BudgetEnvelopeCard, BudgetSummary)
    dashboard/     # Dashboard home components (DashboardPanel, MoneyOverviewCard)
    charts/        # Recharts wrapper components (future — not the same as
                    # MoneyOverviewCard's donut, which is a hand-rolled CSS
                    # conic-gradient, not Recharts)
  pages/           # route-level components (HomePage = dashboard, BudgetPage, AboutPage)
  stores/          # Zustand stores, one file per domain, named use<Domain>Store.ts
                    # (useBudgetStore.ts is the first one)
  lib/
    firebase.ts    # Firebase SDK init: `app`, `db` eager; `getFirebaseAuth()` lazy
                    # (getAuth() throws eagerly on missing/invalid API key, unlike
                    # getFirestore() — call getFirebaseAuth() only where auth is used)
    utils.ts       # shadcn cn() helper
    budget.ts      # derived budget helpers (isOverBudget, progressPercent) —
                    # kept out of the store so nothing can drift out of sync
    schemas/        # Zod schemas for forms
  hooks/           # custom hooks incl. TanStack Query hooks (created on first use)
  types/
    budget.ts      # BudgetCategory, ChartColorToken
  vite-env.d.ts    # ImportMetaEnv typing for VITE_FIREBASE_* vars

functions/
  src/index.ts     # Cloud Functions entry point (empty placeholder for now)
```

Conventions:
- Zustand stores: `src/stores/`, one file per domain slice, `use<Domain>Store.ts`
- Derived/computed values (e.g. overspend, progress %) live in `src/lib/`,
  not as extra fields on the store — avoids stored state drifting from the
  raw numbers it's computed from
- TanStack Query hooks: `src/hooks/`, colocated with the feature that uses them
- Form schemas: `src/lib/schemas/` (Zod); forms use React Hook Form +
  `@hookform/resolvers/zod`
- Chart components: `src/components/charts/` (Recharts wrappers)
- Feature-specific component groupings: `src/components/<feature>/`
  (e.g. `budget/`, `dashboard/`) — `components/ui/` is reserved for
  shadcn-generated primitives only
- **Never build Tailwind class names via template literals**
  (e.g. `` `text-${variable}` ``) — Tailwind's JIT scanner only picks up
  literal class-name strings that appear as complete tokens somewhere in
  source. Use an explicit `Record<T, string>` lookup instead (see
  `BudgetEnvelopeCard.tsx`'s `colorClass` map or `DashboardPanel.tsx`'s
  `toneClasses`/`progressIndicatorClasses`). For genuinely dynamic values
  (e.g. a computed conic-gradient), use inline `style`, not a class name.
- shadcn `Progress`: fill element has `data-slot="progress-indicator"` —
  target it via `[&_[data-slot=progress-indicator]]:bg-*` for color
  overrides, not a positional selector like `[&>div]`.
- Semantic color tokens: `--destructive` (pre-existing) plus `--success`/
  `--info`/`--warning` (added this session) in `src/index.css`, each with
  light + dark values, registered in the `@theme inline` block so Tailwind
  generates `text-*`/`bg-*`/`border-*` utilities. Use these for meaning
  (status, category identity) rather than `--chart-1..5`, which are
  grayscale in the installed Nova preset.
- Cloud Functions live in `functions/` — separate `package.json`/`tsconfig.json`,
  own dependency tree (`firebase-admin`, `firebase-functions`)
- Client env vars: only `VITE_FIREBASE_*` (see `.env.example`). Plaid/Veryfi/Resend
  keys are Cloud Functions secrets (`firebase functions:secrets:set`), never
  exposed as client env vars
- Path alias `@/*` → `src/*` (configured in `tsconfig.app.json` + `vite.config.ts`)

## Session Log

**Process note: update this section at the end of every work session** —
append a dated entry summarizing what was built, and refresh "Current Status"
above so it always reflects the real state of the repo.

### 2026-07-01 — Foundation scaffolding
- Found repo was not actually scaffolded despite 2 prior commits: no
  `package.json`/`vite.config`/`tsconfig`/`index.html` existed anywhere;
  `node_modules` (431 files) was committed with no `.gitignore`; it was a
  stray React 19 + rolldown-vite artifact inconsistent with the confirmed
  React 18 spec. `src/`/`public/` held unmodified `npm create vite`
  boilerplate (counter demo, docs links) — zero custom app code.
- Discarded the stray `node_modules`, regenerated via
  `npm create vite@latest . -- --template react-ts` (scaffolded into a temp
  dir first, then merged in, to avoid the CLI's non-empty-directory prompt),
  pinned React to `^18.3.1`/`^18.3.1` (react/react-dom) and matching `@types/*`.
- Installed `react-router-dom`, `zustand`, `@tanstack/react-query`,
  `react-hook-form` + `zod` + `@hookform/resolvers`, `recharts`, `firebase`.
- Discovered `tailwindcss` resolved to v4 (not v3) — used `@tailwindcss/vite`
  plugin + `@import "tailwindcss";` instead of the old PostCSS-based setup;
  removed the initially-installed `postcss`/`autoprefixer` since v4 + the Vite
  plugin doesn't need them.
- Ran `npx shadcn@latest init -t vite -b radix -p nova -y` then
  `add button` — generated `components.json`, `src/lib/utils.ts`,
  `src/components/ui/button.tsx`, and a full CSS variable theme in
  `src/index.css`.
- Built `src/main.tsx` (BrowserRouter + QueryClientProvider),
  `src/App.tsx` (Routes), `src/pages/HomePage.tsx` and `AboutPage.tsx`
  (placeholder content proving Tailwind + shadcn Button + routing work
  together). Deleted all unused template assets and `src/App.css`.
- Hand-authored Firebase config (`firebase.json`, `.firebaserc`,
  `firestore.rules` locked down, `firestore.indexes.json`) rather than
  fighting `firebase init`'s interactive prompts non-interactively; scaffolded
  `functions/` (TypeScript, `firebase-admin` + `firebase-functions`
  installed, compiles clean with `tsc --noEmit`).
- Added `src/lib/firebase.ts` (client SDK init from `VITE_FIREBASE_*` env
  vars) and `.env.example`. Found `getAuth()` throws synchronously on a
  missing/invalid API key (confirmed via a standalone Node script) while
  `getFirestore()` doesn't — fixed by lazy-initializing auth behind a
  `getFirebaseAuth()` accessor so merely importing the module never crashes
  the app before `.env.local` is configured.
- Added `.gitignore`; ran `git rm -r --cached node_modules` to untrack it.
- Verified end-to-end via the dev server: page renders "ClearBooks" heading,
  Tailwind + shadcn Button styling apply correctly, Home ↔ About client-side
  navigation works, no console errors.
- No feature work done. Next session starts feature planning fresh (likely
  candidates: authentication, app shell/nav, first real Zustand store).

### 2026-07-02 — Budget envelopes + dashboard home (first feature)
- Started as a standalone Budget page linked from a plain Home page (per
  the prior session's plan), but paused mid-implementation when the user
  asked to discuss the home-screen architecture instead — used the
  visualize tool to mock up a dashboard-with-panels concept before writing
  any dashboard code, iterating through 3 rounds (panel layout → added
  trend/insight lines + a central donut → moved the donut to the center
  with tall panels flanking it) before locking in the design.
- Built the Budget feature as originally planned: `src/types/budget.ts`,
  `src/stores/useBudgetStore.ts` (8 mock categories), `src/lib/budget.ts`
  (derived `isOverBudget`/`progressPercent`), `BudgetEnvelopeCard`,
  `BudgetSummary`, `BudgetPage` at `/budget`. Added shadcn `card`/`progress`.
- Built the dashboard home (`/`) per the approved mockup: `DashboardPanel`
  (shared tall panel shell) and `MoneyOverviewCard` (donut). Only the
  Budget panel is real/interactive this session — Spending/Income/Tax are
  static mock content, matching the user's explicit choice to keep them
  visually identical to the mockup but non-clickable.
- Found the installed shadcn Nova theme's `--chart-1..5` tokens are
  grayscale, not colorful — asked the user how to handle the mockup's
  distinct panel colors, and added real `--success`/`--info`/`--warning`
  CSS variables (light + dark) to `src/index.css` rather than either
  faking colors with hex values or flattening the design to grayscale.
- The donut's conic-gradient is computed in JS and applied via inline
  `style` (not a Tailwind class) since the percentages are dynamic —
  documented this pattern, plus the general "don't build Tailwind class
  names via template literals" rule, in Architecture above.
- Verified end-to-end via the dev server: dashboard renders correctly at
  desktop width (single-column below the `md` breakpoint, 3-column above),
  only the Budget panel is a real `<a>`/link element per the accessibility
  tree, Budget page shows correct per-category over/under styling (exactly
  matching mock data), monthly/yearly totals arithmetically correct, donut
  slice values match the store's real totals, `tsc -b`/`npm run lint`/
  `npm run build` all clean, dark-mode CSS variables verified correct via
  manually toggling the `.dark` class (no toggle UI exists yet, so
  `prefers-color-scheme` emulation alone doesn't activate it — that's
  expected given no dark-mode toggle has been built).
- Noted but not investigated further: the `preview_click` tool didn't
  trigger React Router navigation on the dashboard's `Link` elements
  (dispatching `.click()` via `preview_eval` worked immediately) — likely
  a tool-level event quirk, not an app bug, since manual `.click()`
  navigated correctly both directions.
