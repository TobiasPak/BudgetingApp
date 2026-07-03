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

**Budget envelopes + dashboard home + income tracking. Foundation otherwise unchanged.**

Implemented:
- Project scaffold (Vite + React 18 + TypeScript), clean `npm install`
- Routing: `/` (dashboard home), `/budget` (Budget envelopes + income), `/about` (placeholder)
- Tailwind v4 + shadcn/ui wired up (`components.json`, `src/lib/utils.ts`,
  components: `button`, `card`, `progress`, `dialog`, `input`, `label`, `select`)
- Semantic color tokens `--success`/`--info`/`--warning` added to
  `src/index.css` (light + dark values) alongside the pre-existing
  `--destructive`, since the installed shadcn Nova theme's `--chart-1..5`
  are grayscale in this preset, not a colorful palette
- TanStack Query `QueryClientProvider` wired in `src/main.tsx`
- **`useBudgetStore`** (Zustand) — first real store. Holds `categories`
  (`BudgetCategory[]`, a `fixed`/`percentage` discriminated union — see
  Architecture below), `paychecks` (`Paycheck[]`), `bankBalance`,
  `paychecksPerMonth`. Actions: `updateSpent`, `addCategory`, `addPaycheck`,
  `removePaycheck`, `setBankBalance`, `setPaychecksPerMonth`. Seeded with 9
  mock categories (7 fixed + 2 percentage: Savings 15%-of-income, Tax
  Savings 12%-per-paycheck) and 2 mock paychecks dated in the current month
- **Income tracking**: paychecks are the source of truth for income —
  "money earned this month" is *derived* by summing paychecks dated in the
  current month (`src/lib/income.ts`), not a separately-typed number, so it
  can't drift from what's actually logged. Yearly projection = monthly × 12.
  Percentage-based budgets resolve their dollar target from either
  `monthlyIncome` (the running sum) or `averagePaycheckAmount ×
  paychecksPerMonth` (a projection independent of how many paychecks have
  landed yet this month) — see `getMonthlyTarget` in `src/lib/income.ts`
- **Budget envelopes page** (`/budget`): `IncomeOverview` (earned this
  month, projected this year, editable bank balance, this-month paycheck
  list with remove + an "Add paycheck" dialog), `BudgetSummary`
  (monthly/yearly totals, ×12 derived), category grid with an "Add budget"
  dialog (name + fixed-amount-or-percentage, React Hook Form + Zod — the
  first real form in the app), overspend alerts derived per-category (not
  stored — see `src/lib/budget.ts`)
- **Dashboard home** (`/`): 3-column layout — centered "money overview" donut
  (Spent + Remaining budget derived from `useBudgetStore`; Available balance
  now real too, from `bankBalance`; Tax reserve remains a mock constant, no
  running tax-reserve total exists yet) flanked by 4 tall panels (Spending,
  Budget, Income, Tax). Only the Budget panel is interactive (links to
  `/budget`) and shows real derived totals; Spending/Income/Tax render full
  mock content (trend arrows, insight lines) but aren't clickable — those
  domains have no store/feature yet
- Recharts still installed as a dependency with a documented (not yet used) convention
- Firebase client SDK initialized (`src/lib/firebase.ts`) reading
  `VITE_FIREBASE_*` env vars; does not throw with empty/placeholder values
- Firebase project scaffold: `firebase.json`, `.firebaserc` (placeholder
  project id `clearbooks-dev`), locked-down `firestore.rules`,
  `firestore.indexes.json`, Firestore/Auth/Functions emulator config
- Cloud Functions scaffold in `functions/` (own `package.json`/`tsconfig.json`,
  `firebase-admin` + `firebase-functions` installed, compiles clean, no real
  functions yet)
- Git hygiene: `.gitignore` added, `node_modules` untracked from git

Not yet implemented: authentication, Firestore-backed data (everything is
mock/local Zustand state only — nothing persists across a page reload),
Spending/Tax features (dashboard panels are static mock content), a running
tax-reserve balance, Plaid/Veryfi/Resend integrations, tax engine, real
charts, dark-mode toggle (theme is class-based and CSS-ready, but nothing
flips the `.dark` class yet).

**Before real use**: a real Firebase project must be created (console or
`firebase projects:create`) and swapped into `.firebaserc` via
`firebase use --add`. Firebase Hosting was intentionally skipped in this
setup — nothing to deploy yet.

## Architecture / Folder Conventions

```
src/
  assets/          # static images/icons (currently empty — template assets removed)
  components/
    ui/            # shadcn-generated primitives (button, card, progress,
                    # dialog, input, label, select)
    budget/        # Budget feature components (BudgetEnvelopeCard, BudgetSummary,
                    # IncomeOverview, AddBudgetDialog, AddPaycheckDialog)
    dashboard/     # Dashboard home components (DashboardPanel, MoneyOverviewCard)
    charts/        # Recharts wrapper components (future — not the same as
                    # MoneyOverviewCard's donut, which is a hand-rolled CSS
                    # conic-gradient, not Recharts)
  pages/           # route-level components (HomePage = dashboard, BudgetPage, AboutPage)
  stores/          # Zustand stores, one file per domain, named use<Domain>Store.ts
                    # (useBudgetStore.ts is the first one — categories, paychecks,
                    # bankBalance, paychecksPerMonth all live here)
  lib/
    firebase.ts    # Firebase SDK init: `app`, `db` eager; `getFirebaseAuth()` lazy
                    # (getAuth() throws eagerly on missing/invalid API key, unlike
                    # getFirestore() — call getFirebaseAuth() only where auth is used)
    utils.ts       # shadcn cn() helper
    budget.ts      # derived budget helpers (isOverBudget, progressPercent) — take
                    # an already-computed monthlyTarget, don't compute it themselves
    income.ts      # derived income helpers (getMonthlyIncome, getYearlyProjectedIncome,
                    # getAveragePaycheckAmount, getMonthlyTarget — resolves a
                    # BudgetCategory's dollar target from income context)
    schemas/
      budget.ts    # Zod schemas: addBudgetSchema, addPaycheckSchema
  hooks/           # custom hooks incl. TanStack Query hooks (created on first use)
  types/
    budget.ts      # BudgetCategory (fixed | percentage discriminated union),
                    # ChartColorToken, DistributiveOmit utility
    paycheck.ts    # Paycheck (id, amount, date as ISO "YYYY-MM-DD" string)
  vite-env.d.ts    # ImportMetaEnv typing for VITE_FIREBASE_* vars

functions/
  src/index.ts     # Cloud Functions entry point (empty placeholder for now)
```

Conventions:
- Zustand stores: `src/stores/`, one file per domain slice, `use<Domain>Store.ts`
- Derived/computed values (e.g. overspend, progress %, monthly income,
  a percentage-budget's dollar target) live in `src/lib/`, not as extra
  fields on the store — avoids stored state drifting from the raw numbers
  it's computed from
- TanStack Query hooks: `src/hooks/`, colocated with the feature that uses them
- Form schemas: `src/lib/schemas/` (Zod); forms use React Hook Form +
  `@hookform/resolvers/zod`. For a schema representing "one of several
  shapes based on a discriminant field" (e.g. fixed vs. percentage budget),
  prefer a **flat Zod object + `.superRefine()`** over `z.discriminatedUnion`
  — React Hook Form's `register`/`errors`/`watch` generics don't work
  cleanly against a union type (see `addBudgetSchema` in
  `src/lib/schemas/budget.ts`)
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
- **shadcn primitives generated by this project's CLI/registry version are
  NOT wrapped in `React.forwardRef` by default** — `Button`, `Input`,
  `DialogOverlay`, and `DialogContent` all needed a manual `forwardRef` fix
  (see Session Log below for why this matters — it silently broke
  `DialogTrigger asChild` composition and React Hook Form's uncontrolled-
  field `defaultValues`/`reset()`). `Label` and the `Card` subcomponents
  have the same latent gap but aren't currently ref'd by anything, so they
  weren't fixed speculatively. **If a future component needs to attach a
  ref to a local shadcn wrapper (not a bare Radix primitive), check first
  whether it's `forwardRef`-wrapped and fix it if not**, following the
  pattern in `src/components/ui/button.tsx`.
- React Hook Form's `useForm` forms with conditionally-rendered fields (e.g. a
  fixed-vs-percentage type switch) **must** pass `shouldUnregister: true`
  to `useForm()` — otherwise a field's stale value survives after its input
  unmounts and can fail Zod validation for a branch that's no longer active
  (see `AddBudgetDialog.tsx`)
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

### 2026-07-03 — Income tracking + configurable budgets
- User asked for the Budget screen to show money earned this month,
  projected yearly income, bank balance, and to support adding different
  kinds of budgets (percentage-of-paycheck, fixed amounts, tax savings)
  that calculate their own monthly savings target and track spend against
  it. Clarified up front: income comes from itemized paychecks (summed,
  not a manually-typed total), percentage budgets pick their basis
  (per-paycheck vs. monthly income) per-category, and "add budget" is a
  dialog form.
- Redesigned `BudgetCategory` (`src/types/budget.ts`) from a flat interface
  to a `fixed | percentage` discriminated union; added `Paycheck`
  (`src/types/paycheck.ts`) and a `DistributiveOmit<T, K>` utility (plain
  `Omit` over a union only keeps keys common to every member — needed a
  distributive version for `addCategory`'s parameter type).
- Added `src/lib/income.ts`: `getMonthlyIncome`/`getCurrentMonthPaychecks`
  (careful to compare date strings' own Y/M components rather than
  `new Date(dateStr)`, which parses as UTC midnight and can shift a day in
  negative-offset timezones), `getYearlyProjectedIncome` (× 12, same
  derived-not-stored pattern as the existing monthly→yearly budget
  numbers), `getAveragePaycheckAmount` (averaged over *all* paychecks ever,
  not just this month's, so a "per paycheck" percentage budget still has a
  meaningful projected target early in the month before any paycheck has
  landed yet), `getMonthlyTarget` (resolves a category's dollar target from
  income context — this is what lets percentage budgets stay derived rather
  than storing a dollar amount that could drift from the actual rule).
- Extended `useBudgetStore`: `paychecks`, `bankBalance`, `paychecksPerMonth`
  state; `addPaycheck`/`removePaycheck`/`setBankBalance`/
  `setPaychecksPerMonth` actions. Re-seeded categories in the new
  fixed/percentage shape (Savings → 15% of monthly income, added a new Tax
  Savings category → 12% per paycheck, matching the user's own example).
- Built the first real forms in the app: `AddBudgetDialog` and
  `AddPaycheckDialog` (React Hook Form + Zod + shadcn `Dialog`/`Select`).
  Added shadcn `dialog`, `input`, `label`, `select`. Built `IncomeOverview`
  (earned this month, projected this year, editable bank balance, this-
  month paycheck list with remove buttons, "Add paycheck" trigger) and
  wired both dialogs + `IncomeOverview` into `BudgetPage`.
- **Two real, non-obvious bugs found and fixed during verification**
  (both are now documented as standing conventions above, not just one-off
  fixes):
  1. This project's installed shadcn primitives (`Button`, `Input`,
     `DialogOverlay`, `DialogContent`) are plain function components, not
     wrapped in `React.forwardRef`. This silently broke two things:
     `DialogTrigger asChild` wrapping a `Button` couldn't attach its ref
     (React warning, and contributed to Radix's Presence/dismissable-layer
     tracking behaving inconsistently), and React Hook Form's `register()`
     couldn't attach its ref to `Input`, so **uncontrolled-field
     `defaultValues` silently never applied** (a date field meant to
     default to today stayed empty). Fixed by wrapping all four in
     `React.forwardRef`, matching what modern shadcn actually generates.
  2. `AddBudgetDialog`'s conditionally-rendered `monthlyAmount` field (only
     shown when type is "fixed") left a stale value behind in React Hook
     Form's internal state after switching to "percentage" and unmounting
     it, because `shouldUnregister` defaults to `false`. That stale value
     was `NaN` (an empty string run through `valueAsNumber`), and Zod's
     `.optional()` only tolerates `undefined`, not `NaN` — so submitting a
     percentage budget failed base-schema validation on a field that
     wasn't even visible, independent of the category's actual `type`.
     Fixed with `shouldUnregister: true` on `useForm()`.
  - Diagnosing bug #2 required bypassing `console.log`/`preview_console_logs`
    entirely partway through — that tool's log buffer accumulates for the
    whole session and never clears/ages out, so "is this error from my
    latest change or five reloads ago" was impossible to answer from logs
    alone. Switched to writing state directly onto `window.__debugX` and
    reading it back synchronously in the same `preview_eval` call, which
    gave a reliable answer. Worth remembering for future browser-based
    debugging in this environment: prefer `window`-variable handoff over
    console-log inspection when call-to-call ordering matters.
  - Also noticed: separate `preview_eval` calls in a row against an
    open Radix `Dialog` sometimes caused it to close between calls
    (plausibly a focus-change side effect of how the tool executes JS
    being interpreted as an "outside click" by Radix's dismissable layer).
    Doing an entire multi-step interaction (open → fill → select → submit)
    inside one `async` `preview_eval` call with small `setTimeout` waits
    between steps was reliable; splitting the same steps across multiple
    tool calls was not.
- Verified end-to-end via the dev server: added both a percentage category
  (Vacation Fund, 5% of monthly income → correctly computed $260 target
  off $5,200 income) and a fixed category (Emergency Fund, $200), each
  correctly folding into the monthly/yearly summary totals; added and
  removed a paycheck and confirmed "earned this month"/"projected this
  year"/every percentage-budget target recalculated correctly; confirmed
  the dashboard's Budget panel and money-overview donut pick up the same
  real totals. `tsc -b`, `npm run lint`, `npm run build` all clean.
