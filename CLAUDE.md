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

**Budget envelopes + dashboard home + income tracking + month/year ledger navigation. Foundation otherwise unchanged.**

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
  Architecture below), `paychecks` (`Paycheck[]`), `purchases`
  (`Purchase[]`), `bankBalance`, `paychecksPerMonth`. Actions: `addCategory`,
  `addPaycheck`, `removePaycheck`, `addPurchase`, `removePurchase`,
  `setBankBalance`, `setPaychecksPerMonth`. Seeded with 9 mock categories (7
  fixed + 2 percentage: Savings 15%-of-income, Tax Savings 12%-per-paycheck),
  2 mock paychecks, and ~19 itemized mock purchases (all dated in the
  current month)
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
  (monthly/yearly totals, ×12 derived), a log-style row list (not a card
  grid) with an "Add budget" dialog (name + fixed-amount-or-percentage +
  reset day, React Hook Form + Zod), overspend alerts derived per-category
  (not stored — see `src/lib/budget.ts`)
- **Itemized purchases**: a category's "spent" amount isn't stored — it's
  *derived* by summing that category's `Purchase` records (date,
  description, amount) that fall within its current reset cycle (see
  `getCategorySpent` in `src/lib/purchases.ts`), same derived-not-stored
  pattern as income. Clicking a category row expands an inline panel below
  it (`CategoryPurchases`) showing that category's purchase list (with
  remove buttons) plus a small React Hook Form + Zod "add purchase" form
  (date, description, amount)
- **Month/year ledger navigation** (`/budget`): a `MonthYearPicker`
  (prev/next arrow buttons + a clickable month/year label opening a
  popover with month/year `Select` dropdowns, plus a "Back to current"
  link when viewing a past month) lets the whole Budget page "time
  travel" to a past month and see that month's ledger — paychecks,
  category spend, and reset-cycle date ranges all recompute for the
  viewed month instead of always showing the current one. Implemented by
  threading an optional `reference: Date = new Date()` parameter through
  every derived-value helper (`getCategoryPurchases`/`getCategorySpent`
  in `src/lib/purchases.ts`, `getCurrentPeriod` in `src/lib/period.ts`,
  `getMonthlyIncome`/`getCurrentMonthPaychecks` in `src/lib/income.ts`),
  defaulting to "now" so every pre-existing call site keeps working
  unchanged. `BudgetPage` holds the selected `referenceDate` as state and
  passes it down to `IncomeOverview`, `BudgetSummary`, `BudgetEnvelopeRow`,
  `AddPaycheckDialog`, and `CategoryPurchases`. Scoped to the Budget page
  only — the dashboard's live panels keep always showing the current
  month. Categories themselves and `bankBalance` are **not** versioned —
  they're "current state," not part of the historical ledger; only
  paychecks/purchases (both already timestamped) are filtered by the
  viewed month
- **Budget summary panels + category breakdown bar** (`/budget`):
  `BudgetSummary` renders 3 clickable stat cards ("Monthly Spent /
  Income", "Monthly Spent / Total Budgeted", "Yearly Spent / Total
  Budgeted" — big dollar figure matching each metric's own denominator,
  plus the income card's percentage shown as a smaller secondary number).
  Clicking a card selects it as the active metric (ring-highlighted) and
  drives `CategoryBreakdownBar` below — a full-width horizontal stacked
  bar + icon/name/percent/$-amount legend showing what fraction of the
  selected total (income, monthly budget, or yearly budget) each category
  accounts for, sorted largest-first, zero-spend categories omitted, with
  an empty-state message when nothing's been logged for the viewed
  period. Segment/legend colors use new dedicated `--category-1..5`
  tokens (see Architecture) rather than the grayscale `--chart-1..5`
  tokens used for category icons elsewhere
- **Recurring reset cycles**: every category has a `resetDay` (1–31) and
  recurs monthly on that day rather than always the calendar month — e.g.
  resetDay 15 means the category's current cycle is "the 15th of last
  month" through "the 14th of this month" once you're past the 15th, or
  the prior month's 15th–14th before it. Each row shows its current
  cycle's start–end date (`src/lib/period.ts`, `getCurrentPeriod`).
  Because spending is derived from purchases filtered to the current
  cycle, a rollover "resets" spending for free — a purchase dated outside
  the new cycle just stops counting, no stored total to zero out (this
  replaced an earlier `periodStart`/`checkPeriodResets` polling mechanism
  that's no longer needed — see Session Log)
- **Dashboard home** (`/`): 3-column layout, sized to fill the viewport at
  desktop widths (`md:h-screen` + flex/grid stretching, mobile keeps a
  normal scrolling stack) — centered "money overview" donut (Spent +
  Remaining budget derived from `useBudgetStore`; Available balance now
  real too, from `bankBalance`; Tax reserve remains a mock constant, no
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
                    # dialog, input, label, select, popover)
    budget/        # Budget feature components (BudgetEnvelopeRow, BudgetSummary,
                    # IncomeOverview, AddBudgetDialog, AddPaycheckDialog,
                    # CategoryPurchases — the expand-on-click purchase log/add form,
                    # MonthYearPicker — prev/next + popover month/year selector,
                    # CategoryBreakdownBar — stacked bar + legend driven by
                    # BudgetSummary's 3 clickable metric cards)
    dashboard/     # Dashboard home components (DashboardPanel, MoneyOverviewCard)
    charts/        # Recharts wrapper components (future — not the same as
                    # MoneyOverviewCard's donut, which is a hand-rolled CSS
                    # conic-gradient, not Recharts)
  pages/           # route-level components (HomePage = dashboard, BudgetPage, AboutPage)
  stores/          # Zustand stores, one file per domain, named use<Domain>Store.ts
                    # (useBudgetStore.ts is the first one — categories, paychecks,
                    # purchases, bankBalance, paychecksPerMonth all live here)
  lib/
    firebase.ts    # Firebase SDK init: `app`, `db` eager; `getFirebaseAuth()` lazy
                    # (getAuth() throws eagerly on missing/invalid API key, unlike
                    # getFirestore() — call getFirebaseAuth() only where auth is used)
    utils.ts       # shadcn cn() helper, formatCurrency() (always 2 decimals —
                    # needed anywhere a value sums user-entered purchase amounts)
    budget.ts      # derived budget helpers (isOverBudget, progressPercent) — take
                    # plain `spent`/`monthlyTarget` numbers, not a category object
    income.ts      # derived income helpers (getMonthlyIncome, getYearlyProjectedIncome,
                    # getAveragePaycheckAmount, getMonthlyTarget — resolves a
                    # BudgetCategory's dollar target from income context)
    purchases.ts   # derived spending helpers (getCategoryPurchases, getCategorySpent) —
                    # a category's spend is summed from Purchase records filtered to
                    # its current period, never stored directly
    period.ts      # recurring reset-cycle date math (getCurrentPeriod,
                    # formatPeriodRange) — a category's resetDay (1-31) maps to
                    # a current start/end date range; day-clamped for short months.
                    # Also defaultDateForReference — the shared "default form date
                    # for whichever month is currently being viewed" helper used by
                    # both AddPaycheckDialog and CategoryPurchases
    schemas/
      budget.ts    # Zod schemas: addBudgetSchema, addPaycheckSchema, addPurchaseSchema
  hooks/           # custom hooks incl. TanStack Query hooks (created on first use)
  types/
    budget.ts      # BudgetCategory (fixed | percentage discriminated union,
                    # each with resetDay), ChartColorToken, DistributiveOmit utility
    paycheck.ts    # Paycheck (id, amount, date as ISO "YYYY-MM-DD" string)
    purchase.ts    # Purchase (id, categoryId, date, description, amount)
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
  `BudgetEnvelopeRow.tsx`'s `colorClass` map or `DashboardPanel.tsx`'s
  `toneClasses`/`progressIndicatorClasses`). For genuinely dynamic values
  (e.g. a computed conic-gradient), use inline `style`, not a class name.
- shadcn `Progress`: fill element has `data-slot="progress-indicator"` —
  target it via `[&_[data-slot=progress-indicator]]:bg-*` for color
  overrides, not a positional selector like `[&>div]`.
- Semantic color tokens: `--destructive` (pre-existing) plus `--success`/
  `--info`/`--warning` and `--category-1..5` in `src/index.css`, each with
  light + dark values, registered in the `@theme inline` block so Tailwind
  generates `text-*`/`bg-*`/`border-*` utilities. Use these for meaning
  (status, category identity) rather than `--chart-1..5`, which are
  grayscale in the installed Nova preset. `--category-1..5` specifically
  back `CategoryBreakdownBar`'s bar segments/legend dots — a real colorful
  qualitative palette, kept separate from `--chart-1..5` (which categories'
  own icons still use elsewhere, e.g. `BudgetEnvelopeRow`) rather than
  reusing/recoloring that existing grayscale token set.
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
- **"View as of a past date" pattern**: functions that compute a derived
  value for "the current period" (`getCategoryPurchases`/`getCategorySpent`,
  `getCurrentPeriod`, `getMonthlyIncome`/`getCurrentMonthPaychecks`) take an
  optional trailing `reference: Date = new Date()` parameter instead of a
  separate "historical" variant — keeps one code path for both live and
  time-traveled views, and every pre-existing call site keeps working
  unchanged since the parameter defaults to now
- **`useForm`'s `defaultValues` only apply at mount** — if a form component
  stays mounted while the value it should default to changes (e.g.
  `CategoryPurchases`'s date field should re-default when the user
  navigates `MonthYearPicker` to a different month without collapsing the
  row), `defaultValues` alone won't pick up the change. Needs an explicit
  `useEffect(() => reset({...}), [theChangedProp, reset])` — found as a
  real bug this session (the add-purchase date field kept showing the
  previously-viewed month after navigating back), see Session Log
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

### 2026-07-03 — Dashboard fills the screen
- User asked for the dashboard panels to fill the whole screen instead of
  sitting as a small centered block. Changed `HomePage.tsx`'s `<main>` to
  `md:h-screen` (desktop only — mobile keeps normal scrolling, since
  forcing 5 stacked cards into one screen height on a phone would make
  each absurdly short), made the 3-column grid `md:flex-1 md:grid-rows-1`
  (CSS Grid rows are content-sized by default even in a stretched
  container — `grid-rows-1` is what actually makes the single row fill
  100% of the available height), and gave each stacked `DashboardPanel`
  `md:flex-1` so two panels split their column evenly.
- Verified via `getBoundingClientRect()` rather than trusting the
  low-resolution preview screenshot, which made the layout look like it
  had a large empty gap at the bottom even though it didn't — confirmed
  page height was exactly the 900px viewport with zero scroll overflow
  and panels were genuinely ~400px tall each. Worth remembering: for
  "does this fill the available space" questions, computed layout
  geometry is more trustworthy than eyeballing a compressed screenshot.

### 2026-07-03 — Budget log view + recurring reset cycles
- User asked for the Budget screen's category list to become a log/row
  view (date range on the left, name, a progress bar in the middle, spent
  vs. target on the right, percentage shown for percentage-type
  categories) instead of a card grid, plus support for each category
  resetting on a configurable date rather than always the calendar month.
  Clarified up front: the reset date is a recurring day-of-month (not a
  one-off manual range), and spending should automatically zero out once
  a cycle rolls over.
- Added `src/lib/period.ts`: `getCurrentPeriod(resetDay, reference)`
  computes the currently-active start/end date for a category given its
  recurring reset day, clamping to the real last day of shorter months
  (so resetDay 31 becomes Feb 28/29 instead of overflowing into March).
  Hand-verified with a throwaway `tsx` script against several edge cases
  (mid-cycle vs. just-reset, day-clamping, December→January year
  rollover) before wiring it into the app — cheaper to catch date-math
  bugs there than by clicking through the UI. `formatPeriodRange` renders
  it as "Jul 5 – Aug 4" for display, again parsing the ISO string's own
  Y/M/D components rather than `new Date(isoString)` to dodge the
  UTC-midnight timezone shift documented elsewhere in this file.
- Extended `BudgetCategory` with `resetDay` (1-31) and `periodStart` (the
  last-known-active cycle's start date, persisted so a rollover can
  actually be detected). Added `checkPeriodResets` to `useBudgetStore`:
  compares each category's stored `periodStart` against a freshly
  computed current period, and if they differ, zeroes `monthlySpent` and
  advances `periodStart`. There's no backend/cron to run this at the
  exact reset moment, so "automatic" means: run once when `BudgetPage`
  mounts, and again every 60 seconds via a `useEffect` interval while the
  page stays open — a reasonable approximation of automatic given a
  frontend-only app, with a documented ~1-minute worst-case lag.
- Added a "Resets on day of month" field to `AddBudgetDialog` (applies to
  both fixed and percentage categories, defaults to 1 — the existing
  calendar-month behavior). `periodStart` is computed via
  `getCurrentPeriod` at creation time.
- Replaced `BudgetEnvelopeCard.tsx` (a card grid tile) with
  `BudgetEnvelopeRow.tsx` (a horizontal log row: date range → name/icon →
  progress bar → spent/target, stacking vertically below `sm:`) and swapped
  `BudgetPage`'s card grid for a single bordered `divide-y` list.
- Verified end-to-end: all 9 seeded categories render correctly as rows
  with their calendar-month range ("Jul 1 – Jul 31"); added a category
  with `resetDay: 10` and confirmed it correctly showed "Jun 10 – Jul 9"
  (today, Jul 3, is before the 10th, so the active cycle started last
  month); directly exercised `checkPeriodResets` by writing a stale
  `periodStart` onto a category via the store and confirming
  `monthlySpent` zeroed out and `periodStart` advanced. `tsc -b`,
  `npm run lint`, `npm run build` all clean.

### 2026-07-03 — Itemized purchases per category
- User asked for each category row to be clickable, expanding an inline
  panel (their words: "drop down") showing a list of purchases logged
  against that category plus a small form to add a new one (date,
  description, cost) — using Groceries as the example. Clarified up
  front that the expansion should happen inline below the clicked row
  (accordion-style), not in a popup dialog like the existing "Add
  budget"/"Add paycheck" forms.
- This meant category spending could no longer be a single stored
  `monthlySpent` number — it had to become a sum of individual purchase
  records, mirroring how income already works (paychecks summing to a
  derived monthly total, not a manually-typed figure). Added
  `src/types/purchase.ts` (`Purchase`: id, categoryId, date, description,
  amount) and `src/lib/purchases.ts` (`getCategoryPurchases`/
  `getCategorySpent`, filtering a category's purchases to its *own*
  current period via `getCurrentPeriod(category.resetDay)`). Removed
  `monthlySpent` from `BudgetCategory` entirely — every consumer
  (`BudgetEnvelopeRow`, `BudgetSummary`, `MoneyOverviewCard`, `HomePage`)
  now computes it live from `purchases` instead of reading a stored field.
  `isOverBudget`/`progressPercent` in `src/lib/budget.ts` were simplified
  to take a plain `spent: number` instead of a whole category object,
  decoupling them from the category type entirely.
- **This made last session's `periodStart`/`checkPeriodResets` polling
  mechanism completely unnecessary and it was removed.** The entire
  reason that machinery existed was to detect a cycle rollover and
  manually zero out the stored `monthlySpent` field. With spend now
  *derived* by filtering purchases to the live-computed current period,
  a rollover requires zero extra logic — a purchase dated in the old
  cycle simply stops being included in the sum once `getCurrentPeriod`
  advances. Removed `periodStart` from `BudgetCategory`, removed
  `checkPeriodResets` from the store, and removed the `useEffect`
  interval from `BudgetPage`. Net simplification, not just a feature
  addition — worth remembering that "make X derived instead of stored"
  refactors can retroactively obsolete earlier workarounds.
- Built `CategoryPurchases.tsx`: renders under a row only while expanded
  (so, unlike the Dialog-based forms, `useForm`'s `defaultValues` are
  captured fresh on every mount — no lazy-mount timing issue to work
  around here, though the date field still gets the belt-and-suspenders
  explicit `defaultValue` prop for consistency with `AddPaycheckDialog`).
  Purchase list shows most-recent-first with a remove button per item;
  the add form is React Hook Form + Zod (`addPurchaseSchema` in
  `src/lib/schemas/budget.ts`), matching every other form in the app.
- Made `BudgetEnvelopeRow`'s whole row a real `<button>` (not a `div`
  with manually-wired `onClick`/keyboard handling) wrapping everything
  except the expanded panel, which renders as a sibling below it —
  `<button>` can't contain other interactive elements, so the
  purchase-list buttons had to live outside it, not nested inside.
  Local `useState` tracks each row's own expand/collapse independently
  (no need to lift state up — rows don't coordinate with each other).
- Found a real formatting bug during verification: `spent` can now carry
  cents (real purchase amounts, unlike the old whole-dollar mock data),
  and `.toLocaleString()` without fixed decimals rendered a $32.50
  purchase as "$32.5". Added `formatCurrency()` (always 2 decimals) to
  `src/lib/utils.ts` and applied it everywhere a purchase-derived total
  displays (`BudgetEnvelopeRow`, `CategoryPurchases`, `BudgetSummary`,
  `HomePage`'s Budget panel) — left `MoneyOverviewCard`'s legend as its
  existing whole-dollar rounding, a reasonable choice for a high-level
  visual summary rather than a bug needing the same fix.
- Reseeded `useBudgetStore` with ~19 itemized mock purchases (e.g.
  Groceries: Trader Joe's $148 + Safeway $200 + Costco $120 = $468)
  chosen to sum to the exact totals the old flat `monthlySpent` mock
  values used, so the app's existing demo scenarios (Dining Out and
  Subscriptions over budget) still hold.
- Verified end-to-end via the dev server: every row's derived spent total
  matched the old hardcoded totals exactly; expanding Groceries showed
  its 3 purchases correctly sorted most-recent-first; added a "Whole
  Foods run" $32.50 purchase and confirmed the row total updated to
  $500.50 live (crossing into overspend territory correctly); removed it
  again and confirmed the total reverted to $468.00; confirmed the
  expand/collapse toggle works in both directions. `tsc -b`,
  `npm run lint`, `npm run build` all clean.

### 2026-07-04 — Month/year ledger navigation
- User asked to be able to view previous months'/years' budget plans on
  the Budget screen via a control to select the month and year. Rather
  than asking which UI shape they meant, designed a combined navigator —
  prev/next arrow buttons plus a clickable month/year label that opens a
  popover with `Select` dropdowns — reasoning that it satisfies both
  plausible readings of "buttons which I can select the month and year"
  without needing to interrupt the user for it.
- Threaded an optional `reference: Date = new Date()` parameter through
  every function that computes "the current period" so each one can
  instead compute "the period as of some other date," while every
  pre-existing call site keeps working unchanged (documented as the
  general "view as of a past date" pattern in Architecture above):
  `getCategoryPurchases`/`getCategorySpent` (`src/lib/purchases.ts`),
  `getCurrentPeriod` (`src/lib/period.ts`), `getMonthlyIncome`/
  `getCurrentMonthPaychecks` (`src/lib/income.ts`). Left
  `getAveragePaycheckAmount` alone (no reference param) — it's
  deliberately averaged over *all* paychecks ever, not scoped to any
  particular month, so there was nothing to thread through.
- Added shadcn `popover` (`npx shadcn@latest add popover -y`) and
  proactively fixed its generated `PopoverContent`'s missing
  `React.forwardRef` before it could cause the same
  `DialogTrigger`-asChild-ref bug documented earlier in this file —
  checked-and-fixed-on-add, not reactive this time.
- Built `MonthYearPicker.tsx`: prev/next `ChevronLeft`/`ChevronRight`
  buttons, a `Popover`-triggered month/year `Select` pair, and a "Back to
  current" link shown only while viewing a past month. Selections anchor
  the resulting reference date to the **15th** of the chosen month
  (`makeReferenceDate`) — a stable, resetDay-agnostic middle-of-the-month
  point so `getCurrentPeriod` resolves "which cycle was active during
  this month" consistently no matter what `resetDay` a given category
  uses. Clamped so you can never navigate into a future month (there's no
  future ledger to show).
- `BudgetPage` now owns `referenceDate` as `useState<Date>`, renders
  `MonthYearPicker`, and passes `referenceDate` down to `IncomeOverview`,
  `BudgetSummary`, every `BudgetEnvelopeRow`, and (through those)
  `AddPaycheckDialog`/`CategoryPurchases`. Extracted a shared
  `defaultDateForReference(referenceDate)` helper into `src/lib/period.ts`
  (default to today when viewing the current month, else default
  somewhere inside the viewed month) since both `AddPaycheckDialog` and
  `CategoryPurchases` needed the identical logic for their date fields'
  defaults — factored out rather than duplicated.
- Deliberately did **not** version categories or `bankBalance` — per the
  user's request this is about viewing past *ledgers* (paychecks and
  purchases, both already timestamped), not about reconstructing what
  categories existed or what the bank balance was at some prior date.
- **Found and fixed a real bug during verification**: `CategoryPurchases`
  stays mounted (doesn't collapse/remount) while the user navigates
  months via `MonthYearPicker`, but `useForm`'s `defaultValues` only
  apply once at mount — so the add-purchase form's date field kept
  showing whatever month was active when the row was first expanded,
  even after navigating to a different month. Fixed with a
  `useEffect(() => reset({ date: defaultDateForReference(referenceDate),
  description: '' }), [referenceDate, reset])` that re-defaults the field
  whenever the viewed month changes. Documented as a general gotcha in
  Architecture above ("`useForm`'s `defaultValues` only apply at mount")
  since it'll recur for any form that lives inside a component which
  doesn't remount on the prop it should react to.
- Verified end-to-end via the dev server: navigating to June 2026 (no
  mock data exists there) correctly zeroed every category's spend and
  income to $0, correctly updated every row's date range to "Jun 1 – Jun
  30", and correctly kept a per-paycheck percentage category (Tax
  Savings, $624 target) unaffected while a per-monthly-income percentage
  category (Savings) correctly dropped to a $0 target since June's income
  is $0; backfilled a test purchase into June, confirmed it summed
  correctly into that category's June total, removed it, and confirmed
  "Back to current" correctly restored July 2026's original totals with
  no data leakage between months; confirmed the mount-only-defaultValues
  bug above by expanding Groceries, navigating to June without
  collapsing it, and watching the date field update live from
  `2026-07-04` to `2026-06-15` after the fix (it did not before). Dark
  mode sanity-checked via `preview_resize` + manually toggling the
  `.dark` class — picker, popover, and expanded panel all read correctly.
  `tsc -b`, `npm run lint`, `npm run build` all clean.

### 2026-07-04 — Budget summary restyle + category breakdown bar
- Iterative small requests refining `BudgetSummary`'s 2-card layout: made
  "Earned this month" bigger/bolder in `IncomeOverview` to read as the
  headline figure; renamed the "Monthly"/"Yearly" card titles to "Monthly
  Spent / Total Budgeted" / "Yearly Spent / Total Budgeted" per explicit
  user wording; added a 3rd card "Monthly Spent / Income" (spent as a %
  of monthly income, guarding the divide-by-zero case with an em dash
  when a viewed month has no logged paychecks) and switched the grid from
  2 to 3 columns; reordered so Income comes first, then Total Budgeted,
  then Yearly; then restyled the Income card specifically so the big
  number matches the other two cards' `$spent / $total` format, with the
  percentage demoted to a small secondary number on the right rather than
  being the headline figure.
- Built `CategoryBreakdownBar.tsx`: a full-width panel below the 3 summary
  cards showing a horizontal stacked bar + icon/name/percent/$-amount
  legend of what fraction of a selected total each budget category
  accounts for. Made each of the 3 summary cards clickable (`role="button"`,
  `tabIndex`, `onKeyDown` for Enter/Space, ring-highlight on the selected
  one) to drive which total the bar measures against — `BudgetSummary`
  holds `selectedMetric: 'income' | 'monthlyBudgeted' | 'yearlyBudgeted'`
  as local state and passes it straight through as a prop rather than
  lifting it further, since nothing above `BudgetSummary` needs it.
  Per-category amounts reuse `getCategorySpent` (already reference-date
  aware); for the yearly metric the amount is `monthlySpent * 12` to stay
  consistent with how `yearlyBudgeted`/`yearlySpent` are already derived
  elsewhere in this file. Categories with $0 spent in the viewed period
  are filtered out of both the bar and legend (a 0%-width segment adds
  nothing and just clutters the legend), and an explicit empty-state
  message replaces the bar entirely when literally nothing has been
  logged (e.g. navigating to a past month with no purchases).
- Found the installed shadcn Nova theme's `--chart-1..5` tokens (already
  documented elsewhere in this file as grayscale, used for category icon
  tinting) would make a multi-category stacked bar monotone and defeat
  the "make it visually appealing" ask — rather than reusing/recoloring
  that existing token set (which categories' icons still depend on
  elsewhere) or hardcoding hex values into the component, added a
  separate `--category-1..5` token set to `src/index.css` (light + dark
  oklch values, real distinct hues: blue/teal/amber/violet/rose),
  registered in the `@theme inline` block the same way `--success`/
  `--info`/`--warning` were previously, giving `bg-category-1..5`
  utilities. Mapped via a `Record<ChartColorToken, string>` lookup
  (`segmentColorClass`) rather than a template literal, per this file's
  standing "never build Tailwind class names dynamically" rule.
- Verified end-to-end via the dev server: bar renders with 5 distinct
  colors across the 9 mock categories (colors cycle since there are only
  5 tokens for 9 categories, same reuse pattern the app's icons already
  accept); clicking each of the 3 summary cards correctly re-highlights
  it and recalculates both the bar segment widths and every legend
  percentage/dollar figure (confirmed Rent goes from 34.6% under Income
  to 40.3% under Monthly Budgeted, and the Yearly view's dollar amounts
  are exactly 12× the monthly ones while percentages match Monthly
  Budgeted's); navigated to June 2026 (no purchases) and confirmed the
  "No spending logged for this period yet" empty state replaces the bar
  correctly instead of rendering a broken/zero-width bar; dark mode
  sanity-checked via manually toggling the `.dark` class — all 5 category
  colors and the card ring-highlight remain legible against the dark
  background. `tsc -b`, `npm run lint`, `npm run build` all clean.
