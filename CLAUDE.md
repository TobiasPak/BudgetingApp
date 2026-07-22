# ClearBooks

## Project Overview

ClearBooks is a personal & business finance and tax app for California
workers across all income types — W-2 employees, 1099 contractors,
self-employed/sole proprietors, and gig workers (Uber, DoorDash, Airbnb),
including hybrid users who combine several of these.

Planned feature areas not yet built (budgeting, income tracking, and the
federal/CA tax tracker are already built — see Current Status):
- Bank connectivity via Plaid (12,000+ institutions, OAuth, auto-categorization,
  recurring subscription detection)
- OCR form upload for income documents (Veryfi)
- Business expense tracking: personal/business split, Schedule C categories,
  receipt OCR, partial-deduction flagging (meals 50%, home office %, mixed-use)
- Mileage tracking: manual entry + MileIQ import, current IRS standard rate
- Tax tracker follow-ons: a running tax savings fund balance, year-end
  PDF/CSV export mapped to Schedule C / Form 1040 / CA Form 540

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
| Tax engine | Custom TypeScript module (`src/lib/tax/`), IRS + CA FTB — federal + California only so far, single filer |
| Package manager | npm |

Note: `npm create vite@latest` currently defaults to React 19 + rolldown-vite.
React was explicitly pinned to `^18.3.1` per spec; the rolldown-vite/oxlint
toolchain (vite 8.x, oxlint instead of eslint) was kept as-is since that's
what the installed create-vite version ships.

## Current Status

**Budget envelopes (with delete) + revamped tabbed dashboard home + income tracking (W-2/contracted/self-employed classification, with delete) + a single shared month/year date filter (bookmark-style tabs, not a popover) driving every tab and standalone route + real Firebase Auth/Firestore persistence (staging + production environments, now with Firebase App Check/reCAPTCHA v3 wired in Unenforced mode) + federal/California tax estimate + Firestore audit timestamps on every record. Plaid still not started.**

Implemented:
- Project scaffold (Vite + React 18 + TypeScript), clean `npm install`
- Routing: `/` (dashboard home), `/budget` (Budget envelopes + income), `/spending` (Spending screen), `/income` (Income screen), `/tax` (Tax estimate), `/about` (placeholder)
- Tailwind v4 + shadcn/ui wired up (`components.json`, `src/lib/utils.ts`,
  components: `button`, `card`, `progress`, `dialog`, `input`, `label`,
  `select`, `popover`, `tabs`, `sonner`, `alert-dialog`)
- Semantic color tokens `--success`/`--info`/`--warning` added to
  `src/index.css` (light + dark values) alongside the pre-existing
  `--destructive`, since the installed shadcn Nova theme's `--chart-1..5`
  are grayscale in this preset, not a colorful palette
- TanStack Query `QueryClientProvider` wired in `src/main.tsx`
- **`useBudgetStore`** (Zustand) — first real store. Holds `categories`
  (`BudgetCategory[]`, a `fixed`/`percentage` discriminated union — see
  Architecture below), `incomeSources` (`IncomeSource[]`), `paychecks`
  (`Paycheck[]`), `purchases` (`Purchase[]`), `bankBalance`,
  `paychecksPerMonth`. Actions: `addCategory`, `addIncomeSource`,
  `addPaycheck`, `removePaycheck`, `addPurchase`, `removePurchase`,
  `setBankBalance`, `setPaychecksPerMonth`. Now Firestore-backed — new
  accounts start empty (see the "Firestore-backed" and "Load demo data"
  bullets below for the current persistence model and how the original
  mock dataset — 9 categories, 5 income sources, 6 paychecks, ~19
  purchases — is still reachable on demand)
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
- **Month/year ledger navigation**: the whole app can "time travel" to a
  past month or year and see that period's ledger — paychecks, category
  spend/targets, and income all recompute for the viewed window instead of
  always showing the current one. Implemented by threading a `range:
  DateRange` (and, where a target/projection needs to scale, `mode:
  DateFilterMode`) parameter through every derived-value helper
  (`getCategoryPurchases`/`getCategorySpent` in `src/lib/purchases.ts`,
  `getIncomeInRange`/`getPaychecksInRange` in `src/lib/income.ts`) — see
  the "Single shared date filter" bullet below for the picker/store
  itself. Categories themselves and `bankBalance` are **not** versioned —
  they're "current state," not part of the historical ledger; only
  paychecks/purchases (both already timestamped) are filtered by the
  viewed window
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
- **Recurring reset cycles (superseded)**: categories originally had a
  `resetDay` (1–31) recurring monthly cycle independent of the calendar
  month; this has since been superseded by the global shared date filter
  (see "Single shared date filter" below), which now governs every
  category's window directly — `resetDay` is kept on the type/form but no
  longer drives which purchases count. Because spending is derived from
  purchases filtered to the selected window (never stored), a filter
  change "resets" spending for free — a purchase dated outside the
  selected window just stops counting, no stored total to zero out
- **Dashboard home revamp** (`/`): replaced the old 3-column
  donut+4-panels layout with a top `MoneySummaryRow` (one wide card, 3
  segments: Income this month, Spent this month + % of income, Left over
  — `getLeftoverCash` in `src/lib/income.ts`, `monthlyIncome -
  totalSpent`, distinct from the unrelated "remaining budget" =
  budgeted-minus-spent concept still used on the Budget tab) plus a
  shadcn `Tabs` bar (Spending/Budget/Income) directly below it, with the
  selected tab's full page content rendered inline instead of navigating
  to a separate route. `MoneySummaryRow` always shows the *current*
  month regardless of what historical month any tab below is browsing
  to — same "dashboard live content always shows now" principle as
  before, just relocated from 4 panels to one row. Tax was dropped
  entirely rather than carried forward as a disabled tab — it was 100%
  mock content with no backing feature, and a placeholder tab promising
  a nonexistent feature isn't better than no tab; `CLAUDE.md`'s "Not yet
  implemented" list still tracks it. Default active tab is Spending,
  since "where is my money going" was the dashboard revamp's central
  ask. `MoneyOverviewCard` (the old hand-rolled conic-gradient donut,
  one of whose 4 slices was a hardcoded mock "Tax reserve" number) was
  deleted outright, fully superseded
- **Page-content extraction for dashboard tabs**: `BudgetPage`/
  `SpendingPage`/`IncomePage` were each split into a thin route wrapper
  (heading + "Back to dashboard" button, unchanged) and a new
  `BudgetContent`/`SpendingContent`/`IncomeContent` component owning
  everything below that (its own `referenceDate` state, `MonthYearPicker`,
  and all feature content) — the standalone `/budget`/`/spending`/`/income`
  routes still exist and render identically to before, just via the thin
  wrapper now. The same `*Content` components are also what the dashboard's
  tabs render directly, so each tab gets a fully independent mount with its
  own month-navigation state, with no props threaded down from `HomePage`
  and no risk of one tab's browsed-to month leaking into another
- **Spending screen** (`/spending`): mirrors the Budget page's shell — same
  `MonthYearPicker` reused as-is for past-month history, no separate
  "spending period" concept introduced. Two clickable stat cards (`Monthly
  Spent`, `Yearly Spent` — yearly is `monthlySpent × 12`, the same
  derived-not-stored pattern used everywhere else) drive a
  `SpendingPieChart` below, matching the existing
  card-selects-metric-drives-chart-below pattern from
  `BudgetSummary`/`CategoryBreakdownBar`. `getTotalSpent` (`src/lib/spending.ts`)
  sums every category's `getCategorySpent` for the viewed period — spending
  itself was already derived from `Purchase` records, so this page adds no
  new state, just a new lens (total-across-categories instead of
  per-category-vs-budget) on data that already existed. Dashboard's
  Spending panel now shows real `$spent / $income` and a "top spending
  category" insight instead of the old hardcoded mock content
- **First real Recharts usage**: `SpendingPieChart`
  (`src/components/spending/SpendingPieChart.tsx`) is a donut chart +
  legend, Recharts finally used for something after being an installed-but-
  unused dependency since the initial scaffold. Segment colors reuse the
  same `--category-1..5` tokens `CategoryBreakdownBar` already established
  for category-identity coloring, but passed to Recharts as
  `var(--color-category-1..5)` (the Tailwind-registered CSS var, not the
  raw `--category-1..5` one) — the standard shadcn/Recharts charting
  convention, confirmed to actually resolve correctly through Recharts'
  SVG `fill` in both light and dark mode via the preview tools (not just
  assumed). Kept in `components/spending/`, not `components/charts/` —
  same reasoning as `CategoryBreakdownBar` living in `components/budget/`:
  it's tightly coupled to the categories/purchases data shape, not a
  generic reusable wrapper, so `components/charts/` remains reserved for a
  true general-purpose Recharts wrapper if one is ever needed
- **Income screen** (`/income`): categorizes paychecks by `IncomeSource`
  (`src/types/incomeSource.ts` — same icon/color/isCustom shape as
  `BudgetCategoryBase`, but no `resetDay`/target since a source is a pure
  categorization label, not something to track spend-against). `Paycheck`
  gained a required `sourceId` field, so every paycheck — however it's
  added — now belongs to a source; `AddPaycheckDialog` (Budget page) grew a
  required Source `Select` to match. Page mirrors the Budget/Spending
  shell: `MonthYearPicker` for history, `IncomeSummary` (2 clickable cards —
  Earned This Month / Projected This Year — driving `IncomeSourcesPieChart`
  below, same card-selects-metric pattern as `BudgetSummary`/
  `SpendingSummary`), then a `divide-y` list of `IncomeSourceRow`s (mirrors
  `BudgetEnvelopeRow`: icon/name, a `Progress` bar filled to that source's
  % of monthly income, $ amount + percent on the right). Clicking a row
  expands `IncomeSourcePaychecks` inline (mirrors `CategoryPurchases`) —
  that source's paychecks this period with remove buttons, plus a small
  add-paycheck form (date + amount only; `sourceId` comes from the row, not
  user input, so it reuses the base `addPaycheckSchema` rather than the
  dialog's source-including variant). `AddIncomeSourceDialog` (mirrors
  `AddBudgetDialog`, simplified to a name field only) creates new sources.
  `src/lib/income.ts` gained `getSourcePaychecks`/`getSourceMonthlyIncome`
  (a source's paychecks/total for the month containing a reference date —
  same derived-not-stored, reference-date-aware pattern as everything
  else). Dashboard's Income panel now shows real `$earned / $projected`
  and a "top income source" insight instead of the old hardcoded mock
  content; its progress bar shows the top source's share of income
  (a real, defensible metric — income has no "budget ceiling" to show
  progress against the way Budget/Spending panels do, so this reuses
  source concentration instead of inventing an arbitrary number)
- **Firebase Auth + Firestore persistence (real, not mock)**: `.firebaserc`
  points at a real project (`budgetapp-67761`, created outside this repo —
  no longer a placeholder id), `.env.local` holds real client config, and
  `firestore.rules` enforces real per-user ownership (`request.auth.uid ==
  userId`) on `users/{uid}` and its 4 subcollections — deployed live via
  `firebase deploy --only firestore:rules`. Email/password and Google
  sign-in providers are enabled in the Firebase Console. `useAuthStore`
  (`src/stores/useAuthStore.ts`) holds `user`/`status`
  (`'loading'|'authenticated'|'unauthenticated'`)/`error` plus
  `signInEmail`/`signUpEmail`/`signInGoogle`/`signOutUser`, driven by a
  **module-level** `onAuthStateChanged` listener (not a hook/Context —
  this app has no Context besides TanStack Query's) that starts/stops
  `useBudgetStore`'s Firestore sync directly, keeping the import graph
  one-directional (`useAuthStore → useBudgetStore`, never the reverse, to
  avoid a circular import). `/sign-in` (`src/pages/SignInPage.tsx`) is an
  unprotected route with a sign-in/sign-up toggle (remounted via
  `key={mode}` to swap Zod schemas cleanly) plus a Google button; every
  other route sits behind `RequireAuth` (`src/components/auth/`), a
  layout-route guard in `src/App.tsx` that redirects unauthenticated users
  to `/sign-in` — and `SignInPage` itself redirects the other direction
  (`status === 'authenticated'` → `<Navigate to="/" />`) since
  `RequireAuth` only guards *nested* routes, not its unprotected sibling
- **`useBudgetStore` is now Firestore-backed, not local-only**: new
  accounts start completely empty (`categories`/`incomeSources`/
  `paychecks`/`purchases`: `[]`, `bankBalance`: 0); every `add*`/`remove*`/
  `set*` action is now a real Firestore write (`src/lib/firestore/
  writes.ts`) instead of a local array splice, and the local Zustand
  arrays are updated **only** by 5 `onSnapshot` listeners attached in
  `startSync(uid)` (`src/lib/firestore/sync.ts`) — one writer (the
  listener), no local/remote divergence risk. Firestore's SDK already
  delivers pending local writes through that same listener before server
  ack, so no separate optimistic-UI layer was needed; every existing "call
  action, reset() the form, close the dialog" pattern kept working
  unchanged. Data model: `users/{uid}` root doc (`bankBalance`,
  `paychecksPerMonth`) + `users/{uid}/{categories,incomeSources,paychecks,
  purchases}` subcollections (not one array-holding doc — matches the
  granular per-field Zustand selectors every component already uses, and
  avoids read-modify-write races across tabs/devices)
- **Icon serialization fix**: `BudgetCategory.icon`/`IncomeSource.icon`
  stay real `LucideIcon` values in memory everywhere — only the *write
  path* deals in `iconName: string` (`src/lib/iconMap.ts`'s `iconMap` +
  `getIcon()`), converted back to a component only inside the Firestore
  sync layer when hydrating a snapshot. None of the ~14 files that already
  render `category.icon`/`source.icon` as JSX needed to change
- **"Load demo data"** (`src/components/dashboard/LoadDemoDataButton.tsx`):
  the original hardcoded mock dataset moved verbatim to `src/lib/
  demoData.ts` (no longer used to seed the store — only this button uses
  it), behind an `AlertDialog` confirm, and only rendered when all 4
  collections are genuinely empty (the primary safety rail against
  clobbering real data). `loadDemoData(uid)` (`src/lib/firestore/
  demoData.ts`) is one `writeBatch` (~40 writes, well under the 500-op
  cap)
- Toast notifications (shadcn `sonner`, mounted once in `src/main.tsx`)
  for Firestore write/listener failures — additive to, not a replacement
  for, existing inline Zod/RHF validation errors. Its generated
  `sonner.tsx` pulled in `next-themes` (a Next.js-oriented package this
  Vite app has no use for, no `ThemeProvider` anywhere) — removed the
  import and the dependency, hardcoded `theme="system"` instead, since
  Sonner falls back to `prefers-color-scheme` on its own and the actual
  toast colors already come from this app's own CSS custom properties
- Firebase emulator support (new): `src/lib/firebase.ts` connects to the
  local Auth (9099) and Firestore (8080) emulators when
  `VITE_USE_FIREBASE_EMULATORS=true` (the local `.env.local` default —
  intentionally left `true` after this session so future local dev
  doesn't touch the real project by default; flip to `false` deliberately
  to test against `budgetapp-67761`). Requires a JDK on `PATH` for the
  Firestore emulator specifically (Auth emulator doesn't need Java)
- **Three environments, each a gitignored env file + npm script**: `.env.local`
  (`npm run dev`, emulator-first, unchanged default) → `.env.staging`
  (`npm run dev:staging`, the original real project `budgetapp-67761`,
  relabeled "budgetapp-staging" in the Console — project IDs can't
  actually be renamed, so `.firebaserc`/the project ID itself are
  unchanged) → `.env.production` (`npm run dev:prod`, a genuinely
  separate new project, `budgetapp-prod-f0c9a`, with its own Firestore
  and Auth — not just a second web app registered under the staging
  project, which was the first, incorrect attempt at this). All three
  files share the identical `VITE_FIREBASE_*`/`VITE_USE_FIREBASE_EMULATORS`
  shape, so Vite's built-in `--mode <name>` flag loads the right one with
  zero code changes to `src/lib/firebase.ts`. `.firebaserc` gained named
  `staging`/`production` project aliases (`firebase deploy --project
  production ...`) — `default` deliberately stays pointed at staging so a
  bare `firebase deploy` can never accidentally hit production
- Cloud Functions scaffold in `functions/` (own `package.json`/`tsconfig.json`,
  `firebase-admin` + `firebase-functions` installed, compiles clean, no real
  functions yet — Plaid token exchange will live here in a future session)
- Git hygiene: `.gitignore` added, `node_modules` untracked from git
- **Tax estimate (`/tax`, + a dashboard tab)**: federal + California
  liability estimate, single filer, resident-alien federal treatment —
  see `src/lib/tax/` (pure, derived-not-stored calculation functions,
  same convention as every other `src/lib/*.ts` helper) for the actual
  brackets/formulas and their sources, or `TAX_CALCULATION.md` (repo root)
  for a plain-English writeup of the whole calculation — keep that file in
  sync whenever `src/lib/tax/` changes. `IncomeSource` gained a required
  `incomeType: 'w2' | 'contracted' | 'selfEmployed'` field
  (`src/types/incomeSource.ts`) — every income source now has to be
  actively tagged (via a required `Select` in `AddIncomeSourceDialog`, no
  default pre-selected) since self-employment income owes SE tax and W-2
  doesn't. `'contracted'`/`'selfEmployed'` are taxed identically under
  federal/CA law and exist purely as clearer per-source labels — see
  `src/types/incomeSource.ts` for the full reasoning.
  `getAnnualizedIncomeByType` (`src/lib/income.ts`) is the integration
  point between the income model and the tax module (combines
  `'contracted'`/`'selfEmployed'` into one `selfEmployed` bucket; nothing
  in `src/lib/tax/` ever touches raw paychecks). `TaxContent` now shares
  the app-wide date filter (see the "single shared date filter" bullet
  below) rather than always reflecting "now" — browsing to a past month
  changes which month's income gets annualized and which year's quarterly
  due dates show, but the actual bracket/rate constants never change,
  since there's no multi-year bracket lookup; the on-page disclaimer
  states the bracket years (2026 federal/2025 CA) literally rather than
  deriving them, to avoid implying otherwise
- **Single shared date filter** (`src/stores/useDateFilterStore.ts`):
  reverses the earlier "each tab/route owns its own independent
  `referenceDate`" design — deliberately, per explicit user request, so
  browsing to a different month/year anywhere (any dashboard tab,
  `MoneySummaryRow`, or any of the 4 standalone routes) is reflected
  everywhere else too. Rendered once per page via `DateFilterTabs`
  (`src/components/budget/DateFilterTabs.tsx`) — a bookmark-style tab
  strip (a clickable year label + prev/next arrows to browse which year's
  tabs are shown, with 12 month tabs underneath), not a popover/dropdown.
  The store holds `mode: 'month' | 'year'` plus `startDate`/`endDate`
  (a `DateRange`) rather than a single `referenceDate` — clicking a month
  tab sets a calendar-month range, clicking the year label sets a
  calendar-year range; both are exact, unprorated windows (no "custom"
  arbitrary range exists — considered and deliberately dropped in favor of
  keeping month/year as the only two, always-easy options). Every
  category's spend is now filtered directly by this shared range rather
  than each category's own recurring reset cycle —
  `BudgetCategory.resetDay` is kept on the type/form (in case a future
  per-category-cycle view is reintroduced) but no longer decides which
  purchases count toward a category, per explicit user choice (confirmed
  via `AskUserQuestion`: "range wins" over "categories keep their own
  cycle"). `annualize(amountInRange, mode)` (`src/lib/period.ts`) is the one shared
  function every screen's "yearly"/"monthly average" figure goes through:
  exact ×12 for month mode, the range's own total as-is for year mode
  (nothing to project, since a year-mode range already covers the whole
  year) — replacing what used to be ad hoc `monthlySpent * 12` scattered
  across `BudgetSummary`/`SpendingPieChart`/`IncomeSourcesPieChart`/etc.
  `getTargetForMode` (`src/lib/budget.ts`) applies the same exact-scaling
  rule to a category's dollar target. `MoneySummaryRow` no longer always
  shows "now" — its labels read "in <label>" while browsing away from the
  current window, "this month"/"this year" otherwise (`formatRangeLabel`
  in `src/lib/period.ts`). `TaxContent` gained a date dimension for the
  first time
- **Firestore audit timestamps**: every document in the 4 synced
  collections (categories, incomeSources, paychecks, purchases) now
  carries `createdAt`/`updatedAt`, set via Firestore's `serverTimestamp()`
  in `src/lib/firestore/writes.ts` (never client-side `new Date()`, to
  avoid trusting client clocks) — distinct from any user-entered
  transaction date. `firestore.rules` validates both are set to
  `request.time` on create via a shared `hasValidTimestamps()` helper.
  There's no update path for any of these 4 entities yet (every "add" is
  always a brand-new document), so `updatedAt` currently always equals
  `createdAt` — expected, not a bug. No UI surfaces these values yet

Not yet implemented: a running tax-reserve balance, itemized deductions/
credits, filing statuses other than single, Plaid/Veryfi/Resend
integrations (Plaid is the planned next backend session — needs a
developer sandbox account with API keys, then real Cloud Functions for
token exchange), dark-mode toggle (theme is class-based and CSS-ready,
but nothing flips the `.dark` class yet).

## Architecture / Folder Conventions

```
src/
  assets/          # static images/icons (currently empty — template assets removed)
  components/
    ui/            # shadcn-generated primitives (button, card, progress,
                    # dialog, input, label, select, popover, tabs, sonner,
                    # alert-dialog)
    auth/          # Auth feature components (SignInForm — mode-aware
                    # sign-in/sign-up form, React Hook Form + Zod;
                    # GoogleSignInButton, SignOutButton, RequireAuth — the
                    # route guard used as a layout route in App.tsx)
    budget/        # Budget feature components (BudgetContent — the extracted
                    # page-body used by both BudgetPage and the dashboard's Budget
                    # tab; BudgetEnvelopeRow, BudgetSummary, IncomeOverview,
                    # AddBudgetDialog, AddPaycheckDialog, CategoryPurchases — the
                    # expand-on-click purchase log/add form, DateFilterTabs — a
                    # bookmark-style tab strip (clickable year label + prev/next
                    # arrows to browse years, 12 month tabs underneath), reads/
                    # writes the single shared useDateFilterStore rather than
                    # local state — rendered once per page (HomePage, and each of
                    # the 4 standalone routes), never inside a *Content component
                    # itself, so every page/tab shows the same selected date;
                    # CategoryBreakdownBar — stacked bar + legend driven by
                    # BudgetSummary's 3 clickable
                    # metric cards)
    spending/      # Spending feature components (SpendingContent — the extracted
                    # page-body used by both SpendingPage and the dashboard's
                    # Spending tab; SpendingSummary — 2 clickable metric cards
                    # driving SpendingPieChart below, same pattern as
                    # BudgetSummary/CategoryBreakdownBar; SpendingPieChart — first
                    # real Recharts usage in the app, a donut + legend)
    income/        # Income feature components (IncomeContent — the extracted
                    # page-body used by both IncomePage and the dashboard's Income
                    # tab; IncomeSummary — 2 clickable metric cards driving
                    # IncomeSourcesPieChart, same pattern as SpendingSummary;
                    # IncomeSourceRow — log-row list item mirroring
                    # BudgetEnvelopeRow; IncomeSourcePaychecks — expand-on-click
                    # paycheck log/add form mirroring CategoryPurchases;
                    # AddIncomeSourceDialog — mirrors AddBudgetDialog)
    tax/           # Tax feature components (TaxContent — the extracted page-body
                    # used by both TaxPage and the dashboard's Tax tab; no separate
                    # summary/row subcomponents like the other features since this
                    # page has no chart-driven card-selection interaction, just a
                    # disclaimer banner + summary cards + federal/CA breakdown
                    # cards + a quarterly-payments list, all in one file)
    dashboard/     # Dashboard home components (MoneySummaryRow — the top
                    # always-current-month income/spent/leftover row, owns
                    # `toneClasses`/`PanelTone` for icon tinting;
                    # LoadDemoDataButton — AlertDialog-confirmed, only shown
                    # when all 4 collections are empty)
    charts/        # Recharts wrapper components (still empty/future — not the
                    # same as SpendingPieChart, which is real Recharts but
                    # feature-specific so it lives in components/spending/ instead,
                    # same reasoning as CategoryBreakdownBar living in
                    # components/budget/)
  pages/           # route-level components — each is now a thin wrapper (heading
                    # + "Back to dashboard" button) around its feature's *Content
                    # component (HomePage = dashboard, BudgetPage, SpendingPage,
                    # IncomePage, TaxPage, AboutPage). SignInPage — unprotected,
                    # full-page (not a dialog — unauthenticated users need a real
                    # landing destination), sign-in/sign-up mode toggle
  stores/          # Zustand stores, one file per domain, named use<Domain>Store.ts
                    # (useBudgetStore.ts — categories, incomeSources, paychecks,
                    # purchases, bankBalance, paychecksPerMonth, now Firestore-
                    # synced, see below; useAuthStore.ts — user/status/error +
                    # sign-in/up/out actions, module-level onAuthStateChanged
                    # listener drives useBudgetStore's sync; useDateFilterStore.ts
                    # — the single shared mode ('month' | 'year') + startDate/
                    # endDate every page reads/writes (setToMonth/setToYear),
                    # pure in-memory UI state, deliberately NOT Firestore-synced
                    # and NOT folded into useBudgetStore; also exports
                    # useDateFilterRange(), a memoized {start, end} selector safe
                    # to use in effect/memo dependency arrays)
  lib/
    firebase.ts    # Firebase SDK init: `app`, `db` eager; `getFirebaseAuth()` lazy
                    # (getAuth() throws eagerly on missing/invalid API key, unlike
                    # getFirestore() — call getFirebaseAuth() only where auth is used).
                    # Also connects to the local Auth/Firestore emulators when
                    # VITE_USE_FIREBASE_EMULATORS=true
    iconMap.ts     # iconMap (Record<string, LucideIcon>) + getIcon() — the
                    # icon-name-to-component lookup Firestore sync hydrates
                    # through; write-path inputs use `iconName: string` instead
                    # of a component reference
    demoData.ts    # The original hardcoded mock dataset, relocated here verbatim
                    # — pure data, used only by the "Load demo data" action, never
                    # by store init (new accounts start empty)
    firestore/
      types.ts     # Firestore document shapes (FirestoreCategoryDoc — fixed |
                    # percentage discriminated union with iconName, not icon —
                    # FirestoreIncomeSourceDoc, FirestorePaycheckDoc,
                    # FirestorePurchaseDoc, FirestoreUserDoc). The 4 entity docs
                    # (not FirestoreUserDoc) each carry optional createdAt/
                    # updatedAt Timestamp fields — optional and absent from
                    # what callers supply, since writes.ts injects them via
                    # serverTimestamp() rather than any caller constructing one
      sync.ts       # attachListeners(uid, callbacks) — 5 onSnapshot listeners
                    # (4 subcollections + users/{uid} root doc), converts
                    # iconName → icon via iconMap on the way in, and each
                    # entity's createdAt/updatedAt Timestamp → ISO string via
                    # timestampToIso (docs written before the field existed
                    # simply come through as undefined); tracks which listeners
                    # have reported at least once so onReady fires exactly once
      writes.ts     # writeCategory/writeIncomeSource/writePaycheck/writePurchase
                    # + deletePaycheck/deletePurchase/writeUserFields — every
                    # Firestore write useBudgetStore's actions delegate to.
                    # Each create function injects createdAt/updatedAt via
                    # serverTimestamp() itself; no caller ever supplies these.
                    # deleteCategory/deleteIncomeSource cascade: each queries
                    # (getDocs + where) every purchase/paycheck pointing at
                    # that category/source id and deletes them alongside the
                    # category/source doc in one writeBatch, so deleting a
                    # category or income source never leaves orphaned
                    # purchase/paycheck records behind pointing at an id that
                    # no longer exists
      users.ts      # ensureUserDoc(uid) — idempotent setDoc(...,{merge:true}),
                    # called on every sign-in so it never clobbers existing
                    # bankBalance/paychecksPerMonth
      demoData.ts   # loadDemoData(uid) — one writeBatch (~40 writes) seeding
                    # demoData.ts's dataset into a user's own Firestore docs
    tax/
      brackets.ts  # Pure data: FEDERAL_BRACKETS_2026, CA_BRACKETS_2025, standard
                    # deductions, SE tax/QBI/SDI constants, each labeled with its
                    # source and tax year; applyBrackets() — shared progressive
                    # marginal-bracket calculator used by both federal.ts and
                    # california.ts
      federal.ts   # calculateFederalTax({w2Income, selfEmploymentIncome}) — SE
                    # tax, QBI deduction, standard deduction, bracket application;
                    # returns every intermediate line item, not just the total
      california.ts # calculateCaliforniaTax(...) — SDI (W-2 only), no QBI
                    # conformity, no separate SE tax (flows into ordinary CA
                    # taxable income)
      quarterly.ts # getQuarterlyEstimates(...) — federal 25/25/25/25 vs CA's
                    # 30/40/0/30 installment split; formatDueDate()
    utils.ts       # shadcn cn() helper, formatCurrency() (always 2 decimals —
                    # needed anywhere a value sums user-entered purchase amounts)
    budget.ts      # derived budget helpers (isOverBudget, progressPercent) — take
                    # plain `spent`/`target` numbers, not a category object;
                    # getTargetForMode(monthlyTarget, mode) — scales a category's
                    # monthly-rate target to the shared filter's mode (exact for
                    # 'month', ×12 for 'year')
    income.ts      # derived income helpers (getIncomeInRange/getPaychecksInRange —
                    # replaced the old always-"this month" getMonthlyIncome/
                    # getCurrentMonthPaychecks with range-based versions;
                    # getMonthlyIncomeEquivalent — the implied MONTHLY rate for
                    # whatever the filter is set to, what getMonthlyTarget's
                    # percentage-of-income categories resolve against regardless
                    # of mode; getAveragePaycheckAmount, getMonthlyTarget —
                    # resolves a BudgetCategory's dollar target from income
                    # context; getSourcePaychecks/getSourceIncomeInRange — a
                    # single IncomeSource's paychecks/total for the selected
                    # range; getLeftoverCash — range income minus getTotalSpent,
                    # the dashboard's "money left over" figure, deliberately named
                    # and kept distinct from the unrelated "remaining budget"
                    # (budgeted-minus-spent) concept used on the Budget tab;
                    # getAnnualizedIncomeByType — the selected range's income
                    # annualized via `annualize` and split by each source's
                    # incomeType into {w2, selfEmployed}, the one integration
                    # point src/lib/tax/ uses)
    purchases.ts   # derived spending helpers (getCategoryPurchases, getCategorySpent) —
                    # a category's spend is summed from Purchase records filtered to
                    # the shared date filter's selected range, never stored directly
    spending.ts    # getTotalSpent — sums getCategorySpent across every category for
                    # a total-spend view; no new state, just a different lens on the
                    # same Purchase records purchases.ts already derives from
    period.ts      # DateRange ({start, end}), DateFilterMode ('month' | 'year'),
                    # isDateInRange, monthBounds/yearBounds — the shared date
                    # filter's core date math. annualize(amountInRange, mode) —
                    # the one shared "project this window onto a full year"
                    # function every screen's yearly/monthly-average figure goes
                    # through (×12 for month mode, as-is for year mode, since a
                    # year-mode range already covers the whole year); superseded
                    # the old resetDay-cycle math (getCurrentPeriod,
                    # formatPeriodRange — deleted, no longer used now that the
                    # global filter governs every category's window directly).
                    # Also defaultDateForRange — the shared "default form date
                    # for whatever's currently selected" helper used by both
                    # AddPaycheckDialog and CategoryPurchases; formatMonthYear/
                    # formatRangeLabel — "July 2026" / "2026" formatting shared
                    # by DateFilterTabs and MoneySummaryRow's "in <label>" wording
    schemas/
      budget.ts    # Zod schemas: addBudgetSchema, addPaycheckSchema, addPurchaseSchema
      income.ts    # addIncomeSourceSchema — includes required incomeType ('w2' |
                    # 'contracted' | 'selfEmployed'), no default, since which one an
                    # income source is drives real tax math (src/lib/tax/), not just
                    # display; addPaycheckWithSourceSchema — extends
                    # budget.ts's base addPaycheckSchema with a required sourceId,
                    # used only by the standalone AddPaycheckDialog (not
                    # IncomeSourcePaychecks's row-scoped form, which already knows
                    # its sourceId from the expanded row)
      auth.ts      # signInSchema, signUpSchema (extends signInSchema with
                    # confirmPassword + a .refine() password-match check)
  hooks/           # custom hooks incl. TanStack Query hooks (created on first use)
  types/           # BudgetCategory, IncomeSource, Paycheck, and Purchase (below) all
                    # carry optional createdAt?/updatedAt? (ISO datetime strings,
                    # populated by src/lib/firestore/sync.ts) — server-assigned audit
                    # timestamps, distinct from any user-entered transaction date,
                    # absent (not fabricated) on documents written before the field
                    # existed. No UI surfaces these yet
    budget.ts      # BudgetCategory (fixed | percentage discriminated union,
                    # each with resetDay), ChartColorToken, DistributiveOmit utility
    incomeSource.ts # IncomeSource (id, name, icon, color, isCustom?, incomeType) —
                    # a Paycheck's categorization label, no resetDay/target unlike
                    # BudgetCategory; incomeType ('w2' | 'contracted' | 'selfEmployed')
                    # is required and drives src/lib/tax/'s SE-tax/QBI calculation, not
                    # just display — 'contracted'/'selfEmployed' are taxed identically,
                    # separate values exist only for clearer per-source labeling
    paycheck.ts    # Paycheck (id, amount, date as ISO "YYYY-MM-DD" string, sourceId
                    # referencing an IncomeSource)
    purchase.ts    # Purchase (id, categoryId, date, description, amount)
  vite-env.d.ts    # ImportMetaEnv typing for VITE_FIREBASE_*/VITE_USE_FIREBASE_EMULATORS vars

functions/
  src/index.ts     # Cloud Functions entry point (empty placeholder for now)
```

Conventions:
- Zustand stores: `src/stores/`, one file per domain slice, `use<Domain>Store.ts`
- **Firestore-synced store pattern** (`useBudgetStore`): a store's `add*`/
  `remove*`/`set*` actions call a Firestore write (`src/lib/firestore/
  writes.ts`) and return immediately — they never mutate the local array
  themselves. The **only** writer of local state is a `startSync(uid)`
  action that attaches `onSnapshot` listeners (`src/lib/firestore/
  sync.ts`) and pipes every snapshot straight into `set()`. This one-writer
  design means local and remote state can never diverge, and needs no
  manual optimistic-UI layer — Firestore's SDK already delivers pending
  local writes through the same listener before server ack. `startSync`/
  `stopSync` are called only from `useAuthStore`'s module-level
  `onAuthStateChanged` listener, never from UI code directly. A store
  needing this pattern reads the signed-in uid via
  `getFirebaseAuth().currentUser?.uid` rather than importing
  `useAuthStore`, keeping the store-to-store import graph one-directional
  and avoiding a circular import
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
  `BudgetEnvelopeRow.tsx`'s `colorClass` map or `MoneySummaryRow.tsx`'s
  `toneClasses`). For genuinely dynamic values (e.g. a computed
  conic-gradient), use inline `style`, not a class name.
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
  weren't fixed speculatively. Use the `clearbooks-add-shadcn` skill
  (`.claude/skills/clearbooks-add-shadcn/`) whenever adding a new shadcn
  component — it covers checking/fixing this gap plus watching for
  auto-installed dependencies the app doesn't need.
- React Hook Form's `useForm` forms with conditionally-rendered fields (e.g. a
  fixed-vs-percentage type switch) **must** pass `shouldUnregister: true`
  to `useForm()` — otherwise a field's stale value survives after its input
  unmounts and can fail Zod validation for a branch that's no longer active
  (see `AddBudgetDialog.tsx`)
- **Date strings parse as UTC midnight in JS** — always compare a
  `"YYYY-MM-DD"` date string's own Y/M/D components directly rather than
  `new Date(dateStr)`, which parses as UTC midnight and can shift a day in
  negative-offset timezones. Used throughout `src/lib/income.ts`/`period.ts`
  (e.g. `getCurrentMonthPaychecks`, `formatPeriodRange`)
- **Recharts `Tooltip` `formatter` typing**: leave the callback's
  `value`/`name` params untyped and cast inside the body (`Number(value)`,
  `String(name)`) rather than typing them explicitly — Recharts'
  `Formatter<ValueType, NameType>` allows `value` to be `undefined`, and once
  a second `Tooltip` with a differently-shaped payload exists in the same
  `tsc` project, generic inference from the first can leak into the second
  and fail project-wide even though a single file checks fine in isolation
  (see `SpendingPieChart.tsx`/`IncomeSourcesPieChart.tsx`)
- **Hand-verify nontrivial date/numeric logic with a throwaway script
  before wiring it into the UI**: write a temporary `tsx` script exercising
  several edge cases against hand-computed expected values, run it with
  `npx tsx`, then delete it (never commit it) once it passes — cheaper to
  catch a date-math or bracket-math bug there than by clicking through the
  UI. Done for `getCurrentPeriod` (day-clamping, year rollover) and for the
  federal/CA tax calculations (5 income scenarios, including the CA
  quarterly $0-installment quirk) — referenced as "established practice"
  in both Session Log entries before this bullet actually existed anywhere.
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
above so it always reflects the real state of the repo. For *how* to verify a
change (dev server, routes, `tsc`/lint/build, dark mode, preview-tool
gotchas), use the `clearbooks-verify` skill (`.claude/skills/clearbooks-verify/`) instead of
re-describing the procedure here — new entries should record each session's
unique findings, not the standard checklist.

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
- Verified end-to-end (see `clearbooks-verify` skill): dashboard renders correctly at
  desktop width (single-column below the `md` breakpoint, 3-column above),
  only the Budget panel is a real `<a>`/link element per the accessibility
  tree, Budget page shows correct per-category over/under styling (exactly
  matching mock data), monthly/yearly totals arithmetically correct, donut
  slice values match the store's real totals; dark mode reads correctly.
  All clean.
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
  - Diagnosing bug #2 surfaced two debugging techniques worth keeping —
    preferring `window`-variable handoff over `preview_console_logs` when
    call-ordering matters, and doing multi-step Radix Dialog interactions
    inside a single `preview_eval` call rather than splitting across calls
    (splitting caused the dialog to close prematurely). Both are now
    folded into the `clearbooks-verify` skill rather than documented here.
- Verified end-to-end (see `clearbooks-verify` skill): added both a percentage category
  (Vacation Fund, 5% of monthly income → correctly computed $260 target
  off $5,200 income) and a fixed category (Emergency Fund, $200), each
  correctly folding into the monthly/yearly summary totals; added and
  removed a paycheck and confirmed "earned this month"/"projected this
  year"/every percentage-budget target recalculated correctly; confirmed
  the dashboard's Budget panel and money-overview donut pick up the same
  real totals. All clean.

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
  and panels were genuinely ~400px tall each. (This "trust computed
  geometry over screenshots for fills-the-space questions" technique is
  now folded into the `clearbooks-verify` skill.)

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
- Verified end-to-end (see `clearbooks-verify` skill): all 9 seeded categories render
  correctly as rows with their calendar-month range ("Jul 1 – Jul 31");
  added a category with `resetDay: 10` and confirmed it correctly showed
  "Jun 10 – Jul 9" (today, Jul 3, is before the 10th, so the active cycle
  started last month); directly exercised `checkPeriodResets` by writing
  a stale `periodStart` onto a category via the store and confirming
  `monthlySpent` zeroed out and `periodStart` advanced. All clean.

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
- Verified end-to-end (see `clearbooks-verify` skill): every row's derived spent
  total matched the old hardcoded totals exactly; expanding Groceries
  showed its 3 purchases correctly sorted most-recent-first; added a
  "Whole Foods run" $32.50 purchase and confirmed the row total updated
  to $500.50 live (crossing into overspend territory correctly); removed
  it again and confirmed the total reverted to $468.00; confirmed the
  expand/collapse toggle works in both directions. All clean.

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
- Verified end-to-end (see `clearbooks-verify` skill): navigating to June 2026 (no
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
  mode read correctly. All clean.

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
- Verified end-to-end (see `clearbooks-verify` skill): bar renders with 5 distinct
  colors across the 9 mock categories (colors cycle since there are only
  5 tokens for 9 categories, same reuse pattern the app's icons already
  accept); clicking each of the 3 summary cards correctly re-highlights
  it and recalculates both the bar segment widths and every legend
  percentage/dollar figure (confirmed Rent goes from 34.6% under Income
  to 40.3% under Monthly Budgeted, and the Yearly view's dollar amounts
  are exactly 12× the monthly ones while percentages match Monthly
  Budgeted's); navigated to June 2026 (no purchases) and confirmed the
  "No spending logged for this period yet" empty state replaces the bar
  correctly instead of rendering a broken/zero-width bar; dark mode read
  correctly — all 5 category colors and the card ring-highlight remain
  legible against the dark background. All clean.

### 2026-07-06 — Extracted a `clearbooks-verify` skill from repeated Session Log boilerplate
- User asked whether anything in this file could become a Claude Code
  skill instead of static documentation. The recurring "Verified
  end-to-end via the dev server: `tsc -b`/`npm run lint`/`npm run build`
  all clean, dark mode toggled via `.dark` class" paragraph had been
  duplicated near-verbatim across essentially every Session Log entry
  above — a *procedure* re-described every session rather than a fact
  that just needs to be known once. Alongside it, three one-off
  debugging techniques (prefer `window`-variable handoff over
  `preview_console_logs` for call-ordering; do multi-step Radix
  Dialog/Popover interactions inside one `preview_eval` call, not split
  across calls; verify layout-fills-the-space questions via
  `getBoundingClientRect()` rather than a screenshot) were the same kind
  of reusable-procedure content.
- Created `.claude/skills/clearbooks-verify/SKILL.md` — a project-scoped
  skill encoding the `clearbooks-dev` launch config, which routes matter
  (`/budget` primarily), the standard `tsc -b`/`lint`/`build` sequence,
  the no-dark-mode-toggle-UI caveat, and all three debugging techniques
  above. Confirmed `.claude/launch.json` already had the correct
  `clearbooks-dev` config from earlier sessions, so nothing needed
  changing there.
- **First name choice collided with an existing global skill**: initially
  named it `verify`, but invoking it resolved to a *different*,
  pre-existing bundled skill with its own runtime-observation philosophy
  (no relation to this app). That skill's own instructions revealed the
  actual convention this ecosystem expects: it looks for companion
  skills named `verifier-*` under `.claude/skills/` and auto-invokes them
  as its "handle" for a repo. Renamed to `clearbooks-verify` instead of
  chasing the full `verifier-*` protocol (which does recording/replay —
  more than what was asked for here); this skill remains a standalone
  preview-tool reference, invoked directly by name.
- Trimmed every Session Log entry above that repeated the verification
  boilerplate or one of the three debugging techniques down to a short
  pointer ("see `clearbooks-verify` skill") plus each entry's own unique
  findings/results — deliberately did **not** touch or shorten the
  unique substance of what was learned each session (specific bugs
  found, specific numbers confirmed), only the repeated *how-we-checked*
  procedure text. Left architecture/convention content (shadcn
  `forwardRef` gap, `useForm` `defaultValues`-only-at-mount, Tailwind
  dynamic-class rule, color tokens, reference-date pattern) untouched —
  that's standing knowledge about the codebase, not a procedure, and
  doesn't belong in a skill.
- Added a pointer in this section's process note directing future
  sessions to the `clearbooks-verify` skill instead of re-describing the
  verification procedure inline going forward.

### 2026-07-06 — Spending screen + first real Recharts chart
- User asked for a Spending screen reachable from the dashboard's Spending
  panel (previously mock-only, like Income/Tax), showing Monthly/Yearly
  Spent, each category's percentage of that total, past-month history, and
  a pie-chart visual. Deliberately did not introduce a new "spending
  period" concept or new store state — spend was already fully derived
  from `Purchase` records (`getCategorySpent`), so this feature is a new
  *view* over existing data, not new data.
- Added `getTotalSpent` (`src/lib/spending.ts`) — sums `getCategorySpent`
  across every category for a reference date, reusing the same
  reference-date-defaults-to-now pattern as the rest of the app so it
  works unchanged with `MonthYearPicker`.
- Built `SpendingPage` (`/spending`) by directly reusing `MonthYearPicker`
  from `components/budget/` rather than duplicating it — it was already
  generic (just a `value`/`onChange` date control), so "past history of
  spending" came for free.
- Built `SpendingSummary` (2 clickable cards: Monthly Spent, Yearly Spent
  = monthly × 12) and `SpendingPieChart`, copying the exact
  card-selects-metric-drives-chart-below interaction `BudgetSummary` +
  `CategoryBreakdownBar` already established, just swapped the stacked bar
  for a donut chart per the user's ask, and swapped "% of budget/income"
  for "% of total spending" (this screen has no budget-adherence framing,
  just a spending lens).
- **This is the app's first real Recharts usage** — it's been an installed
  dependency with a "not yet used" note since the initial scaffold.
  Colors reuse the existing `--category-1..5` tokens (same ones
  `CategoryBreakdownBar` already established for category-identity
  coloring) but passed to Recharts' `Cell fill` as
  `var(--color-category-1..5)` — the Tailwind-registered variable, not the
  raw one — matching the standard shadcn/Recharts charting convention.
  Verified via the preview tools (not just assumed) that this actually
  resolves to real distinct colors through Recharts' SVG rendering in both
  light and dark mode, since CSS-var-in-SVG-fill support was the part most
  likely to silently fail.
- Hit the same Recharts `Tooltip` `formatter` typing friction documented
  nowhere before now: typing the callback's `value`/`name` params
  explicitly (`(value: number, name: string) => ...`) fails because
  Recharts' `Formatter<ValueType, NameType>` allows `value` to be
  `undefined`. Fixed by leaving the params untyped and casting inside the
  body (`Number(value)`, `String(name)`) instead — worth knowing for any
  future Recharts `Tooltip` usage in this app.
- Updated `HomePage`'s Spending panel from static mock content to real
  derived data (`$spent / $income`, percent-of-income progress bar, a
  "top spending category" insight) and made it a real link to `/spending`,
  matching how the Budget panel was already wired to `/budget`.
- Placed `SpendingPieChart` in `components/spending/`, not
  `components/charts/` — same reasoning already established for
  `CategoryBreakdownBar` living in `components/budget/` rather than
  `components/charts/`: it's tightly coupled to the categories/purchases
  data shape, not a generic reusable wrapper. `components/charts/` remains
  empty, reserved for a true general-purpose Recharts wrapper if one is
  ever needed.
- Verified end-to-end (see `clearbooks-verify` skill): all 9 seeded
  categories render in the pie chart + legend with percentages summing to
  100% and dollar amounts matching existing mock totals exactly; clicking
  "Yearly Spent" correctly recalculated every legend amount to exactly
  12× the monthly figure while percentages stayed identical; navigating to
  June 2026 (no mock data) correctly zeroed both stat cards to $0.00 and
  swapped in the "No spending logged for this period yet" empty state
  instead of a broken/empty chart; "Back to current" correctly restored
  July 2026. All clean (see `clearbooks-verify` skill).

### 2026-07-06 — Income screen (categorized income sources + pie chart)
- User asked for an Income screen wired to the dashboard's Income panel the
  same way Budget/Spending already are: show all income sources, let them
  be categorized, show total income this month/this year plus past-month
  history, and show each source's percentage of income makeup with a
  visual. Explicitly scoped to front-end only for now (no cross-screen data
  wiring beyond what already exists via the shared store).
- The categorization ask meant `Paycheck` itself needed a category, not
  just a new page over existing data (unlike the Spending screen, which was
  a pure new lens on data that already existed). Added `IncomeSource`
  (`src/types/incomeSource.ts` — id/name/icon/color/isCustom, same shape as
  `BudgetCategoryBase` minus `resetDay`, since a source has no reset
  cycle/target to track spend-against) and gave `Paycheck` a required
  `sourceId`. Because `Paycheck` is a single shared ledger type already used
  by the Budget page's `AddPaycheckDialog`, making `sourceId` required
  (rather than optional) meant that dialog needed a Source `Select` added
  too — every paycheck, however it's added, now belongs to a source.
- Seeded `useBudgetStore` with 5 income sources (W-2 Job, Freelance, Uber,
  DoorDash, Airbnb — pulled directly from the app's stated hybrid-worker
  scope in Project Overview) and reassigned/added mock paychecks across them
  (W-2 kept its original 2×$2,600; added Freelance $800, Uber $150+$180,
  Airbnb $650; DoorDash deliberately seeded with zero paychecks to exercise
  the same "$0 sources filtered out of the breakdown" path
  `CategoryBreakdownBar`/`SpendingPieChart` already established). This
  changed the mock "money earned this month" total from $5,200 to $6,980 and
  therefore every percentage-of-income budget target and dashboard figure
  derived from it — an intentional side effect of making previously-flat
  mock income data actually categorized and multi-source, not a bug.
- Added `getSourcePaychecks`/`getSourceMonthlyIncome` to `src/lib/income.ts`
  (a source's paychecks/total for the month containing a reference date —
  same reference-date-defaults-to-now, derived-not-stored pattern as every
  other helper in that file).
- Built the Income screen by mirroring established patterns exactly rather
  than inventing new ones: `IncomePage` reuses `MonthYearPicker` as-is (same
  as Spending did); `IncomeSummary` (2 clickable cards, Earned This Month /
  Projected This Year) + `IncomeSourcesPieChart` copy the
  card-selects-metric-drives-chart-below interaction and Recharts donut
  approach from `SpendingSummary`/`SpendingPieChart` almost verbatim, swapping
  "% of spending" for "% of income"; `IncomeSourceRow` mirrors
  `BudgetEnvelopeRow` (icon/name, a `Progress` bar, $ + % on the right,
  chevron-toggle expand) but drops the reset-cycle date range and
  over-budget styling, since a source has no target to be "over"; expanding
  a row renders `IncomeSourcePaychecks`, mirroring `CategoryPurchases`
  (inline paycheck list + small add form, `sourceId` supplied by the row
  rather than user input, same re-`reset()`-on-`referenceDate`-change fix
  `CategoryPurchases` already needed for the same mount-persists-across-
  month-navigation reason); `AddIncomeSourceDialog` mirrors `AddBudgetDialog`
  reduced to just a name field (icon fixed to a generic `Banknote`, color
  cycled through the same 5 chart tokens).
- Split paycheck-related Zod schemas across two files rather than
  overloading `budget.ts` further: kept the original amount+date-only
  `addPaycheckSchema` there (used by `IncomeSourcePaychecks`'s row-scoped
  form, which doesn't need `sourceId` as user input), and added a new
  `src/lib/schemas/income.ts` with `addIncomeSourceSchema` and
  `addPaycheckWithSourceSchema` (extends the base schema with a required
  `sourceId`, used only by the standalone `AddPaycheckDialog`).
- Updated `HomePage`'s Income panel from static mock content to real derived
  data. Unlike Budget/Spending, income has no natural "vs. a ceiling" ratio
  for the panel's progress bar (there's no budget to be under/over) — rather
  than inventing an arbitrary number, reused the top income source's share
  of this month's income as the progress value, paired with an insight line
  naming that source and its percentage. Made the panel a real link to
  `/income`, matching Budget/Spending.
- Hit one new TS/Recharts typing wrinkle beyond the `Tooltip` `formatter`
  issue already documented in the Spending session above: annotating the
  formatter's `value` param as `number` (as `SpendingPieChart` appears to do
  literally in source) type-checked fine in isolation but failed once a
  *second* Recharts `Tooltip` with a differently-shaped payload existed in
  the same `tsc` project (generic inference from the first usage leaked into
  the second). Fixed the same way the existing note prescribes — left
  `value` untyped and called `Number(value)` in the body — but worth
  flagging that the failure can appear only when multiple chart components
  coexist, not when checking a single file alone; don't assume a Recharts
  formatter pattern that compiles for one chart will compile for the next
  without re-checking the whole project.
- Verified end-to-end (see `clearbooks-verify` skill): dashboard's Income
  panel shows real `$6,980.00 / $83,760/yr` and correctly picks the top
  source; `/income` renders all 5 sources with correct per-source $/%
  figures summing to the monthly total, pie chart matches (DoorDash
  correctly omitted from the legend at $0); expanded DoorDash's row, added a
  $95 paycheck, and confirmed the total, row, and pie chart all updated live
  to include it (then removed it again, confirming the total reverted);
  toggled the Yearly card and confirmed every source's yearly figure is
  exactly 12× its monthly one; navigated to June 2026 and confirmed the
  "No income logged for this period yet" empty state plus the still-expanded
  DoorDash row's add-paycheck date field correctly re-defaulted to
  `2026-06-15` (confirming the reused mount-persists-across-navigation fix
  works here too), then "Back to current" restored July correctly; on the
  Budget page, confirmed `AddPaycheckDialog`'s new required Source select
  defaults sensibly and a submitted paycheck attributes to the chosen source
  (added then removed a test $300 W-2 paycheck to leave seed data intact).
  All clean (see `clearbooks-verify` skill).

### 2026-07-06 — Dashboard revamp: top summary row + inline tabs
- User wanted more key information centralized on the dashboard — what
  they're spending their monthly income on, how much is left over, and
  where spending is going — without clicking into separate pages.
  Clarified up front via three questions: "leftover" means income minus
  spending (not the donut's existing, different "remaining budget" =
  budgeted-minus-spent); the real per-category spending breakdown should
  replace the donut rather than sit alongside it; and — the user's own
  design, given verbatim rather than picked from the offered options —
  "add one big horizontal row at the top of the screen... instead of
  clicking on the panels to get to different views/screens let's have
  the views below the horizontal row... tabs at the bottom of it to
  switch between the different views/screens."
- Added `getLeftoverCash` to `src/lib/income.ts` (`monthlyIncome -
  getTotalSpent(...)`), deliberately named to stay lexically distinct
  from the donut's old "remaining budget" concept even though both are
  "money not yet spent" in a loose sense — they answer different
  questions (cash in pocket vs. budget room left) and conflating the
  names would have made future bugs likely.
- Extracted `BudgetContent`/`SpendingContent`/`IncomeContent`
  (`components/budget/`, `components/spending/`, `components/income/`)
  out of `BudgetPage`/`SpendingPage`/`IncomePage` — each owns its own
  `referenceDate` state and everything from `MonthYearPicker` down,
  verbatim-moved from the old page files. This is what let the same
  component mount twice independently (once as the standalone route,
  once inside a dashboard tab) with fully separate month-navigation
  state and zero prop-drilling from `HomePage` — confirmed during
  verification that navigating the Budget tab to June 2026 left the
  Spending tab and the top summary row both still on July 2026. The
  three page files shrank to ~15-line wrappers (heading + back button +
  the content component); `/budget`/`/spending`/`/income` still work
  identically as standalone routes, `src/App.tsx` needed zero changes.
- Built `MoneySummaryRow` (`components/dashboard/`) — one wide `Card`
  with 3 segments (Income/Spent/Leftover), always computed for the
  *current* month regardless of what historical month any tab below is
  browsing to, preserving the pre-existing "dashboard live content
  always shows now" principle. Reuses `DashboardPanel`'s tone/icon
  visual language by exporting its previously-private `toneClasses`
  lookup rather than duplicating it.
- Added shadcn `tabs` (`npx shadcn@latest add tabs -y`) and proactively
  fixed the generated `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`
  missing `React.forwardRef`, per this file's established
  checked-and-fixed-on-add convention.
- Deleted `MoneyOverviewCard.tsx` outright (fully replaced by
  `MoneySummaryRow`) but deliberately kept `DashboardPanel.tsx`, even
  though nothing renders it directly anymore — its tone/icon/value
  visual language is exactly what `MoneySummaryRow` reuses, and deleting
  a small, working, well-factored component for no benefit seemed worse
  than a one-line note that it's currently unused-as-a-panel.
- Bundled in a small consolidation while touching this code: three
  different files (`HomePage`, the now-deleted `MoneyOverviewCard`, and
  `BudgetSummary`) each independently re-implemented the same
  `categories.reduce(getCategorySpent...)` that `getTotalSpent`
  (`src/lib/spending.ts`) already existed to provide. The first two
  disappeared with this rewrite; fixed `BudgetSummary.tsx`'s copy too
  (a strict no-op swap to `getTotalSpent(...)`) so no duplicate was left
  behind for no reason.
- Chose to drop Tax from the dashboard entirely rather than carry it
  forward as a disabled tab — it was always 100% mock content (even one
  of the old donut's 4 slices was a hardcoded `$1,100` placeholder), and
  a tab promising a feature that doesn't exist yet isn't better than no
  tab. `CLAUDE.md`'s "Not yet implemented" list already tracks it.
  Spending was made the default active tab since "where is my money
  going" was the revamp's central ask.
- **Long, ultimately-unnecessary detour verifying dark mode**: computed
  styles on the active `TabsTrigger` kept reading as an opaque white
  background no matter what was changed — swapping the shadcn-shipped
  `data-active:` custom variant for the native `data-[state=active]:`
  arbitrary variant, even overriding `--background` or setting an inline
  `background-color !important` directly via `preview_eval` had zero
  effect on the next read. This looked exactly like a broken cascade and
  briefly got "fixed" with a redundant React-state-driven className
  workaround. The real cause: `TabsTrigger` ships `transition-all`
  (animates `background-color`), and every one of those reads was taken
  moments after a class/state change, catching mid-transition alpha
  values (`oklab(1 0 0 / 0.045)` instead of the settled value) — not a
  cascade bug at all. Restarting the preview server and re-reading after
  a real wait (~500ms) showed the correct, already-working values in
  both themes (light: opaque white bg + dark text; dark: a 4.5% white
  overlay on `--input`, i.e. `bg-input/30` × `--input`'s own 15% alpha —
  exactly the shadcn-intended "subtly elevated" active-tab look). Reverted
  the redundant workaround in `HomePage.tsx`; kept the harmless
  `data-[state=active]:` rename in `tabs.tsx` since it's simpler/more
  portable than depending on shadcn's bundled custom-variant CSS, even
  though it turned out not to be the fix. **Lesson for this file**: when
  a computed style looks "stuck" right after triggering a class or state
  change on an element with `transition-*` classes, wait for the
  transition to settle (or check `transitionend`) before concluding the
  cascade itself is broken — an inline `!important` override that
  appears to have "no effect" is a strong tell that you're reading a
  mid-transition value, not that the override failed.
- Verified end-to-end (see `clearbooks-verify` skill): top row's Income
  ($6,980) − Spent ($3,447.00) = Leftover ($3,533.00) confirmed exactly;
  Spending is the default active tab and renders its full breakdown
  chart; clicking Budget/Income tabs switches `TabsContent` to each's
  complete content (confirmed `BudgetSummary`'s post-refactor "Monthly
  Spent / Total Budgeted" figure — $3,447.00 / $4,386 — matches what the
  old inline reduce produced); navigated the Budget tab to June 2026 and
  confirmed the Spending tab and the top row both stayed on July 2026
  (independent state, not shared); visited `/budget` directly and
  confirmed it renders identically to before the extraction. All clean
  (see `clearbooks-verify` skill) after accounting for the
  transition-timing red herring above.
- `preview_screenshot` timed out repeatedly this session (30s timeout,
  page was actually fine per `document.readyState`/`preview_snapshot`) —
  worked around by relying on `preview_snapshot`/`preview_eval` for the
  entire verification pass instead. Not investigated further; flagged
  here in case it recurs.

### 2026-07-12 — Firebase Auth + Firestore persistence (Plaid deferred)
- User asked to "start connecting the backend" — Firebase (to actually
  store data) and Plaid (to link a real bank account). Given Plaid needs
  a developer sandbox account with API keys the user didn't have yet, and
  real Plaid work needs Cloud Functions to securely exchange tokens
  (nothing to usefully build without those credentials), scoped this
  session to Firebase Auth + Firestore only, built completely and
  verified end-to-end; Plaid stays a placeholder in `functions/` for a
  future session. Also confirmed: email/password **and** Google sign-in,
  and new accounts start completely empty rather than seeded with the
  old mock dataset (but with an on-demand "Load demo data" action so the
  demo data stays reachable).
- Found the real Firebase project was further along than expected —
  `.firebaserc` already had a real (non-placeholder) project id
  (`budgetapp-67761`) and `.env.local` was already populated with real
  client config from an earlier session, so this was "wire up real
  Auth/Firestore against an existing project," not "set up a project
  from scratch."
- Designed the Firestore data model as `users/{uid}` (root doc:
  `bankBalance`, `paychecksPerMonth`) + 4 subcollections (`categories`,
  `incomeSources`, `paychecks`, `purchases`) — subcollections rather
  than one array-holding doc, so each collection gets its own
  `onSnapshot` listener matching the granular per-field Zustand
  selectors every component already used, and so concurrent writes from
  two tabs/devices don't need array read-modify-write races.
- Resolved the icon-serialization problem flagged in an existing code
  comment (`BudgetCategory.icon`/`IncomeSource.icon` aren't
  Firestore-serializable) with the smallest possible blast radius — see
  the "Icon serialization fix" bullet in Current Status for the actual
  mechanism (`iconName: string` only at the write boundary, converted
  back inside the sync layer).
- Rewrote `useBudgetStore` around the one-writer Firestore-sync pattern
  (see Architecture) — the payoff worth calling out here: every existing
  "call action, `reset()` the form, close the dialog" pattern in the Add
  dialogs kept working completely unchanged, with no optimistic-UI layer
  needed.
- Built `useAuthStore` with a **module-level** `onAuthStateChanged`
  listener (not a hook/Context) that starts/stops the budget store's
  sync directly. Deliberately had `useBudgetStore`'s actions read the
  signed-in uid via `getFirebaseAuth().currentUser?.uid` instead of
  importing `useAuthStore`, to keep the store-to-store dependency graph
  one-directional and avoid a circular import.
- **Found and fixed a real routing gap during verification**:
  `RequireAuth` only guards *nested* routes — nothing redirected an
  already-authenticated user away from `/sign-in` itself, since that
  route is an unprotected sibling, not a child of the guard. Discovered
  this by testing sign-up and finding the app just sat on the sign-in
  form after a successful account creation (confirmed via direct URL
  navigation to `/` that the user actually was authenticated — the
  dashboard rendered fine, nothing just told the user to go there).
  Fixed by adding a `status === 'authenticated'` check to `SignInPage`
  itself that renders `<Navigate to="/" replace />`.
- Adding shadcn `sonner` pulled in `next-themes` as an auto-installed
  dependency — a Next.js-oriented theme hook this Vite app has no
  `ThemeProvider` to back. Removed the import and the dependency,
  hardcoded `theme="system"` on the `Toaster` instead (Sonner falls back
  to `prefers-color-scheme` on its own; the actual toast colors already
  come from this app's existing CSS custom properties, unaffected).
  Proactively fixed the newly-added `alert-dialog.tsx`'s missing
  `forwardRef` on `AlertDialogOverlay`/`AlertDialogContent`, per this
  file's established checked-and-fixed-on-add convention — confirmed via
  `git diff` that the shadcn CLI's overwrite prompt for the *already*
  forwardRef-fixed `button.tsx` was correctly declined (`echo "n" |`),
  not silently reverted.
- **Blocked on missing Java** for the Firestore emulator (Auth emulator
  doesn't need it, Firestore's does) — genuinely not installed, confirmed
  via PATH/registry/filesystem search before asking the user to install
  a JDK rather than silently falling back to something riskier. After
  install, this session's already-running shell processes still didn't
  see the updated PATH (a normal Windows behavior — child processes
  inherit the parent's environment at spawn time, and the harness
  process predated the install) — worked around by prefixing just the
  emulator command with the known install path
  (`PATH="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot/bin:$PATH"`)
  rather than needing a full session restart.
- Verified end-to-end against the emulators (Auth 9099, Firestore 8080):
  sign-up → empty dashboard (no stale-data flash) → "Load demo data" →
  all 4 collections populate and the button disappears → added and
  removed a paycheck, confirmed the round-trip and that `Income this
  month` reverted exactly to $6,980 after the delete → added both a
  fixed goal (`$350/mo`) and a percentage goal (`5% of monthly income` →
  correctly computed `$349` target) and confirmed both survived a full
  page reload → signed out (confirmed redirect + local state reset) →
  hit `/budget` directly while signed out (confirmed redirect) → full
  dev-server restart, signed back in, confirmed all data rehydrated from
  Firestore, not anything surviving in memory. All clean (see
  `clearbooks-verify` skill), including `SignInPage` specifically since
  it's new UI.
- Found `signInWithPopup` (Google) can't be meaningfully tested through
  the browser automation tooling used for verification — clicking
  "Continue with Google" collapsed the popup into the *same* tab instead
  of a real second window (confirmed via `window.opener` being `null`,
  which a genuine popup would have set), so the Auth emulator's fake-IDP
  flow got stuck with no way to signal completion back to a non-existent
  opener. This is a tooling limitation of the automated browser context,
  not an app bug — the code is standard `signInWithPopup` usage; flagged
  for the user to spot-check manually in a real browser tab rather than
  claiming it as machine-verified.
- Deployed `firestore.rules` to the real project
  (`firebase deploy --only firestore:rules`) — this is a production
  action, and the harness's own auto-mode safety classifier correctly
  blocked the first attempt, requiring an explicit, specifically-named
  user confirmation before it would proceed. Also hit (and respected)
  two more safety blocks reaching for real-project verification: a
  `firebase auth:export` attempt (would have dumped every user's
  password hashes into the transcript just to find one uid — unnecessary
  for what was actually needed) and a dynamic `import()` of the Firebase
  SDK from an external CDN into the live page (also unnecessary — the
  same reload-based persistence check already used against the emulator
  works identically against the real project without any extra
  tooling). Both blocks were correct calls, not worked around.
- **Found the real project needed one more manual Console step beyond
  what was expected**: sign-up against the real project failed with
  `auth/configuration-not-found` — Email/Password wasn't enabled as a
  sign-in provider yet (a Firebase Console setting, Authentication →
  Sign-in method, not something deployable via CLI/code). User enabled
  it directly in the console; retried and real-project sign-up/sign-in/
  Firestore read-write all worked correctly afterward. Also discovered
  the real project didn't have a Firestore database provisioned at all
  yet — the rules deploy command created it automatically as part of
  deploying.
- Verified against the real project: signed up one test account, added
  a real budget category with a fixed monthly goal, confirmed it
  survived a full page reload (proving it's genuinely in Firestore, not
  local state) — user opted to leave that one test account in place
  rather than have it cleaned up, since it's harmless isolated test data
  invisible to anyone else.
- Left `.env.local`'s `VITE_USE_FIREBASE_EMULATORS` set to `"true"`
  after this session (it was flipped to `"false"` only briefly for the
  real-project pass) — local dev defaults to the emulator going forward,
  intentionally, so future sessions don't touch the real project by
  accident.

### 2026-07-12 — Codebase + `CLAUDE.md` cleanup, skill extraction
- User asked to safely remove stray test files and dead code, clean up
  redundancy in `CLAUDE.md`, and convert genuinely repeated procedures
  into Skills. Two Explore agents investigated first (dead code/stray
  files; `CLAUDE.md` redundancy/skill candidates) — findings below are
  theirs, this entry just records what was actually done.
- Deleted `firestore-debug.log` (gitignored, untracked, never committed —
  a local emulator-run artifact, safe to remove) and deduped `.gitignore`'s
  triple `CLAUDE.md` listing down to one.
- `DashboardPanel.tsx` had been fully dead since the 2026-07-06 dashboard
  revamp replaced it with `MoneySummaryRow` — only `toneClasses`/`PanelTone`
  were still imported, everything else (`DashboardPanel` itself,
  `DashboardPanelProps`, `TrendInfo`, `progressIndicatorClasses`) had zero
  references. Moved `toneClasses`/`PanelTone` into `MoneySummaryRow.tsx`
  (its only consumer) and deleted the file outright — the "kept it
  speculatively" call from the 2026-07-06 entry never paid off and nothing
  else grew a second use for it in the meantime.
- `src/lib/iconMap.ts`'s `iconMap` and `DEFAULT_ICON_NAME` were exported
  but only ever consumed internally by `getIcon` in the same file — dropped
  `export` from both, kept `getIcon` as the only public surface.
- No console.log/debugger statements, no commented-out code, and no
  unused npm dependencies were found — nothing else to remove.
- Fixed two stale Current Status bullets: the original `useBudgetStore`
  bullet still described the pre-Firestore seeded-mock-data behavior,
  directly contradicted by the later "Firestore-backed" and "Load demo
  data" bullets (new accounts actually start empty); and the shadcn
  component list hadn't been updated since `popover`/`tabs`/`sonner`/
  `alert-dialog` were added in later sessions.
- Trimmed the 2026-07-12 Firebase entry's one-writer-pattern and
  icon-serialization paragraphs, which had restated Current
  Status/Architecture almost verbatim, down to pointers — kept only the
  session-unique reasoning (blast-radius scoping, circular-import
  avoidance).
- The `clearbooks-verify` skill was created specifically to replace
  repeated "`tsc -b`/`oxlint`/`vite build` all clean, dark mode read
  correctly" closing sentences with a pointer, but four Session Log
  entries written after its creation (Spending screen, Income screen,
  Dashboard revamp, this file's own Firebase entry) still spelled it out
  verbatim — trimmed all four to the `(see clearbooks-verify skill)`
  pointer, keeping each entry's actual unique verification results.
- Two gotchas were referenced from Session Log entries as "documented
  elsewhere in this file" but had never actually been written as their
  own Architecture bullets — added both for real: the UTC-midnight
  date-string parsing gotcha, and the Recharts `Tooltip` `formatter`
  untyped-params workaround (the latter promoted since it's now been hit
  twice, with the second occurrence explicitly building on the first).
- **New skill**: three Session Log entries (adding `popover`, `tabs`,
  `alert-dialog`) each independently re-described the identical
  "run the CLI, check/fix missing `forwardRef`" procedure, explicitly
  invoking "this file's established convention" each time without that
  convention ever being written down as an actual runnable procedure.
  Created `.claude/skills/clearbooks-add-shadcn/SKILL.md`, modeled on
  `clearbooks-verify`'s format — covers the CLI run, the forwardRef
  check/fix, checking for unwanted auto-installed dependencies (the
  `next-themes`-via-`sonner` case from the prior session), and declining
  overwrite prompts on re-add so a prior fix isn't silently reverted.
  Trimmed the Architecture forwardRef bullet to point at it instead of
  leaving the procedure implicit.
- Verified (see `clearbooks-verify` skill): `tsc -b`/`lint`/`build` all
  clean; dev server confirmed `MoneySummaryRow` still renders correctly
  (icon tint colors, leftover-tone success/destructive switch) after the
  `toneClasses`/`PanelTone` move; `git status` confirmed only the
  intended files changed.

### 2026-07-12 — Federal + California tax estimate (`/tax`)
- User asked to build the Tax feature for real, scoped to California,
  before starting Plaid. This is the user's own personal account, not a
  demo — so the actual scope decisions mattered. Used `AskUserQuestion`
  up front to lock in: each income source gets a required tax
  classification (W-2 vs. self-employed, since only the latter owes SE
  tax); single filer, hardcoded; show both an annual total and a
  quarterly breakdown; include the federal QBI deduction.
- **The filing-status question surfaced a real complication mid-session**:
  the user is a recent international-student grad on OPT, which usually
  means *nonresident alien* federal tax status (Form 1040-NR — no
  standard deduction, no self-employment tax, different rules almost
  entirely) rather than the "normal" filer this feature was about to
  assume. Rather than silently building the wrong thing, asked a second
  clarifying round specifically about F-1/OPT tax-residency status and
  treaty-country exceptions (India's is the common one) before writing
  any tax math. User's own call: treat as a **resident alien** for now —
  standard single-filer rules apply, no NRA-specific handling built. This
  wasn't guessed; it was asked and answered explicitly, and it's worth
  remembering that a filing-status question here isn't cosmetic the way
  most of this app's dialog defaults are — getting it wrong would mean
  real numbers pointed the wrong way.
- **Researched current tax figures via `WebSearch`/`WebFetch` rather than
  relying on memorized bracket numbers**, given the real financial stakes
  — federal 2026 single-filer brackets and standard deduction, 2026 SE
  tax/Social Security wage base/Additional Medicare threshold, federal
  QBI deduction rules, California 2025 brackets/standard deduction (2026
  CA figures found this session were inconsistent across sources — some
  blogs mislabel 2025 numbers as 2026 — so 2025 was used as the reliably-
  sourced baseline instead, clearly labeled as such in code and UI rather
  than papered over), CA SDI rate (1.2%, no wage cap since SB 951), and
  quarterly estimated-payment mechanics. **Found a genuine, easy-to-miss
  CA-specific quirk**: California's quarterly installment split is 30% /
  40% / 0% / 30% — not even 25% quarters like federal. Missing this would
  have been a real, checkable inaccuracy in a feature explicitly meant to
  tell the user what to pay and when, so it's surfaced explicitly in the
  UI (`TaxContent`'s quarterly section caption) rather than left to look
  like a bug. Every bracket/rate constant in `src/lib/tax/brackets.ts` is
  commented with its source and tax year.
- Added `incomeType: 'w2' | 'selfEmployed'` to `IncomeSource`
  (`src/types/incomeSource.ts`) — required, no default, since which one a
  source is now drives real tax math rather than being cosmetic. Threaded
  through `FirestoreIncomeSourceDoc`, `firestore.rules` (validated on
  write, matching the existing field-type-validation convention), a
  required `Select` in `AddIncomeSourceDialog` (mirrors `AddBudgetDialog`'s
  `Controller`-wrapped `Select` pattern), and `demoData.ts` (W-2 Job → w2,
  the 4 gig/freelance sources → selfEmployed). For any pre-existing doc
  written before this field existed, `firestore/sync.ts` defaults to
  `'selfEmployed'` on read — deliberately the *conservative* fallback
  (risk of overstating tax owed) rather than `'w2'` (risk of silently
  dropping SE tax from the estimate entirely).
- Added `getAnnualizedIncomeByType` to `src/lib/income.ts` — the single
  integration point between the existing income model and the new tax
  module. It's this month's income (same window `getMonthlyIncome`
  already uses), split by each paycheck's source's `incomeType` and
  projected ×12 the same way `getYearlyProjectedIncome` already does.
  Everything in `src/lib/tax/` only ever sees `{ w2, selfEmployed }`
  totals, never raw paychecks.
- Built `src/lib/tax/` as 4 pure, derived-not-stored files (same
  convention as every other `src/lib/*.ts` helper — nothing new is
  written to the store or Firestore): `brackets.ts` (bracket tables +
  constants + a shared `applyBrackets` progressive-marginal calculator),
  `federal.ts` (`calculateFederalTax` — SE tax on 92.35% of net SE
  earnings, half-SE-tax above-the-line deduction, Additional Medicare tax,
  QBI deduction capped at 20% of taxable income before QBI, standard
  deduction, bracket application — returns every intermediate line item,
  not just the total, since the UI renders a full breakdown), `california.ts`
  (`calculateCaliforniaTax` — conforms to the federal half-SE-tax
  deduction for CA AGI purposes but **not** to QBI, since California
  doesn't allow it; SDI applies to W-2 wages only; no separate CA
  self-employment tax, SE net income just flows into ordinary CA taxable
  income), `quarterly.ts` (`getQuarterlyEstimates` — the 25/25/25/25 vs.
  30/40/0/30 split above, plus `formatDueDate` using the app's established
  parse-the-ISO-string's-own-components convention rather than
  `new Date(isoString)`).
- **This app doesn't track Schedule C business expenses yet** (tracked
  separately under Not yet implemented), so self-employment "net profit"
  is modeled as the full gross self-employment income logged — a known,
  documented simplification, not an oversight. Similarly, no wage/UBIA
  QBI phase-out is modeled (the target user's income is well under the
  ~$197k–201k single-filer threshold where that would start to matter).
- **Hand-verified the math with a throwaway `tsx` script before wiring
  into the UI** — see the throwaway-script-verification convention in
  Architecture above (promoted there during the 2026-07-21 cleanup pass
  after being asserted as "established practice" here without ever
  actually being written down). Checked 5 scenarios (all-W-2 $80k,
  all-self-employment $60k, a mixed case, zero income, and a high-income
  case specifically to trigger the Additional Medicare tax) against
  hand-computed expected values, confirmed the quarterly amounts sum
  exactly back to the annual totals for both jurisdictions, and confirmed
  CA's Q3 installment is genuinely $0 by design rather than a bug.
- Built `TaxContent.tsx` (`components/tax/`) — no chart-driven
  card-selection interaction here (nothing to select a metric that
  redraws a chart), so this stayed one file rather than splitting into
  summary/row subcomponents. Carries an explicit on-page disclaimer since
  this is real financial guidance rendered directly to the user, not
  decorative copy (see the Tax bullet in Current Status for what it
  actually says). At the time this page had no month/year navigation at
  all — superseded by the 2026-07-21 shared-date-filter entry below.
  `TaxPage.tsx` is the usual thin wrapper; `/tax` added to `App.tsx`'s
  protected routes and a `Tax` tab added to `HomePage.tsx`, mechanically
  identical to how Spending/Budget/Income were already wired.
- Verified (see `clearbooks-verify` skill): `tsc -b`/`lint`/`build` all
  clean. Confirmed via the dev server that `/tax` and the dashboard's Tax
  tab show identical numbers (same `TaxContent` mount, same store); added
  income sources of each `incomeType` and confirmed the required `Select`
  correctly blocks submission with neither chosen; confirmed the federal
  and California breakdown cards' line items sum to their displayed
  totals; confirmed the quarterly section's federal amounts sum to the
  federal total and CA amounts (30/40/0/30) sum to the CA total; dark
  mode checked since this is new UI. `firestore.rules`' new
  `incomeType` validation was updated locally but **not deployed** to the
  real project this session — deploying rules is a separate, explicit,
  user-confirmed action per this file's established convention (see the
  2026-07-12 Firebase entry), and wasn't asked for here.

### 2026-07-12 — Added a "Contracted (1099)" income classification
- Follow-up to the tax estimate above: the user's own current job is a
  genuine 1099 contracting position (confirmed via their actual contract
  language — a 1099-MISC, "Consultant shall be solely responsible for all
  federal, state, and local taxes"), and the 2-value `w2`/`selfEmployed`
  split didn't have a clean home for it. **Flagged up front, before
  building anything**, that this was a labeling question rather than a
  tax-treatment one (see `src/types/incomeSource.ts` for why) — confirmed
  via `AskUserQuestion` that this is genuinely 1099/no-withholding (not a
  W-2-through-an-agency arrangement, which would've meant tagging it `w2`
  instead, not adding a category at all) before touching any code.
- `IncomeType` (`src/types/incomeSource.ts`) is now
  `'w2' | 'contracted' | 'selfEmployed'`. `'contracted'` and
  `'selfEmployed'` are both routed into the same `selfEmployed` bucket by
  `getAnnualizedIncomeByType` (`src/lib/income.ts`) — confirmed this
  required **zero logic changes** there, since the existing `else` branch
  (anything not `'w2'`) already captured any future third value
  automatically; only the doc comment needed updating to make the
  bucketing intentional rather than incidental. `src/lib/tax/` itself
  (`federal.ts`/`california.ts`) needed no changes at all — it never knew
  about 3 income types, only ever `{ w2Income, selfEmploymentIncome }`.
  This is the same "the type distinction that matters for tax purposes
  isn't the type distinction that matters for organization" split as
  `BudgetCategory`'s `resetDay` vs `type` fields being independent axes.
- Added a third `SelectItem` to `AddIncomeSourceDialog`'s required
  `incomeType` `Select` ("Contracted (1099)", between "W-2 wages" and
  "Self-employed / freelance" — relabeled from the prior session's
  "Self-employed / 1099" since "1099" is now shared vocabulary across two
  options and needed to stop being the distinguishing word in that
  particular label). `addIncomeSourceSchema` (`src/lib/schemas/income.ts`)
  and `firestore.rules`' `incomeType in [...]` validation both extended to
  the 3-value list. Retagged `demoData.ts`'s "Freelance" mock source from
  `selfEmployed` to `contracted` — a closer real-world fit for an ongoing
  single-engagement freelance arrangement than the gig-platform sources
  (Uber/DoorDash/Airbnb), which stayed `selfEmployed`.
- Verified (see `clearbooks-verify` skill): `tsc -b`/`lint`/`build` clean.
  Added a `contracted`-tagged income source via the dev server, confirmed
  the dropdown shows all 3 options with the new labels, added a paycheck
  to it, and confirmed the Tax tab's Federal Tax Owed increased correctly
  (folded into the self-employment total, not silently dropped or
  double-counted) — then removed the test paycheck and confirmed the
  total reverted exactly to the pre-test baseline.

### 2026-07-21 — Staging + production Firebase environments
- User wanted a real staging/production split rather than the single
  `budgetapp-67761` project everything had been running against. Rather
  than deleting the leftover test account from that project (see the
  2026-07-12 Firebase entry — a test account was intentionally left in
  place there), the user repurposed the whole project as staging (see the
  "Three environments" bullet in Current Status for the renaming caveat)
  and created a new project for production.
- **Caught a real setup mistake before wiring anything up**: the user's
  first "production" config turned out to be a second **web app**
  registered inside the *same* `budgetapp-67761` project, not a separate
  **project** — same `projectId`/`authDomain`/`storageBucket`, only the
  `appId` differed. Diffed the pasted `.env.production` values against
  `.env.staging` side by side and caught this before any deploy/wiring
  happened; a Firebase "app" registration shares the same Firestore/Auth
  as every other app in that project, so this would have meant
  "production" secretly reading and writing the exact same data as
  staging, including that leftover test account. Explained the
  project-vs-app distinction and had the user create a genuinely separate
  project (`budgetapp-prod-f0c9a`) instead — confirmed via the corrected
  config's distinct `projectId`.
- Added `.env.staging`/`.env.production` and the `dev:staging`/`dev:prod`
  npm scripts plus `.firebaserc`'s named aliases — see the "Three
  environments" bullet in Current Status for the actual shape/reasoning.
  `.gitignore` needed an explicit update too — its existing `.env.*.local`
  pattern didn't cover bare `.env.staging`/`.env.production` filenames.
- **Verified the env-mode wiring without the browser preview tools**
  (unavailable this session): ran `vite build --mode staging` and
  `vite build --mode production` into throwaway output directories, then
  grepped each bundle for both projects' IDs — confirmed the staging
  build only contains `budgetapp-67761` and the production build only
  contains `budgetapp-prod-f0c9a`, proving Vite's mode-based env loading
  actually resolves to the right project per script rather than assuming
  it from the file-naming convention alone. Deleted both throwaway builds
  afterward.
- Per the user's own standing instruction (saved as a memory this
  session: always ask before deploying emulator-side Firebase changes to
  the live project), did **not** deploy `firestore.rules`/
  `firestore.indexes.json` to the new production project as part of this
  work — that's a separate explicit confirmation, asked for at the end
  of the session rather than assumed from "make sure prod is set up the
  same way as staging."

### 2026-07-21 — CLAUDE.md cleanup pass
- User asked to go over `CLAUDE.md` and remove anything unnecessary or
  repetitive, converting genuinely repeated procedures into Skills. Ran a
  background Explore agent to audit the whole file (by then ~1780 lines)
  against the two skills already extracted in the 2026-07-12 cleanup pass
  (`clearbooks-verify`, `clearbooks-add-shadcn`), rather than re-deriving
  what's already covered.
- **Verdict on new skills: none warranted.** The one recurring pattern
  found — hand-verifying date/numeric logic with a throwaway script before
  wiring it into the UI (used for `getCurrentPeriod` and the tax
  calculations) — was asserted as "established practice" in two Session
  Log entries but had never actually been written down anywhere reusable,
  the same gap the 2026-07-12 pass found for the UTC-midnight and Recharts
  gotchas. That's a documentation gap (a fact that needs stating once),
  not a procedure with hidden mechanics worth extracting into a skill —
  promoted it to a real Architecture bullet instead of creating a new
  skill file.
- Fixed a real staleness bug in Project Overview: its "Planned feature
  areas (not yet built)" list still included budgeting envelopes, income
  tracking, and the full tax tracker — all three had been fully built for
  multiple sessions by this point, directly contradicted by Current
  Status just below. Trimmed to only what's genuinely still unbuilt
  (Plaid, OCR upload, business expense tracking, mileage, and the tax
  tracker's still-missing pieces specifically: a tax savings fund balance
  and year-end export).
- Trimmed several Session Log passages (Tax estimate, Contracted-income,
  and Staging/production entries) that had restated Current Status facts
  in near-identical phrasing — kept each entry's session-unique reasoning
  (the `AskUserQuestion` confirmations, the "zero logic changes" finding,
  the web-app-vs-project catch, the build+grep verification method) and
  replaced the restated facts with pointers back to Current Status/
  Architecture/the relevant source file.
- This pass also folded in the same-day global-date-filter and Firestore
  audit-timestamp work (see the entry above) — updated Current Status/
  Architecture for both rather than treating the doc cleanup as a
  separate pass from the feature work it needed to describe anyway.

### 2026-07-21 — Single shared date filter + Firestore audit timestamps
- User asked for two things in one request: (1) the date filter
  (`MonthYearPicker`) should move to the top of the screen and control
  every tab/window at once, reversing the earlier deliberate
  per-tab-independence design; (2) anything changed via the date filter
  should be saved to Firestore with a created/modified timestamp. Neither
  was obvious in scope, so both were clarified via `AskUserQuestion`
  before touching code: confirmed the shared filter should also override
  `MoneySummaryRow`'s previous always-current-month behavior and should
  extend to the Tax tab (which had no date concept before); confirmed the
  standalone routes (`/budget` etc.) should be genuinely connected to the
  same shared state, not just independently reset (the user's own
  framing — "isn't /budget connected to the dashboard's tabs" — is what
  settled this, since the two weren't actually sharing state before, just
  sharing code); and confirmed "date created/modified" meant real
  `createdAt`/`updatedAt` audit fields on every record, not something
  about the filter itself (which doesn't create/modify data on its own).
- Moved `referenceDate` out of local `useState` in `BudgetContent`/
  `SpendingContent`/`IncomeContent` into a new `useDateFilterStore`
  (pure in-memory UI state, deliberately not Firestore-synced and
  deliberately its own store rather than folded into `useBudgetStore`,
  whose identity is specifically "Firestore-synced data"). `MonthYearPicker`
  itself needed zero changes — only how it's wired changed, and it's now
  rendered once per page (`HomePage.tsx` + each of the 4 standalone
  page wrappers) instead of once inside each `*Content` component.
- **Two things had to change carefully, not just get lifted mechanically**:
  `MoneySummaryRow`'s labels ("Income this month") would have read falsely
  while browsing history, so they now read "Income in <Month> <Year>"
  dynamically (new `formatMonthYear` helper in `src/lib/period.ts`, also
  reused by `MonthYearPicker`'s own trigger label instead of inlining the
  same formatting twice). And `TaxContent` gaining a date dimension does
  **not** mean tax rates change per month — `FEDERAL_BRACKETS_2026`/
  `CA_BRACKETS_2025` are fixed constants with no multi-year lookup, so
  only which month's income gets annualized and which year's quarterly
  due dates show actually change; the on-page disclaimer now states the
  bracket years literally instead of deriving them from the filter, to
  avoid falsely implying the rates themselves move.
- Added `createdAt`/`updatedAt` to all 4 synced Firestore collections via
  `serverTimestamp()` (never client `new Date()`, to avoid trusting
  client clocks), injected inside `src/lib/firestore/writes.ts` itself so
  no existing call site (`AddBudgetDialog`, `AddPaycheckDialog`, etc.)
  needed to change what it supplies. `firestore.rules` gained a shared
  `hasValidTimestamps()` helper (matching the existing `isOwner()`
  factoring) requiring both fields equal `request.time` — checked only on
  `create`, since none of these 4 entities has an update path yet (every
  "add" is always a brand-new document); the update rules were split out
  from create specifically so a hypothetical future edit feature doesn't
  inherit a same-as-create timestamp requirement that would force
  `createdAt` to be overwritten on every edit.
- **Caught a real gap while implementing**: `src/lib/firestore/demoData.ts`'s
  `loadDemoData` writes via `writeBatch` directly, bypassing `writes.ts`
  entirely — meaning it wouldn't have set `createdAt`/`updatedAt` at all,
  which would have made "Load demo data" fail outright against the new
  `hasValidTimestamps()` rule. Fixed by injecting `serverTimestamp()`
  directly into each of that function's batched writes too.
- Verified (see `clearbooks-verify` skill): `tsc -b`/`lint`/`build` all
  clean. This session's rules changes (`hasValidTimestamps()`) have
  **not** been deployed to either the staging or production Firebase
  project yet — per the user's own standing instruction, that's a
  separate explicit confirmation still to be asked for.

### 2026-07-22 — Firebase App Check (reCAPTCHA v3)
- User asked how to set up App Check, then — after a long back-and-forth
  answering pure setup questions (creating a reCAPTCHA v3 account, what a
  "Label" is, what domain to register, site key vs. secret key, one
  registration per project vs. shared) — explicitly said to wire it into
  the actual app code once both staging and production had a site key
  registered (the user reused the **same** site key, registered against
  "localhost", for both environments — reasonable since a reCAPTCHA site
  key isn't tied to a single Firebase project, and neither environment has
  a real public domain yet).
- `src/lib/firebase.ts`: `initializeAppCheck`/`ReCaptchaV3Provider`, gated
  behind `if (recaptchaSiteKey)` so `.env.local` (emulator-first dev,
  deliberately left with no key) cleanly no-ops — the emulators don't
  check App Check and there's nothing real to protect there. Added
  `VITE_FIREBASE_RECAPTCHA_SITE_KEY?` (optional) to `src/vite-env.d.ts`
  and documented it in `.env.example`.
- Verified the site key was actually picked up per-environment (not just
  assumed from the file-naming convention) using the same
  build-then-grep-the-bundle method already established in this file for
  the staging/production project-ID split: ran `vite build --mode staging`
  and `--mode production` into throwaway output directories, grepped each
  bundle for the literal site key string (found in both, as expected since
  it's shared), and confirmed a **default** (`.env.local`) build contains
  zero App Check code at all (`initializeAppCheck`/`ReCaptchaV3Provider`
  don't appear), proving the `if (recaptchaSiteKey)` guard actually
  no-ops rather than just looking like it should. Deleted the throwaway
  builds afterward.
- Both projects are left in Firebase Console's **Unenforced** (monitor-only)
  mode — App Check attaches tokens and Console shows verified-vs-
  unverified request metrics, but nothing is actually rejected yet.
  Explained to the user (separately, not itself an action taken) why this
  matters before flipping to Enforce: unlike Unenforced, Enforce applies
  immediately to all traffic including the user's own signed-in sessions,
  so it's worth watching the Console metrics for a healthy verified rate
  first, rather than flipping blind.
- Committed this session's accumulated work (App Check + the shared date
  filter + Firestore audit timestamps + the `CLAUDE.md` cleanup, none of
  which had been committed yet) as a single commit — confirmed via
  `git diff` on `package.json`/`.gitignore`/`.firebaserc` that everything
  staged was expected before committing, since those three specifically
  had unrelated-looking prior-session changes (the staging/prod npm
  scripts and `.env.staging`/`.env.production` gitignore entries) that
  needed a sanity check before bundling them into the same commit.

### 2026-07-22 — Date filter redesigned: month/year bookmark tabs (not a popover)
- User asked, in the same session as the shared date filter above, to
  layer in "a start/end date filter" with easy month/year shortcuts on
  top of what had just been built — before any code was written, this
  surfaced a real design fork (does a custom range override each
  category's own resetDay cycle? does the picker stay a popover, or
  become something else?), so both were resolved via `AskUserQuestion`
  first: category cycles → "range wins, targets prorated"; picker shape →
  a calendar popover with click-two-dates range selection. Implementation
  of that design got partway through (added the `calendar` shadcn
  component, `react-day-picker`/`date-fns`, a `DateRange`/`daysInRange`/
  `annualize`-with-proration model in `src/lib/period.ts`) before the user
  interrupted mid-build with a **different, simpler design**: bookmark-
  style month tabs across the top, a year label above them (also
  clickable, to filter by the whole year) with prev/next arrows to browse
  which year's tabs are shown — and, asked directly via `AskUserQuestion`,
  confirmed custom start/end ranges should be **dropped entirely** in
  favor of just month/year. This simplified `DateFilterMode` back down to
  `'month' | 'year'` only (no `'custom'` case ever shipped) and made the
  whole proration question moot — `annualize`/`getTargetForMode` only ever
  branch on two exact cases (×12 for month, as-is for year), no day-count
  math anywhere. Uninstalled `react-day-picker`/`date-fns` and deleted the
  unused `calendar.tsx` before they ever got wired into anything, rather
  than leaving speculative dead code from the abandoned first design.
- Built `DateFilterTabs.tsx` (`components/budget/`, replacing
  `MonthYearPicker.tsx` outright) — self-contained, reads/writes
  `useDateFilterStore` directly with no props, unlike the old picker's
  `value`/`onChange` pattern; eliminates the identical
  `useDateFilterStore` + `<MonthYearPicker value=... onChange=.../>`
  boilerplate that used to be repeated at all 5 render sites
  (`HomePage` + 4 standalone page wrappers). A local `displayedYear`
  (independent from the committed filter) lets the prev/next arrows
  browse which year's 12 month tabs are shown without themselves changing
  the filter — only clicking a month tab or the year label commits a
  selection, mirroring the old picker's "navigate vs. select" split.
- Reworked `useDateFilterStore` around `mode: 'month' | 'year'` +
  `startDate`/`endDate` (a `DateRange`) instead of a single
  `referenceDate`, with `setToMonth`/`setToYear` actions (`monthBounds`/
  `yearBounds` in `src/lib/period.ts` compute the calendar bounds). Added
  `useDateFilterRange()`, a `useMemo`-wrapped `{start, end}` selector —
  needed because naively returning a fresh object from a plain selector
  broke every `useEffect`/`useMemo` downstream that depended on the range
  (e.g. `CategoryPurchases`'s re-default-date-on-navigate effect), since a
  new object identity on every render defeats a dependency-array
  comparison even when the underlying dates haven't actually changed.
- Rewrote every consumer that used to take a `referenceDate: Date` prop to
  instead take `range: DateRange` (+ `mode: DateFilterMode` wherever a
  target/projection needs to scale): `BudgetContent`/`BudgetSummary`/
  `BudgetEnvelopeRow`/`CategoryBreakdownBar`/`IncomeOverview`/
  `CategoryPurchases`/`AddPaycheckDialog` (Budget), `IncomeContent`/
  `IncomeSummary`/`IncomeSourceRow`/`IncomeSourcePaychecks`/
  `IncomeSourcesPieChart` (Income), `SpendingContent`/`SpendingSummary`/
  `SpendingPieChart` (Spending), `TaxContent`, `MoneySummaryRow`. Each
  screen's paired "current window" + "other granularity" card (e.g.
  Budget's 3rd card, Income's "Projected This Year", Spending's "Yearly
  Spent") now flips which granularity is the "current" one and which is
  the projection depending on `mode` — viewing a month shows the window's
  actual total plus a ×12 annual projection (unchanged from before this
  session); viewing a whole year shows the window's actual (real, not
  projected) annual total plus a ÷12 monthly average instead, avoiding a
  3rd card that would otherwise just repeat the 2nd card's number.
- **Found and fixed a real bug during verification, not just a redesign
  quirk**: `useDateFilterStore`'s `setToMonth`/`setToYear` spread
  `monthBounds(date)`/`yearBounds(date)` (which return `{start, end}`)
  directly into `set()`, but the store's actual fields are named
  `startDate`/`endDate` — so `set({ mode: 'month', ...monthBounds(date) })`
  silently added stray, unused `start`/`end` keys to the store's state and
  **never updated `startDate`/`endDate` at all**. `tsc` didn't catch this
  because TypeScript's excess-property check doesn't reliably cover
  properties introduced via object spread the way it does for literal
  properties. Symptom: `mode` correctly flipped (e.g. clicking the year
  label visibly highlighted it), but every actual figure kept showing
  whatever month the store had mounted with — including, misleadingly,
  when testing "year mode" against demo data that's entirely dated in one
  month, where the bug's wrong numbers happened to coincidentally match
  the right ones. Caught by testing an actually-empty month (June, no
  demo data) and seeing $6,980 still displayed instead of $0. Fixed by
  destructuring explicitly: `const { start, end } = monthBounds(date);
  set({ mode: 'month', startDate: start, endDate: end })`.
- Also found and fixed a real formatting bug this redesign exposed:
  `IncomeOverview`'s "Projected this year"/"Monthly average" figures used
  `.toLocaleString()` (no fixed decimals) instead of the app's established
  `formatCurrency()` — harmless before, since `monthlyIncome × 12` from
  whole-dollar paychecks usually stayed a clean number, but year mode's
  new ÷12 division (e.g. `$6,980 / 12 = $581.6666...`) exposed it as a
  real display bug (`$581.667` instead of `$581.67`).
- Extracted per-screen `metricLabel` strings (e.g. "% of monthly income",
  "% of yearly spending") into an explicit `Record<Metric, string>` built
  by each Summary component, rather than deriving them by lowercasing a
  card's own display label (`${cardLabel.toLowerCase()}`) — the derived
  version produced grammatically awkward strings once card labels started
  varying by mode ("% of earned this month", "% of monthly average"
  instead of "% of monthly income", "% of monthly average spending").
- **Long dead-end chasing what looked like a dark-mode CSS bug**: the
  active month tab's `bg-background`/`bg-card` utility class rendered as
  solid white in dark mode via `getComputedStyle`, even after ruling out
  transition-timing artifacts, cascade-layer specificity, and stale-HMR
  state (confirmed via a genuinely fresh tab and full reload). Eventually
  found the **exact same** wrong-white result on a pre-existing,
  already-shipped button (`SignOutButton`) checked the identical way —
  proving it isn't anything this session's code introduced, and is
  either a real latent app-wide dark-mode issue or an artifact specific
  to querying computed styles through this browser tooling, neither of
  which is this feature's to fix. Left `DateFilterTabs`' active-tab class
  as `bg-card`/`text-card-foreground` (a deliberate choice over
  `bg-background` — it visually matches the Card-based content the active
  tab introduces) and moved on rather than continuing to chase a
  pre-existing, out-of-scope issue.
- Verified end-to-end via the dev server (see `clearbooks-verify` skill):
  `tsc -b`/`lint`/`build` all clean; clicking each month tab correctly
  scopes income/spend/targets to that calendar month (confirmed against
  an empty month, not just the one month all demo data happens to live
  in); clicking the year label correctly switches to real annual totals
  (not a ×12 projection) with quarterly Tax due dates keyed to that year;
  `CategoryPurchases`' re-default-on-navigate fix confirmed working with
  the new memoized range (expanded Groceries, switched to June, watched
  its date field and purchase list both correctly clear); the standalone
  `/budget` route renders identically to the dashboard's Budget tab. All
  clean aside from the flagged, out-of-scope dark-mode oddity above.
- Two small follow-up requests in the same session: repositioned
  `DateFilterTabs` so the year is a 13th tab sharing the exact same
  bookmark styling as the 12 months (`‹ 2026 Jan Feb … Dec ›`, prev/next
  arrows bookending the whole strip) instead of a visually distinct
  control sitting in its own row above the months; then added a "jump to
  today" icon button (`CalendarDays`, no visible label) right after the
  next-year arrow, replacing the old below-strip "Back to current" text
  link with an icon button in the row itself, shown only while browsing
  away from the current month.

### 2026-07-22 — Delete budget categories + income sources
- User asked to be able to delete a budget category or income source,
  with the delete control living inside the row's existing expand-on-click
  panel (`CategoryPurchases`/`IncomeSourcePaychecks`) and a confirm/cancel
  step before it actually happens — the same `AlertDialog` pattern already
  used for "Load demo data."
- The one real design decision: what happens to a category's/source's
  purchases/paychecks when it's deleted. Rather than leaving them
  orphaned (pointing at an id that no longer exists — technically
  harmless since nothing would ever display them again, but silently
  leaked data sitting in Firestore forever) or asking the user to move/
  reassign them first, chose **cascading delete**: `deleteCategory`/
  `deleteIncomeSource` (`src/lib/firestore/writes.ts`) each query every
  purchase/paycheck pointing at that id (`getDocs` + `where(...)`) and
  delete them alongside the category/source doc in one `writeBatch` — well
  under the 500-op cap for a personal-scale dataset, mirroring the batch
  pattern `demoData.ts` already established. This matches the plain
  reading of "delete this category" (it and its history are gone, not
  silently orphaned), and the confirm dialog's copy says so explicitly
  ("every purchase ever logged under it — not just what's shown for the
  currently selected month/year") so deleting a category while browsing a
  past month doesn't read as if only that month's purchases are affected.
- No `firestore.rules` changes needed — `allow read, delete: if
  isOwner(userId)` already existed on all 4 collections from the original
  rules rewrite.
- Added `removeCategory`/`removeIncomeSource` to `useBudgetStore`,
  mirroring the existing `removePaycheck`/`removePurchase` pattern
  (`requireUid()` guard, delegate to the writes.ts function, `.catch` →
  `reportWriteError`). Added the delete button + `AlertDialog` to the
  bottom of `CategoryPurchases`/`IncomeSourcePaychecks`, below the add-form
  and separated by a `border-t` — deliberately not at the top of the
  panel, so the destructive action isn't the first thing seen when
  expanding a row; `variant="destructive"` on both the trigger and the
  dialog's confirm button.
- Verified end-to-end via the dev server: expanded "Hobbies" (Budget),
  clicked Delete → Cancel (confirmed it survived, dialog closed via
  `data-state="closed"`), then Delete → Delete (confirmed the category and
  its budgeted-total contribution both disappeared — Total Budgeted
  dropped by exactly $100/mo, $1,200/yr, matching Hobbies' fixed target
  exactly). Repeated for "DoorDash" (Income, a source with $0 paychecks
  logged) — confirmed it disappeared from the Sources list. `tsc -b`/
  `lint`/`build` all clean.
- **Tooling note, not an app bug**: raw `element.click()` via the browser
  automation tooling intermittently failed to register on this app's
  plain (non-Radix) `<button>` elements — e.g. a category row's own
  expand/collapse toggle — even after waiting past any transition
  duration, while the exact same `.click()` approach worked reliably
  moments later on a different element. The `computer` tool's simulated
  mouse click was more consistently reliable when raw `.click()` didn't
  register; when it also failed, retrying the identical `.click()` call
  a second time worked. Not investigated further — flagged here in case
  it recurs, consistent with this file's existing note about occasional
  automation-tool click flakiness.
