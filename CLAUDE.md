# ClearBooks

## Project Overview

ClearBooks is a personal & business finance and tax app for California
workers across all income types — W-2 employees, 1099 contractors,
self-employed/sole proprietors, and gig workers (Uber, DoorDash, Airbnb),
including hybrid users who combine several of these.

Planned feature areas not yet built (budgeting, income tracking, and the
federal/CA tax tracker are already built — see Current Status):
- Bank connectivity via Plaid (12,000+ institutions, real-time sync,
  recurring subscription detection) — the real Link connect flow is
  built and sandbox-verified (see Current Status' Plaid Link bullet);
  still needed: OAuth-institution testing, the `investments` product, and
  a staging/production deployment of `plaid-server`
- AI-agent-based auto-categorization of synced bank transactions into
  budget categories/income sources — same story: the categorization
  write path and manual "Categorize…" UI exist and work today, but the
  automatic AI agent trigger is a documented stub (functions/src/index.ts)
  pending an API key + provider decision
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
| Backend | Firebase Cloud Functions (Node.js + TypeScript) for AI categorization; a separate standalone Express + TypeScript server (`plaid-server/`) for all real Plaid API calls — see the Bank connectivity row for why |
| Database & Auth | Firebase Firestore + Firebase Auth |
| Bank connectivity | Plaid — real, sandbox-verified Link connect flow: `ConnectBankButton` (`src/components/dashboard/`) + `src/lib/plaidServer.ts` on the frontend, calling `plaid-server/`'s Link/exchange/transactions-sync/balance-sync routes (see Current Status). Real transaction data (spending/income, classified) and real account balance (`bankBalance`, summed across linked `depository` accounts) are both pulled from Plaid once a bank is linked — nothing else (investments, liabilities) yet. Deliberately NOT a Firebase Cloud Function: Cloud Functions can't make outbound third-party API calls on the free Spark plan, and Secret Manager (needed to hold the Plaid secret) requires Blaze — `plaid-server` is a plain Node process so it needs neither. Local dev only — no staging/production deployment of `plaid-server` yet |
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

**Budget envelopes (with delete) + revamped tabbed dashboard home + income tracking (W-2/contracted/self-employed classification, with delete) + a single shared month/year date filter (bookmark-style tabs, not a popover) driving every tab and standalone route + real Firebase Auth/Firestore persistence (staging + production environments, now with Firebase App Check/reCAPTCHA v3 wired in Unenforced mode) + federal/California tax estimate + Firestore audit timestamps on every record + a real, sandbox-verified Plaid Link bank-connection flow (via a standalone `plaid-server/` backend — not Firebase Cloud Functions) with automatic sync on sign-in, real transaction classification (explicit INCOME/transfer category checks, not just sign-based) and a real, Plaid-sourced account balance that replaces the manual entry once a bank is linked (the old "Simulate bank sync" demo action was deleted once this superseded it). AI categorization credentials still not obtained — see the Plaid bullets below for exactly what is and isn't real yet.**

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
  accounts start empty (see the "Firestore-backed" bullet below for the
  current persistence model). The old hardcoded mock dataset (9
  categories, 5 income sources, 6 paychecks, ~19 purchases) and its
  on-demand "Load demo data" seeding action (`LoadDemoDataButton`,
  `src/lib/demoData.ts`, `src/lib/firestore/demoData.ts`) were deleted
  outright once real Plaid sandbox data became the app's test-data
  source — see the 2026-08-05 Session Log entry
- **Income tracking**: paychecks are the source of truth for income —
  "money earned this month" is *derived* by summing paychecks dated in the
  current month (`src/lib/income.ts`), not a separately-typed number, so it
  can't drift from what's actually logged. Yearly projection = monthly × 12.
  Percentage-based budgets resolve their dollar target from either
  `monthlyIncome` (the running sum) or `averagePaycheckAmount ×
  paychecksPerMonth` (a projection independent of how many paychecks have
  landed yet this month) — see `getMonthlyTarget` in `src/lib/income.ts`
- **Budget envelopes page** (`/budget`): `IncomeOverview` (earned this
  month, projected this year, bank balance — editable once no bank is
  linked, read-only and Plaid-sourced once one is (see the Plaid Link
  bullet's balance-sync addition below), this-month paycheck
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
- **Plaid integration prep (data model/UI/Cloud Functions scaffolding, not
  a real connection yet)**: a new `PlaidTransaction` type
  (`src/types/plaidTransaction.ts`) represents one raw bank transaction —
  distinct from `Purchase`/`Paycheck`, which are this app's own categorized
  ledger entries — with `transactionType: 'spending' | 'income' |
  'transfer'`, Plaid's own category guess (informational only), a
  `pending` flag, and optional `categoryId`/`purchaseId` (spending) or
  `sourceId`/`paycheckId` (income) once categorized. Synced into a new
  `users/{uid}/plaidTransactions` Firestore collection via the same
  one-writer sync pattern as everything else (`useBudgetStore.
  plaidTransactions`). **Categorizing a transaction creates a real
  Purchase/Paycheck from it** (`categorizePlaidTransactionAsSpending`/
  `AsIncome` in `src/lib/firestore/writes.ts`, one `writeBatch`: create the
  new Purchase/Paycheck doc + mark the source transaction resolved) — so
  it counts toward budget targets/income totals exactly like a manually-
  added one, and `getCategorySpent`/`getIncomeInRange` needed zero changes
  to pick it up, since they just query the same `purchases`/`paychecks`
  collections either way. A new "Bank activity" card on both the Spending
  tab (`SpendingBankActivity`) and Income tab (`IncomeBankActivity`) lists
  transactions of the matching type within the shared date filter's range,
  most-recent-first; an uncategorized transaction shows an inline
  category/source `Select` (categorizing is a single action — no separate
  confirm step) instead of a "categorized as X" badge. This manual
  "Categorize…" control is what actually does the categorizing today —
  there's a real Plaid connection now (see the Plaid Link bullet below),
  but no AI agent yet, so nothing sorts itself automatically. The old
  **"Simulate bank sync" button** (`SimulateBankSyncButton`,
  `src/lib/plaidDemoData.ts`) that used to seed ~10 fake transactions as a
  stand-in for a real connection has been **deleted outright** — now that
  a real sandbox-verified Plaid Link flow exists, it was fully superseded
  rather than kept as a fallback (see the 2026-08-05 Session Log entry).
  `functions/src/index.ts` has one real,
  compiling (but unconnected) Cloud Function stub — `categorizeTransaction`
  (would fire on every new transaction and call an AI Agent API to assign
  a category automatically) — documented with exactly what's needed to
  make it real: an AI Agent API key + provider decision. Not deployed or
  connected to anything yet. (`functions/` no longer has a `plaidWebhook`
  stub or any Plaid credential plumbing — see the `plaid-server` bullet
  below for why and where that moved.)
- **`plaid-server/` — a standalone backend for real Plaid API calls,
  deliberately NOT a Firebase Cloud Function**: Cloud Functions can't make
  outbound third-party network calls on the free Spark plan, and Secret
  Manager (needed to hold a real Plaid `client_id`/secret) requires Blaze
  — rather than force an upgrade, this is a plain Express + TypeScript
  server (own `package.json`/`tsconfig.json`, `npm run dev` via `tsx
  watch`), modeled on Plaid's own quickstart repo, that reads Plaid
  credentials from a normal `.env` file (`plaid-server/.env`, gitignored;
  see `.env.example`) with zero Google Cloud billing involved. It acts as
  a *trusted* backend the same way a Cloud Function would: every route
  runs through `requireAuth` (`src/middleware/requireAuth.ts`), which
  verifies a Firebase ID token via `firebase-admin` and only ever acts on
  the verified `uid` — never one supplied by the request body. Firestore
  access goes through `firebase-admin` too (`src/firebaseAdmin.ts`,
  credentials via `GOOGLE_APPLICATION_CREDENTIALS` pointing at a
  downloaded service account key — gitignored, never committed), which
  bypasses `firestore.rules` entirely, same trust model as a Cloud
  Function's Admin SDK access.
  - **Sync is pull-based, on-demand, and cursor-checkpointed — not a
    live/continuous connection.** `POST /api/sync_transactions`
    (`src/routes/syncTransactions.ts`) is meant to be called once per
    sign-in (not built into the frontend yet), not on a timer: it loads
    each of the user's linked items from `users/{uid}/plaidItems`, calls
    Plaid's `transactionsSync` with that item's stored `cursor`, and only
    gets back what's changed since last time — added, modified, *and*
    removed, which a plain "give me everything after timestamp X" design
    can't express (e.g. a pending charge that later posts at a different
    amount). The new cursor is saved back after each sync. `added`
    transactions get `createdAt` set; `modified` transactions are merged
    without touching `createdAt`, on purpose — an earlier draft of this
    route set `createdAt: serverTimestamp()` on every write via
    `mergeFields`, which would have silently overwritten the original
    `createdAt` on every re-sync of an existing transaction.
  - `POST /api/create_link_token` / `POST /api/exchange_public_token`
    (`src/routes/linkToken.ts`/`exchangeToken.ts`) implement the standard
    Plaid Link handshake — not yet called from anywhere, since the
    frontend has no Plaid Link UI yet (next step once this backend is
    wired up).
  - A new `users/{uid}/plaidItems/{itemId}` Firestore collection
    (`PlaidItemDoc` in `plaid-server/src/types.ts`) holds each linked
    item's `accessToken` + sync `cursor` — deliberately **not** in the
    frontend's own type files, and `firestore.rules` denies the client
    *all* read/write access to it (`allow read, write: if false`), since
    `accessToken` grants ongoing read access to the user's real bank
    account and must never reach the browser. Only `plaid-server`'s Admin
    SDK ever touches this collection.
  - Reuses the same `FirestorePlaidTransactionDoc` shape
    `src/lib/firestore/types.ts` already defined for the frontend —
    duplicated locally in `plaid-server/src/types.ts` rather than
    imported, since this is a fully separate Node package with its own
    `tsconfig`/runtime (same reasoning `functions/` already keeps its own
    type copies instead of reaching into `src/`). Keep the two in sync by
    hand if either changes.
  - **This supersedes and replaces `functions/src/index.ts`'s old
    `plaidWebhook` stub**, which assumed Plaid would push updates to a
    public webhook URL (Cloud-Functions-hosted); the pull/cursor design
    above needs no public webhook endpoint at all. Once this design was
    settled, `plaidWebhook` (and the `defineSecret()` Plaid credential
    plumbing bound to it) was removed outright rather than left as dead
    scaffolding — see the 2026-08-04 "cleanup" Session Log entry.
    `categorizeTransaction` (the future AI-agent auto-categorization
    trigger) is unrelated to this hosting decision, was left in place, and
    remains a live TODO regardless of which backend ends up calling it.
- **Real Plaid Link connect flow — a working sandbox-tested bank
  connection, not just backend plumbing anymore.** `src/lib/plaidServer.ts`
  is the app's first external (non-Firebase) REST client — a single
  `plaidFetch<T>()` helper that attaches a fresh Firebase ID token
  (`getFirebaseAuth().currentUser?.getIdToken()`) as a Bearer header on
  every call, wrapping `createLinkToken`/`exchangePublicToken`/
  `syncTransactions` (matching `plaid-server`'s three routes exactly). New
  `VITE_PLAID_SERVER_URL` env var (optional — only `.env.local` has a real
  value today, `http://localhost:8090`; staging/production have no
  deployed `plaid-server` yet).
  - **`ConnectBankButton`** (`src/components/dashboard/`) branches on a
    new `hasLinkedBank` boolean synced from the user's Firestore root doc
    (`FirestoreUserDoc.hasLinkedBank`, written by `plaid-server` — never
    the client — right after a successful link; the `plaidItems`
    collection itself stays unreadable by design, so this flag is the only
    way the UI can know a bank is connected). `!hasLinkedBank` renders
    "Connect a bank": fetches a link token, then mounts a small
    `PlaidLinkLauncher` child that calls `usePlaidLink({token, onSuccess,
    onExit})` (from the newly-installed `react-plaid-link`) and opens it
    via `useEffect(() => { if (ready) open() }, [ready, open])` — mounting
    a child (rather than calling the hook inline with a possibly-empty
    token) is what lets "fetch token, then open" stay clean, since hooks
    must be called unconditionally. `onSuccess` chains
    `exchangePublicToken` → `syncTransactions` in the same flow (the sync
    happens immediately after linking, not deferred to next sign-in, per
    explicit design). `hasLinkedBank` renders "Sync now" instead — a
    plain button re-calling `syncTransactions()` on demand. Neither branch
    manually mutates the store on success; the existing `users/{uid}`
    Firestore listener does that automatically once `plaid-server`'s write
    lands, same "Firestore is the one source of truth" pattern used
    everywhere else in this app.
  - **Automatic sync on every sign-in**, not just manual clicks —
    `useAuthStore.ts`'s module-level `onAuthStateChanged` listener now
    also calls a new `syncPlaidTransactionsOnceReady(uid)` after
    `startSync(uid)`. Since `hasLinkedBank` isn't hydrated synchronously
    (it arrives via the same async Firestore listener `startSync`
    attaches), this is a one-shot `useBudgetStore.subscribe` that waits
    for `loading` to flip `false` (the store's existing "every listener
    has reported once" signal) before checking the flag and, if true,
    calling `syncTransactions()` — wrapped so a failure (e.g.
    `plaid-server` not running) only shows a toast and never blocks sign-in
    itself. Re-checks the signed-in uid before actually syncing, guarding
    against a stale trigger firing after a fast sign-out.
  - **`exchangeToken.ts`** now writes both the `PlaidItemDoc` and the new
    `hasLinkedBank: true` root-doc flag (`plaid-server/src/types.ts`'s
    narrow `UserDocPlaidFields`, not a full `FirestoreUserDoc` mirror,
    since `plaid-server` never touches `bankBalance`/`paychecksPerMonth`)
    in a single `db.batch()`, so a crash between the two writes can't
    leave one without the other.
  - **`plaid-server` gained emulator support** (`USE_FIREBASE_EMULATORS`
    env var): when true, `firebaseAdmin.ts` points the Admin SDK at
    `127.0.0.1:9099`/`127.0.0.1:8080` instead of production, and skips
    `GOOGLE_APPLICATION_CREDENTIALS` entirely — the emulators don't check
    credentials. This is what actually made local end-to-end testing
    possible without a real downloaded service account key.
  - **`npm run dev:all` now also starts the Firebase emulators** (a third
    `concurrently` process alongside frontend/`plaid-server`), so one
    command boots the entire local stack.
  - **Verified end-to-end against Plaid's real sandbox**, not mocked:
    clicked "Connect a bank," completed Plaid Link's actual hosted flow
    (phone verification, institution picker, account selection) against
    "First Platypus Bank"/Tartan Bank test institutions using Plaid's own
    fixed sandbox credentials, and confirmed a real `200 OK` all the way
    through `create_link_token` → `exchange_public_token` →
    `sync_transactions` (48 real sandbox transactions synced on first
    link). Confirmed `hasLinkedBank` round-tripped through Firestore
    correctly (button swapped from "Connect a bank" to "Sync now" with no
    page reload), confirmed the synced transactions rendered in the
    existing Bank Activity UI with real merchant names/Plaid categories/
    amounts and could be categorized exactly like the fake "Simulate bank
    sync" data (categorizing a $500 "Tectra Inc" transaction as Rent
    correctly flowed into that month's real Spent total), confirmed
    clicking "Sync now" again was idempotent (`syncedCount: 0`, no
    duplicates), and confirmed the sign-out/sign-in auto-sync fired
    without any manual click.
  - **Found and fixed a real gap while testing**: the very first "Connect
    a bank" attempt got a `401` from `create_link_token` even though the
    request/token were correct — `plaid-server`'s Admin SDK was verifying
    ID tokens against production Firebase while the frontend was signed in
    via the local Auth emulator. Fixed by the `USE_FIREBASE_EMULATORS`
    support above, which is also what unblocked testing without a real
    service account key.
  - **Known, harmless, unfixed quirk**: `onAuthStateChanged` fired twice
    for one sign-in during testing (confirmed via two `sync_transactions`
    calls ~14ms apart), a known Firebase Auth SDK behavior, not a bug in
    the code above — harmless since the sync is cursor-based and
    idempotent (the second call just finds nothing new), so not worth the
    complexity of deduping.
  - **Explicit `INCOME`/`TRANSFER_IN`/`TRANSFER_OUT` categorization
    check, plus a new `plaidCategoryPrimary` field** —
    `deriveTransactionType` (`syncTransactions.ts`) now checks Plaid's
    `personal_finance_category.primary === 'INCOME'` explicitly before
    falling back to the amount-sign heuristic, so a mis-signed edge case
    can't silently misclassify a paycheck as spending; `TRANSFER_IN`/
    `TRANSFER_OUT` (money moved between the user's own linked accounts,
    not a third party) are still checked next and mapped to the existing
    `'transfer'` bucket, excluded from both Bank Activity views.
    `plaidCategoryPrimary` (Plaid's coarse ~16-value bucket, e.g.
    `FOOD_AND_DRINK`) is now saved on every synced transaction alongside
    the existing granular `plaidCategory` — specifically for a future
    auto-sort-into-budget-categories feature to match against, since a
    small stable set of buckets is far more useful for that than the
    detailed taxonomy. Verified live against all 48 real synced sandbox
    transactions (forced a full re-sync via a temporary cleared cursor)
    — 0 missing `plaidCategoryPrimary`. **Found and reported, not
    fixed, a real edge case**: 3 real "United Airlines" sandbox
    transactions (`TRAVEL` category, negative amount — almost certainly
    a simulated flight refund) were classified `'income'` by the
    sign-based fallback, since Plaid's category taxonomy has no
    refund-vs-genuine-income distinction. Left unresolved — correct
    handling (e.g. a distinct refund type) is a product decision, not an
    obvious bug fix, and hasn't been decided yet.
  - **Real account balance, not just transactions** — a new
    `POST /api/sync_balance` route (`plaid-server/src/routes/
    syncBalance.ts`) calls Plaid's `accountsBalanceGet` (the real-time
    variant, not the cached `accountsGet`) for every linked item, sums
    `available` (falling back to `current` only when an institution
    doesn't report `available`) across every `depository`-type account
    only — a `credit`-type account's balance is debt owed, not cash on
    hand, and folding it in would make "bank balance" mean something
    different depending on which accounts happen to be linked — and
    writes the total to `users/{uid}.bankBalance`, the same field the
    old manual entry used. Wired into every existing sync trigger point
    alongside `syncTransactions()`: post-link (`ConnectBankButton`'s
    `handleSuccess`), the manual "Sync now" button, and sign-in
    auto-sync (`useAuthStore.ts`'s one-shot, renamed
    `syncPlaidDataOnceReady` to reflect that it now syncs both
    transactions and balance as two independent calls, so one failing
    doesn't block the other). `src/lib/plaidServer.ts` gained a matching
    `syncBalance()` export. **`IncomeOverview.tsx`'s bank balance field
    now branches on `hasLinkedBank`**: unlinked users keep the original
    editable `Input` (`setBankBalance` still exists, untouched); once a
    bank is linked the field becomes read-only (a plain `formatCurrency`
    display, labeled "Bank balance (from linked bank)") — a manual edit
    there would just get silently overwritten by the next sync, so
    replacing rather than merely supplementing the input was the
    correct call per the user's explicit "replace" wording. Verified
    live against the real sandbox account: "Sync now" hit
    `/api/sync_balance` (`200 OK`), returned a real
    `{"bankBalance":62569}`, and the UI updated to "$62,569.00" via the
    existing Firestore listener with no reload — same one-writer
    pattern every other synced field already uses.
  - **Enriched synced transaction data — per-account names, more Plaid
    fields, and the complete raw transaction as a permanent safety net.**
    User asked what fields Plaid actually sends per transaction; answering
    that surfaced two real gaps: `syncTransactions.ts` only kept a
    handful of fields off Plaid's much richer `Transaction` object, and
    every transaction under one linked Item was tagged with just the
    institution name, making a checking account and a credit card under
    the same login indistinguishable in Bank Activity (and `accountName`
    wasn't even rendered in the UI at all until this pass). Confirmed via
    `AskUserQuestion` which fields to add, then — after discussing that
    cursor-based sync means Plaid never re-sends an unmodified
    transaction, so an uncaptured field is gone for good short of
    unlinking and relinking — the user asked directly why not just store
    everything rather than hand-picking fields one at a time. Agreed:
    Firestore documents are small (a transaction's full JSON is a few KB,
    nowhere near the 1 MiB/doc limit) and billed per document not per
    field, so there's no real cost to storing the complete object.
    - **Per-account names**: `PlaidItemDoc` gained `accounts?:
      Record<string, PlaidAccountInfo>` (`{name, mask}`, keyed by Plaid's
      `account_id`) — fetched via a new shared `plaid-server/src/lib/
      plaidAccounts.ts#fetchAccountsMap` helper, called once at link time
      (`exchangeToken.ts`, best-effort/non-blocking) and self-healed on
      the next sync for any item that predates this field
      (`syncTransactions.ts`'s new `ensureAccounts`, persisted back to
      the item doc so it only ever runs once per item). `accountName` is
      now derived as `"{institutionName} {account.name} ...{mask}"` (e.g.
      "Tartan Bank Plaid Checking ...0000") via a new
      `deriveAccountName`, falling back to the old institution-only
      label when no account info is available yet. Rendered in Bank
      Activity for the first time as a new small line under each row's
      merchant/date.
    - **`authorizedDate`/`logoUrl`**: kept as first-class fields (the UI
      binds to them directly) — `authorizedDate` shown only when it
      differs from the posted `date` (e.g. "May 27 (authorized May 26)"),
      `date` itself unchanged as what drives date-range filtering and
      totals; `logoUrl` rendered as a small icon before the merchant name
      when present, nothing when absent (no broken-image icon).
    - **`raw: Transaction`**: the complete Plaid transaction object,
      stored verbatim on every synced transaction (frontend types it
      loosely as `Record<string, unknown>` rather than hand-mirroring
      Plaid's full interface, since the `plaid` npm package isn't
      installed there and nothing reads a specific sub-field yet) —
      supersedes needing separate `merchant_entity_id`/`payment_channel`
      fields, also captures `location`/`payment_meta`/`counterparties`/
      `iso_currency_code`/etc. with no further hand-picking. Nothing
      reads it yet; it's the safety net a future feature (e.g.
      remembering how a merchant was categorized last time, via
      `merchant_entity_id`) would draw from without needing another
      backfill.
    - **Found and fixed a real bug during live verification**: the first
      live re-sync after this change failed with a `502` — Firestore's
      Admin SDK throws on an explicit `undefined` field value (no
      `ignoreUndefinedProperties` configured), and the initial
      `authorizedDate: transaction.authorized_date ?? undefined`/
      `logoUrl: transaction.logo_url ?? undefined` pattern put a literal
      `undefined` key on the write for any transaction missing those
      fields — common in practice, not a hypothetical edge case (27/48
      and 21/48 of the real synced transactions this session lacked
      them, respectively). Fixed by switching to conditional spread
      (`...(x ? {field: x} : {})`) for every optional field in
      `buildTransactionDoc`, including the pre-existing
      `plaidCategoryPrimary` line, which had the identical latent risk
      and had simply never been exercised against a transaction that
      actually lacked it.
    - Also handled Plaid's `removed` array from `transactionsSync`,
      previously destructured out of the response but never read — a
      transaction Plaid retracts (e.g. a pending charge that never
      settled) now gets `batch.delete`d from `plaidTransactions`,
      unconditionally, in the same batch as the `added`/`modified`
      writes. Safe even if already categorized: categorizing creates an
      independent `Purchase`/`Paycheck` that doesn't reference back to
      the source `PlaidTransaction`, so deleting the raw record only
      removes it from the Bank Activity log.
    - **Verified live and via the emulator, not just `tsc`**: connected a
      real Tartan Bank sandbox item exposing 12 real accounts (checking,
      savings, CD, credit card, money market, IRA, 401k, student loan,
      mortgage, HSA, cash management, business credit card); confirmed 5
      of them had real synced transactions with correctly distinct
      `accountName`s (e.g. "Tartan Bank Plaid Credit Card ...3333" vs.
      "Tartan Bank Plaid Checking ...0000" — the actual point of this
      fix); confirmed 48/48 synced transactions had a complete `raw`
      blob (verified field-by-field against one sample, including
      `location`/`payment_channel`/`merchant_entity_id`); confirmed
      `authorizedDate` rendered only when it genuinely differed and
      `logoUrl` rendered real merchant icons (United Airlines, Uber) with
      no broken-image icon on rows lacking one. Confirmed self-healing by
      clearing an item's `accounts` field directly in the emulator and
      triggering "Sync now" — all 12 accounts came back with no re-link
      needed. Confirmed the `removed`-handling invariant by categorizing
      a real transaction (creating a real `$6.33` Transport `Purchase`),
      then deleting its `plaidTransactions` doc directly (simulating
      exactly what the `removed`-handling code does) — confirmed the
      transaction disappeared from Bank Activity while the `Purchase` and
      its contribution to that month's Spent total stayed completely
      untouched. `tsc -b`/`tsc --noEmit`/`lint` all clean throughout.
  - **Not yet done**: OAuth-flavored sandbox institution testing (needs a
    configured `redirect_uri`, not exercised), a staging/production
    deployment of `plaid-server` (and the `VITE_PLAID_SERVER_URL` those
    environments would need), the `investments` Plaid product
    (explicitly deferred — `sync_transactions` only handles
    `transactions` today), and a resolved policy for refund-like
    transactions (see the categorization-check bullet above).

Not yet implemented: a running tax-reserve balance, itemized deductions/
credits, filing statuses other than single, a real AI categorization
agent (see the Plaid integration prep bullet), the Plaid `investments`
product (see the Plaid Link bullet above), a staging/production
deployment of `plaid-server`, Veryfi/Resend integrations, dark-mode
toggle (theme is class-based and CSS-ready, but nothing flips the `.dark`
class yet).

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
                    # real Recharts usage in the app, a donut + legend;
                    # SpendingBankActivity — "Bank activity" log of raw Plaid
                    # transactions (transactionType 'spending' only), each
                    # showing a category Select if uncategorized or a "categorized
                    # as X" badge otherwise; see the Plaid bullet in Current Status)
    income/        # Income feature components (IncomeContent — the extracted
                    # page-body used by both IncomePage and the dashboard's Income
                    # tab; IncomeSummary — 2 clickable metric cards driving
                    # IncomeSourcesPieChart, same pattern as SpendingSummary;
                    # IncomeSourceRow — log-row list item mirroring
                    # BudgetEnvelopeRow; IncomeSourcePaychecks — expand-on-click
                    # paycheck log/add form mirroring CategoryPurchases;
                    # AddIncomeSourceDialog — mirrors AddBudgetDialog;
                    # IncomeBankActivity — mirrors SpendingBankActivity for
                    # transactionType 'income' transactions)
    tax/           # Tax feature components (TaxContent — the extracted page-body
                    # used by both TaxPage and the dashboard's Tax tab; no separate
                    # summary/row subcomponents like the other features since this
                    # page has no chart-driven card-selection interaction, just a
                    # disclaimer banner + summary cards + federal/CA breakdown
                    # cards + a quarterly-payments list, all in one file)
    dashboard/     # Dashboard home components (MoneySummaryRow — the top
                    # always-current-month income/spent/leftover row, owns
                    # `toneClasses`/`PanelTone` for icon tinting;
                    # ConnectBankButton — the real Plaid Link connect flow
                    # (SimulateBankSyncButton, the old fake-transaction stand-in
                    # this superseded, was deleted outright — see the
                    # 2026-08-05 Session Log entry), branches on
                    # useBudgetStore's hasLinkedBank to render "Connect a bank"
                    # (via react-plaid-link's usePlaidLink, see src/lib/plaidServer.ts)
                    # or "Sync now"; never mutates the store directly, relies on
                    # the existing users/{uid} Firestore listener. LoadDemoDataButton
                    # — the old hardcoded-mock-data seeding action — was deleted
                    # outright once real Plaid sandbox data became this app's
                    # test-data source, see the 2026-08-05 Session Log entry)
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
                    # purchases, plaidTransactions, hasLinkedBank, bankBalance,
                    # paychecksPerMonth, now Firestore-synced, see below;
                    # categorizeTransactionAsSpending/AsIncome — the store actions
                    # the Bank activity UI calls to categorize a raw Plaid
                    # transaction; useAuthStore.ts — user/status/error +
                    # sign-in/up/out actions, module-level onAuthStateChanged
                    # listener drives useBudgetStore's sync AND (once
                    # useBudgetStore's Firestore listeners report ready)
                    # syncPlaidTransactionsOnceReady — a one-shot subscribe that
                    # calls plaidServer.ts's syncTransactions() automatically on
                    # every sign-in if hasLinkedBank is true; useDateFilterStore.ts
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
    plaidServer.ts # The app's first external (non-Firebase) REST client — talks
                    # to plaid-server/, not Firestore. A single plaidFetch<T>()
                    # helper attaches a fresh Firebase ID token as a Bearer
                    # header on every call (reads VITE_PLAID_SERVER_URL, optional
                    # — only .env.local has a real value today); exports
                    # createLinkToken/exchangePublicToken/syncTransactions,
                    # matching plaid-server's three routes exactly
    iconMap.ts     # iconMap (Record<string, LucideIcon>) + getIcon() — the
                    # icon-name-to-component lookup Firestore sync hydrates
                    # through; write-path inputs use `iconName: string` instead
                    # of a component reference
    firestore/
      types.ts     # Firestore document shapes (FirestoreCategoryDoc — fixed |
                    # percentage discriminated union with iconName, not icon —
                    # FirestoreIncomeSourceDoc, FirestorePaycheckDoc,
                    # FirestorePurchaseDoc, FirestorePlaidTransactionDoc,
                    # FirestoreUserDoc — bankBalance/paychecksPerMonth, both
                    # client-writable, plus hasLinkedBank, optional and
                    # server-write-only via plaid-server). Every doc type except
                    # FirestoreUserDoc carries optional createdAt/updatedAt
                    # Timestamp fields — optional and absent from what callers
                    # supply, since writes.ts injects them via serverTimestamp()
                    # rather than any caller constructing one
      sync.ts       # attachListeners(uid, callbacks) — 6 onSnapshot listeners
                    # (5 subcollections + users/{uid} root doc), converts
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
                    # no longer exists. categorizePlaidTransactionAsSpending/
                    # AsIncome — the categorization write: one batch creates a
                    # real Purchase/Paycheck from the transaction's data AND
                    # marks the transaction resolved (categoryId+purchaseId or
                    # sourceId+paycheckId), so it counts toward real totals and
                    # is never categorized twice. (writePlaidTransaction — the
                    # single-doc insert only the now-deleted "Simulate bank
                    # sync" seed ever called — was removed as dead code once
                    # that feature was deleted; real synced transactions are
                    # written server-side by plaid-server instead, via the
                    # Admin SDK, not through this file at all.)
      users.ts      # ensureUserDoc(uid) — idempotent setDoc(...,{merge:true}),
                    # called on every sign-in so it never clobbers existing
                    # bankBalance/paychecksPerMonth
                    # (demoData.ts, the hardcoded-mock-data seeder, and
                    # plaidDemoData.ts, the "Simulate bank sync" seed, were
                    # both deleted once real Plaid sandbox data superseded
                    # them as this app's test-data source — see the
                    # 2026-08-05 Session Log entry)
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
    income.ts      # derived income helpers (getPaychecksInRange — real Paycheck
                    # docs only, unchanged, still what src/lib/tax/ and
                    # per-source figures go through; getIncomeInRange — total
                    # income for the range including every real transaction
                    # regardless of categorization: every Paycheck plus every
                    # synced Plaid transaction that's income-type but not yet
                    # categorized (isPlaidTransactionCategorized false),
                    # guarded against double-counting since a categorized
                    # transaction already has a corresponding Paycheck;
                    # getMonthlyIncomeEquivalent — the implied MONTHLY rate for
                    # whatever the filter is set to (now also plaidTransactions-
                    # aware via getIncomeInRange), what getMonthlyTarget's
                    # percentage-of-income categories resolve against regardless
                    # of mode; getAveragePaycheckAmount, getMonthlyTarget —
                    # resolves a BudgetCategory's dollar target from income
                    # context; getSourcePaychecks/getSourceIncomeInRange — a
                    # single IncomeSource's paychecks/total for the selected
                    # range, deliberately still paycheck-only since an
                    # uncategorized transaction has no source to attribute it
                    # to; getLeftoverCash — range income minus getTotalSpent,
                    # the dashboard's "money left over" figure, deliberately named
                    # and kept distinct from the unrelated "remaining budget"
                    # (budgeted-minus-spent) concept used on the Budget tab;
                    # getAnnualizedIncomeByType — the selected range's income
                    # annualized via `annualize` and split by each source's
                    # incomeType into {w2, selfEmployed}, the one integration
                    # point src/lib/tax/ uses — deliberately built on
                    # getPaychecksInRange, not getIncomeInRange, so an
                    # uncategorized transaction with no known incomeType is
                    # never silently guessed into a tax bucket)
    purchases.ts   # derived spending helpers (getCategoryPurchases, getCategorySpent) —
                    # a category's spend is summed from Purchase records filtered to
                    # the shared date filter's selected range, never stored directly;
                    # deliberately still purchase-only (mirrors getSourceIncomeInRange's
                    # reasoning) since a category-level figure has nothing to attribute
                    # an uncategorized transaction to
    spending.ts    # getTotalSpent — total spend for the range including every real
                    # transaction regardless of categorization: every Purchase (summed
                    # directly, not per-category — a Purchase always carries a valid
                    # categoryId so the two are equivalent) plus every synced Plaid
                    # transaction that's spending-type but not yet categorized, with
                    # the same double-count guard getIncomeInRange uses
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
    plaidTransaction.ts # PlaidTransaction (id, accountName — now per-account,
                    # e.g. "Tartan Bank Plaid Checking ...0000", not just the
                    # institution — amount, date, authorizedDate, merchantName,
                    # logoUrl, plaidCategory, transactionType: 'spending' |
                    # 'income' | 'transfer', pending, raw — the complete Plaid
                    # transaction object, kept because cursor sync means an
                    # uncaptured field on an unmodified transaction is gone
                    # for good — optional categoryId+purchaseId or
                    # sourceId+paycheckId once categorized) — a raw bank
                    # transaction synced from Plaid, distinct from
                    # Purchase/Paycheck; isPlaidTransactionCategorized() helper
  vite-env.d.ts    # ImportMetaEnv typing for VITE_FIREBASE_*/VITE_USE_FIREBASE_EMULATORS vars

functions/
  src/index.ts     # Cloud Functions entry point. One real, compiling function
                    # stub, not connected to anything real yet: categorizeTransaction
                    # (onDocumentCreated on users/{uid}/plaidTransactions/
                    # {transactionId} — would call an AI Agent API to
                    # auto-categorize; needs an API key + provider decision).
                    # Documented with the exact next step needed to make it
                    # real — see the Plaid bullet in CLAUDE.md's Current
                    # Status. No Plaid credential plumbing lives here — real
                    # Plaid API calls happen in plaid-server/ instead (see
                    # that folder's own entry below)

plaid-server/       # Standalone Express + TypeScript backend for real Plaid
                    # API calls — deliberately NOT a Firebase Cloud Function
                    # (Spark plan can't make outbound 3rd-party calls; Secret
                    # Manager needs Blaze) — own package.json/tsconfig.json,
                    # plain `.env` (gitignored) for PLAID_CLIENT_ID/SECRET/ENV
                    # + USE_FIREBASE_EMULATORS, `npm run dev` via `tsx watch`
                    # (or the root's `npm run dev:all`, which now also starts
                    # the Firebase emulators alongside frontend + plaid-server).
                    # See the `plaid-server`
                    # bullet in CLAUDE.md's Current Status for the full design
                    # (pull-based cursor sync, requireAuth trust model, why
                    # this supersedes functions/'s plaidWebhook stub).
  src/env.ts         # Loads/validates all required env vars up front (fails
                    # fast with a clear message if .env is incomplete).
                    # USE_FIREBASE_EMULATORS ("true" in local .env) makes
                    # GOOGLE_APPLICATION_CREDENTIALS optional — the emulators
                    # don't check credentials at all
  src/firebaseAdmin.ts # initializeApp() — two paths based on env.useFirebaseEmulators:
                    # emulator mode sets FIREBASE_AUTH_EMULATOR_HOST/
                    # FIRESTORE_EMULATOR_HOST (127.0.0.1:9099/8080) and skips
                    # credentials entirely; production mode uses
                    # applicationDefault() (reads GOOGLE_APPLICATION_CREDENTIALS).
                    # Exports auth/db either way
  src/plaidClient.ts # PlaidApi client constructed from PLAID_CLIENT_ID/
                    # SECRET/ENV
  src/middleware/requireAuth.ts # Verifies the Firebase ID token on every
                    # request via auth.verifyIdToken(); the only thing
                    # standing between "any request" and "write to any
                    # user's Firestore data" since Admin SDK bypasses rules
  src/routes/linkToken.ts       # POST /api/create_link_token
  src/routes/exchangeToken.ts   # POST /api/exchange_public_token — stores
                    # the resulting access_token in users/{uid}/plaidItems
                    # AND writes hasLinkedBank: true to the users/{uid} root
                    # doc (UserDocPlaidFields), both in a single db.batch().
                    # Also fetches per-account names/masks via
                    # lib/plaidAccounts.ts#fetchAccountsMap (best-effort,
                    # non-blocking — syncTransactions.ts self-heals if this
                    # fails or predates the field) and includes them on the
                    # PlaidItemDoc write
  src/lib/plaidAccounts.ts # fetchAccountsMap(accessToken) — calls Plaid's
                    # accountsGet and builds an account_id -> {name, mask}
                    # map. Shared by exchangeToken.ts (at link time) and
                    # syncTransactions.ts (self-healing backfill), so the
                    # two never duplicate this logic
  src/routes/syncTransactions.ts # POST /api/sync_transactions — cursor-based
                    # pull sync (transactionsSync), writes into the same
                    # users/{uid}/plaidTransactions shape the frontend uses.
                    # deriveTransactionType checks personal_finance_category
                    # (explicit INCOME/TRANSFER_IN/TRANSFER_OUT branches)
                    # before falling back to the amount-sign heuristic;
                    # deriveAccountName resolves account_id through
                    # item.accounts (fetched at link time, or self-healed
                    # here via ensureAccounts for items that predate that
                    # field) so transactions from different accounts under
                    # one institution are distinguishable, e.g. "Tartan Bank
                    # Plaid Checking ...0000" vs "...Plaid Credit Card
                    # ...3333" — falls back to the old institution-only
                    # label when no account info is available yet;
                    # buildTransactionDoc (shared by the added/modified write
                    # loops) also saves plaidCategoryPrimary (Plaid's coarse
                    # ~16-value bucket) alongside the existing granular
                    # plaidCategory, authorizedDate/logoUrl (first-class,
                    # UI-bound), and raw (the complete Plaid Transaction
                    # object, verbatim — see FirestorePlaidTransactionDoc.raw
                    # in types.ts for why). Every optional field is added via
                    # conditional spread, not `field: x ?? undefined` —
                    # Firestore's Admin SDK throws on an explicit undefined
                    # value, found the hard way when the initial
                    # authorizedDate/logoUrl code shipped with exactly that
                    # bug. Also destructures `removed` from the sync
                    # response (previously ignored) and batch.deletes those
                    # transaction docs unconditionally — safe even if
                    # already categorized, since categorizing creates an
                    # independent Purchase/Paycheck that doesn't reference
                    # back to the source PlaidTransaction
  src/routes/syncBalance.ts # POST /api/sync_balance — calls Plaid's
                    # accountsBalanceGet (real-time, not the cached
                    # accountsGet) per linked item, sums `available` (falls
                    # back to `current`) across depository-type accounts
                    # only, writes the total to users/{uid}.bankBalance —
                    # the same field the frontend's old manual entry used
  src/types.ts       # Local copy of FirestorePlaidTransactionDoc (kept in
                    # sync by hand with src/lib/firestore/types.ts, same
                    # reasoning functions/ already keeps its own copies, now
                    # including authorizedDate/logoUrl and raw — the complete
                    # Plaid Transaction object, imported straight from the
                    # `plaid` package rather than hand-typed, since this
                    # server already has it) + PlaidAccountInfo ({name, mask})
                    # + PlaidItemDoc (accessToken/cursor, server-only, now
                    # also accounts?: Record<accountId, PlaidAccountInfo> —
                    # fetched once via lib/plaidAccounts.ts, self-healed if
                    # missing) + UserDocPlaidFields
                    # (hasLinkedBank — the narrow slice of FirestoreUserDoc
                    # this server ever writes; bankBalance writes go through
                    # a plain object literal in syncBalance.ts itself, not
                    # this type, since it's the one field plaid-server and
                    # the frontend's writeUserFields both legitimately write)
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

### 2026-07-22 — Plaid integration prep (data model, UI, Cloud Functions scaffolding)
- User asked to prepare the front-end and backend for Plaid: a "logs"
  section on Spending/Income showing raw bank transactions Plaid would
  receive, plus a (not-yet-existing) AI Agent API that would auto-sort
  spending/income/transfers into budget categories/income sources. Neither
  Plaid nor an AI Agent API has credentials yet, so this was scoped as
  real, working scaffolding — not a live integration. Two consequential
  design forks were resolved via `AskUserQuestion` before writing code:
  (1) once the (future) AI agent categorizes a transaction, does it count
  toward real Budget/Spending/Income totals, or stay a separate
  visibility-only log? → **counts as real ledger data**; (2) is there any
  way to see/test this today given no real Plaid/AI access? → **yes,
  add a "Simulate bank sync" demo action** seeding fake transactions.
- **The "counts as real data" answer directly shaped the whole design**:
  rather than teaching `getCategorySpent`/`getIncomeInRange` a second data
  source, categorizing a `PlaidTransaction` (`src/types/plaidTransaction.ts`
  — a new type, distinct from `Purchase`/`Paycheck`) **creates a genuine
  Purchase or Paycheck doc from it** in one `writeBatch`
  (`categorizePlaidTransactionAsSpending`/`AsIncome` in
  `src/lib/firestore/writes.ts`), while also marking the source transaction
  resolved (`categoryId`+`purchaseId` or `sourceId`+`paycheckId`) so it's
  never double-categorized. This meant **zero changes** were needed to any
  existing derived-value helper (`getCategorySpent`, `getIncomeInRange`,
  `getTotalSpent`, etc.) — they already just query the `purchases`/
  `paychecks` collections, and a categorized Plaid transaction is now a
  real doc in those same collections. Verified this directly: categorizing
  a $52.30 Starbucks transaction as "Dining Out" moved Spending's total
  from $3,412.00 → $3,464.30, the Dining Out category from $312.00 →
  $364.30, and the transaction showed up as a genuine, individually-
  deletable purchase when the category row was expanded on the Budget tab
  — not a special case, just the same Purchase list every other purchase
  lives in.
- New `users/{uid}/plaidTransactions` Firestore collection (rules mirror
  the existing per-collection pattern, plus a stricter `update` rule
  requiring the Plaid-synced fields — amount, date, merchantName, etc. —
  stay unchanged and only `categoryId`/`purchaseId`/`sourceId`/`paycheckId`
  +`updatedAt` may change, since categorization is the only update path
  that exists). Synced via a 6th `onSnapshot` listener in
  `src/lib/firestore/sync.ts`, following the same one-writer pattern as
  every other collection.
- Built `SpendingBankActivity`/`IncomeBankActivity` — a "Bank activity"
  card listing transactions of the matching `transactionType` within the
  shared date filter's range, most-recent-first. An uncategorized
  transaction shows an inline category/source `Select`; picking a value
  categorizes it immediately (no separate confirm button — this app's
  first single-action-dropdown UI, deliberately simpler than a 2-step
  dialog since categorizing is easily reversible by deleting the resulting
  purchase/paycheck the normal way). This manual control **is** the
  categorization mechanism today; it's also exactly what a real AI agent
  would eventually do automatically, from the server side instead of a
  click.
- Built `SimulateBankSyncButton` (mirrors `LoadDemoDataButton` exactly —
  AlertDialog-confirmed, only shown while `plaidTransactions` is empty) +
  `src/lib/plaidDemoData.ts`'s ~10 fake transactions. Deliberately left
  **all** of them uncategorized (unlike `demoData.ts`'s categorized mock
  budget data) — avoids a chicken-and-egg dependency on specific category
  ids already existing, and better represents "just arrived from the
  bank," giving the manual categorize flow something real to do.
- Added two real, compiling Cloud Function stubs to `functions/src/index.ts`
  — `plaidWebhook` (`onRequest`) and `categorizeTransaction`
  (`onDocumentCreated` on `plaidTransactions`) — using `firebase-functions`'s
  v2 modular API (confirmed available in the installed `^7.2.5`). Each is
  documented with the exact remaining step (Plaid dev credentials + the
  `plaid` package; an AI Agent API key + provider decision) rather than
  importing a package that doesn't exist yet, which would've broken the
  build. **Found and fixed a real, pre-existing gap while verifying**:
  `functions/tsconfig.json` had no `rootDir`, which `tsc --noEmit` (this
  repo's established functions-verification command) never surfaces but a
  genuine `tsc` emit does (`TS5011`) — likely never caught before because
  `npm run build` (the emit path) had apparently never actually been run
  in a prior session. Added `"rootDir": "src"`, a one-line, behavior-
  preserving fix.
- Verified end-to-end via the dev server: `tsc -b`/`lint`/`build` clean for
  both the app and `functions/`; "Simulate bank sync" seeded 5 spending +
  3 income + 2 transfer transactions (transfers correctly never appear in
  either log); categorized the Starbucks transaction as spending (see
  above) and a $65.20 Airbnb payout as income (Earned This Month correctly
  went from $6,980.00 → $7,045.20, W-2 Job's total increased by the same
  $65.20) — both confirmed as real, permanent Purchase/Paycheck docs, not
  a parallel ledger.

### 2026-08-04 — Plaid credential plumbing, then a standalone backend (plaid-server)
- User asked to wire up their real Plaid sandbox + production client
  id/secret pairs, mapped as: local dev and staging both use sandbox,
  production uses production credentials. Confirmed via `AskUserQuestion`
  to scope this to config/plumbing only (not the full real Link/OAuth
  flow) — matches the standing "prep, not a live connection" scope this
  whole Plaid feature has had since it was first built.
- Split the config by sensitivity: `PLAID_ENV` ('sandbox'/'production') is
  non-secret and lives in plain dotenv files Firebase Functions v2 loads
  automatically — `functions/.env.local` (emulator), `functions/.env.
  budgetapp-67761` (staging), `functions/.env.budgetapp-prod-f0c9a`
  (production), all named by real project id per Firebase's own dotenv
  convention, not the `staging`/`production` aliases. `PLAID_CLIENT_ID`/
  `PLAID_SECRET` are real secrets and do NOT belong in any `.env` file —
  wired via `defineSecret()` in `functions/src/index.ts`, bound onto
  `plaidWebhook`, meant to be set for real via `firebase functions:secrets:
  set --project staging|production` (run by the user themselves — entering
  API keys/secrets is a prohibited action for me to perform, even when the
  user supplies them in chat). Local/emulator use reads the same secret
  names from `functions/.secret.local` (gitignored; the one Firebase-
  sanctioned exception to "secrets never in a file") instead of Secret
  Manager. `functions/.gitignore` coverage confirmed: `*.local` already
  caught `.env.local`/`.secret.local`; the two project-id-named files
  needed explicit entries added.
- **User then hit the real blocker**: `firebase functions:secrets:set`
  requires the Blaze (pay-as-you-go) plan, which they didn't want to
  upgrade to. Explained honestly why a plain-`.env`-file workaround
  wouldn't actually solve it even though it's syntactically possible:
  (1) Plaid's `client_id`/secret are a real authentication credential —
  unlike the app's public `VITE_FIREBASE_*` config (safe to expose because
  Firestore rules + App Check are the actual security boundary there), so
  treating them the same way would be a real downgrade, and (2) more
  fundamentally, Cloud Functions on the free Spark plan can't make
  **any** outbound call to a third-party API at all — a plain-`.env`
  version of `plaidWebhook` still couldn't reach Plaid's servers, so the
  blocker was never really "where do the keys live," it was "Cloud
  Functions v2 requires Blaze for this, period."
- User pointed out Plaid's own quickstart repo (github.com/plaid/quickstart)
  doesn't need Firebase or Secret Manager at all — correct, because it's a
  plain Node/Express server, not a Cloud Function, so it just reads a
  normal `.env` file like any other server. That reframed the real
  decision: keep going through Firebase Cloud Functions (Blaze eventually
  unavoidable), or host the Plaid-calling backend as its own separate
  service, quickstart-style. User chose the latter, explicitly "for now."
- Built **`plaid-server/`** — a new, fully standalone top-level package
  (own `package.json`/`tsconfig.json`/`node_modules`, not part of the Vite
  app or `functions/`'s build): Express + TypeScript, `tsx watch` for dev,
  plain `tsc` for build, `plaid` (v38.1.0, resolved via real `npm install`
  rather than a guessed version pin) + `firebase-admin` (same `^13.10.0`
  `functions/` already uses) + `dotenv` + `cors`.
  - **Trust model**: since this server uses the Admin SDK (bypasses
    `firestore.rules` entirely), `src/middleware/requireAuth.ts` is the
    only thing standing between "any HTTP request" and "write to any
    user's Firestore data" — every route verifies a real Firebase ID
    token via `auth.verifyIdToken()` first and only ever acts on the
    verified `uid`, never one a request body could supply. This is the
    same trust boundary a Cloud Function gets for free from its execution
    environment; a plain server has to build it explicitly.
  - **Three routes, modeled on Plaid's own quickstart flow**:
    `POST /api/create_link_token` and `/api/exchange_public_token`
    (`src/routes/linkToken.ts`/`exchangeToken.ts`) implement the standard
    Plaid Link handshake — built but not yet called from anywhere, since
    the frontend has no Link UI yet. `POST /api/sync_transactions`
    (`src/routes/syncTransactions.ts`) is the one actually designed this
    session around a specific user question (see below).
  - **User asked directly whether this could avoid "live" bank polling in
    favor of an on-demand, checkpoint-based sync** — confirmed that's
    exactly the right model and that Plaid already has a purpose-built
    mechanism for it: `transactions/sync`'s `cursor` parameter. Rather
    than a raw "give me everything after timestamp X" design (which the
    user's own framing suggested), `sync_transactions` loads each linked
    item's stored `cursor` from `users/{uid}/plaidItems`, calls
    `transactionsSync`, and gets back only what's changed since last
    time — added, modified, *and* removed, which a plain timestamp
    can't express (e.g. a pending charge that later posts at a different
    amount). Nothing runs on a timer; this is a plain endpoint meant to
    be called once per sign-in (frontend wiring not built yet).
  - **Caught a real bug in my own first draft before it shipped**: the
    initial version wrote every re-synced transaction via
    `set(ref, {...doc, createdAt: serverTimestamp()}, {mergeFields:
    [...keys, 'createdAt']})` — but `mergeFields` only limits which fields
    get touched, it doesn't skip re-writing a field that's already in the
    payload, so `createdAt` would have been silently overwritten on every
    single re-sync of an existing (`modified`) transaction. Fixed by
    splitting `added` (sets `createdAt`+`updatedAt`, brand-new doc) from
    `modified` (merges everything except `createdAt`, which is never
    included in that write at all) — caught by re-reading the diff
    immediately after writing it, before ever running it.
  - New `users/{uid}/plaidItems/{itemId}` Firestore collection
    (`PlaidItemDoc` — `accessToken`, `cursor`, optional
    `institutionName`) holds each linked item's live bank-access
    credential. `firestore.rules` gained an explicit `allow read, write:
    if false` block for it — `accessToken` grants ongoing read access to
    the user's real bank account, so unlike every other collection in
    this app, the client must have **zero** access to it, not even read;
    only `plaid-server`'s Admin SDK ever touches this collection. This is
    a stricter rule than `plaidTransactions` (which the client can read/
    categorize) — deliberately, since an item's access token is a
    fundamentally more sensitive value than a transaction record.
  - Firebase Admin auth in a plain Node process (no Cloud Functions
    runtime to inject credentials automatically) needs a downloaded
    service account key — `src/firebaseAdmin.ts` uses
    `applicationDefault()`, which reads the standard
    `GOOGLE_APPLICATION_CREDENTIALS` env var. Documented in
    `plaid-server/.env.example` that the user needs to generate this
    themselves (Firebase Console → Project Settings → Service Accounts)
    rather than fabricating or requesting one.
  - `plaid-server/src/types.ts` duplicates `FirestorePlaidTransactionDoc`
    locally rather than importing from `src/lib/firestore/types.ts` — same
    reasoning `functions/` already established for keeping its own type
    copies instead of reaching into the frontend project, since this is a
    fully separate `tsconfig`/runtime. Also adds `PlaidItemDoc`, which has
    no frontend equivalent at all (by design — the client should never see
    this shape).
  - **This design effectively supersedes `functions/src/index.ts`'s
    `plaidWebhook` stub**, which assumed a Plaid-initiated push webhook —
    the pull/cursor model above needs no public webhook endpoint at all.
    Left `plaidWebhook` in place undeleted (removal wasn't asked for), but
    it's no longer the intended path. `categorizeTransaction` (the future
    AI-agent auto-categorization trigger) is independent of this hosting
    decision either way.
- Hit and fixed one real TypeScript config gotcha, same class of issue as
  the `app-starter-template` session earlier: an explicit
  `"moduleResolution": "node"` in `plaid-server/tsconfig.json` triggered
  `TS5107` (deprecated, will stop working in TS 7.0) under this repo's
  installed TypeScript version. Fixed by removing it entirely and letting
  it default, matching `functions/tsconfig.json`'s existing (warning-free)
  pattern — worth remembering as a recurring gotcha with this TypeScript
  version specifically, not a one-off.
- Verified: `npm install` in `plaid-server/` resolved real dependency
  versions (`plaid@38.1.0`, matching `firebase-admin@^13.10.0` already
  used in `functions/`); `npx tsc --noEmit` and `npm run build` both clean
  after the moduleResolution fix, confirming the Plaid SDK's actual v38
  types (`transaction.merchant_name`, `personal_finance_category`,
  `added`/`modified`/`has_more`/`next_cursor`, `CountryCode`, `Products`,
  `PlaidEnvironments`) match what was hand-written against them; `git add
  --dry-run plaid-server/` confirmed only source/config files would be
  staged — `node_modules/`, `dist/`, `.env`, and any service-account-key
  JSON are all correctly gitignored (the bare `node_modules/`/`dist/`/
  `.env` patterns already in the root `.gitignore` match at any depth,
  confirmed via `git check-ignore -v`; added explicit entries for the
  service-account-key filename since nothing else covered it).
- **Not yet done, by explicit scope** ("for now"): installing/wiring the
  Plaid Link JS SDK into the frontend, a "Connect a bank" UI, calling
  `create_link_token`/`sync_transactions` from anywhere in `src/`, and
  exercising any of this against a real (even sandbox) linked account —
  this session built the backend only.

### 2026-08-04 — Added a `dev:all` convenience script; removed now-dead Plaid plumbing from functions/
- Two quick follow-ups in the same day as the `plaid-server` work above.
- **`npm run dev:all`**: user asked whether `npm run dev` automatically
  starts `plaid-server` too — it doesn't (they're two fully independent
  processes, same relationship `functions/` already has to the root dev
  script). Added `concurrently` as a root dev dependency and a new
  `dev:all` script (`concurrently -n frontend,plaid-server -c blue,green
  "npm run dev" "npm run dev --prefix plaid-server"`) that runs both with
  one command, labeled/colored per-process. Deliberately left the existing
  `dev`/`dev:staging`/`dev:prod` scripts untouched — `dev:all` is purely
  additive, not a redefinition of what `dev` means. Verified by actually
  running it: frontend booted clean on `:5173`; `plaid-server` correctly
  failed fast with `Missing required env var PLAID_CLIENT_ID` (expected,
  since `plaid-server/.env` didn't exist yet at that point) — proving the
  process wiring itself was correct, not a bug.
- Created `plaid-server/.env` (gitignored — already covered by the root
  `.gitignore`'s bare `.env` pattern, confirmed via `git check-ignore -v`,
  no gitignore changes needed) with `PLAID_CLIENT_ID`/`PLAID_SECRET` left
  as **blank placeholders** rather than filled in from the sandbox values
  already sitting in `functions/.secret.local` — consistent with this
  session's standing policy of never moving/typing real credential values
  myself, even when they're already visible from an earlier step, since
  the user didn't explicitly ask for that copy. `FIREBASE_PROJECT_ID` was
  pre-filled to match the root `.env.local`'s `VITE_FIREBASE_PROJECT_ID`
  (`budgetapp-67761`) so this server writes to the same Firestore project
  the frontend already uses locally.
- **User then asked how `plaid-server` would switch between sandbox and
  production** — answered honestly that today it doesn't: it reads one
  `.env` file, and whatever `PLAID_ENV`/credentials are in it apply. Laid
  out the two real options (separate hosted instances each with their own
  env vars set on the hosting platform, once one is chosen — the standard
  pattern and the one recommended; vs. multiple local `.env.sandbox`/
  `.env.production` files with a mode-selecting script, useful only for
  local testing) without building either, since no hosting target has
  been picked yet and building the local-multi-env version would be
  solving a problem that doesn't exist yet.
- **That question surfaced that the Plaid credential plumbing added to
  `functions/src/index.ts` earlier this session was now genuinely dead**:
  it existed solely to support `plaidWebhook`, and `plaidWebhook`'s whole
  reason for existing (a public endpoint Plaid pushes updates to) is
  exactly what `plaid-server`'s pull-based `sync_transactions` design was
  built to avoid needing. Asked the user directly ("is there a need for
  this?") rather than assuming, and — once confirmed — removed it outright
  rather than leaving it as inert scaffolding, matching this file's own
  established precedent (`MoneyOverviewCard`, `DashboardPanel`,
  `checkPeriodResets`/`periodStart` were all deleted outright once fully
  superseded, not kept "just in case").
  - `functions/src/index.ts`: removed `plaidWebhook` entirely (the
    `defineSecret()` declarations, the `onRequest` import, and the
    function itself) — `categorizeTransaction` is untouched and remains,
    since it's independent of which backend calls Plaid.
  - Deleted `functions/.env.local`, `functions/.env.budgetapp-67761`,
    `functions/.env.budgetapp-prod-f0c9a`, `functions/.env.example`, and
    `functions/.secret.local` — none had anything left to configure once
    no function reads `PLAID_CLIENT_ID`/`PLAID_SECRET`/`PLAID_ENV`
    anymore. `functions/.secret.local` held the user's real sandbox keys
    (gitignored, never committed) — deleting it is a real, non-undoable
    loss of that copy, but the same values already live in
    `plaid-server/.env` (once the user fills in that file's blank
    placeholders), so nothing was actually lost.
  - Removed the now-stale `functions/.env.budgetapp-67761`/
    `functions/.env.budgetapp-prod-f0c9a` entries from the root
    `.gitignore` (pointless once those files no longer exist or get
    created).
  - Updated CLAUDE.md's Tech Stack table, the Plaid Current Status bullet
    (now describes one Cloud Function stub, not two), the `plaid-server`
    bullet's supersession note, and the `functions/` Architecture
    folder-tree entry to all reflect `plaidWebhook`'s removal rather than
    describing it as merely superseded-but-present.
- Verified: `functions/`'s `tsc --noEmit` and `npm run build` both clean
  after the removal (confirming `categorizeTransaction` alone still
  compiles with no leftover references to the deleted `plaidWebhook`/
  `defineSecret` code).

### 2026-08-05 — Real Plaid Link connect flow, sandbox-verified end-to-end
- User asked to start planning Plaid Link + sandbox account setup. Used
  the Explore/Plan agent workflow (plan mode) before writing any code:
  confirmed the frontend has zero existing pattern for calling an
  external REST API (this is the first), confirmed `useAuthStore` has no
  ID-token helper yet, and confirmed the data layer (`useBudgetStore.
  plaidTransactions`, `categorizeTransactionAsSpending`/`AsIncome`) is
  already fully wired to consume whatever `plaid-server`'s
  `sync_transactions` writes — meaning this was purely a "connect the
  pipes" task, not new data-layer work.
- **Three design decisions confirmed via `AskUserQuestion` before
  building**: (1) add a `hasLinkedBank` boolean on the user's Firestore
  root doc, written server-side by `plaid-server` only, so the UI can
  show "Connect a bank" vs. "Sync now" — the `plaidItems` collection
  itself stays permanently unreadable by the client, by design, so this
  flag is the only channel for that state. (2) Add a manual "Sync now"
  button alongside the connect flow. (3) Sync happens immediately after a
  successful link (chained into the same `onSuccess` callback), not
  deferred to next sign-in.
- **A fourth decision came from the user directly questioning the plan
  mid-review**: asked "do you mean the user has to re-sync after every
  sign-in?" — correctly caught that the original plan only synced once,
  right after linking, with no ongoing trigger. Added automatic
  sync-on-every-sign-in as a result, hooked into `useAuthStore.ts`'s
  existing `onAuthStateChanged` listener via a new
  `syncPlaidTransactionsOnceReady(uid)` — a one-shot
  `useBudgetStore.subscribe` that waits for `loading` to flip false
  (since `hasLinkedBank` isn't hydrated synchronously) before checking
  the flag and calling `syncTransactions()`.
- Built `src/lib/plaidServer.ts` (the app's first external REST client —
  a single `plaidFetch<T>()` helper attaching a fresh Firebase ID token
  as `Authorization: Bearer`), `src/components/dashboard/
  ConnectBankButton.tsx` (branches on `hasLinkedBank`; the `!hasLinkedBank`
  path mounts a small `PlaidLinkLauncher` child component specifically so
  `usePlaidLink`'s hook rules are respected — hooks can't be called
  conditionally, so "fetch a token, then open Link" has to be sequenced
  via mount/unmount rather than an if-branch inside one component), the
  `hasLinkedBank` plumbing across `src/lib/firestore/types.ts`/`sync.ts`/
  `useBudgetStore.ts`, and `plaid-server/src/routes/exchangeToken.ts`'s
  now-batched write of both the `PlaidItemDoc` and the new
  `UserDocPlaidFields` flag.
- Installed `react-plaid-link@^5` (confirmed via `npm view` — its peer
  deps cover React 16–19, no version conflict with this app's pinned
  React 18).
- **Live sandbox verification surfaced a real gap, not just a smoke
  test**: the first real "Connect a bank" attempt got a `401` from
  `create_link_token` — `plaid-server`'s Admin SDK was verifying the
  frontend's ID token against *production* Firebase, while the frontend
  was signed in via the local Auth emulator (a mismatch this session's
  earlier `plaid-server` work never had to confront, since nothing had
  actually called `requireAuth` against emulator-issued tokens until
  now). Fixed by adding real Firebase-emulator support to `plaid-server`
  itself for the first time: a new `USE_FIREBASE_EMULATORS` env var that,
  when true, points the Admin SDK at `127.0.0.1:9099`/`127.0.0.1:8080`
  instead of production and skips `GOOGLE_APPLICATION_CREDENTIALS`
  entirely (the emulators don't check credentials) — this is also what
  unblocked testing without ever having to generate a real downloaded
  service account key.
- **User also asked for `npm run dev:all` to start the Firebase emulators
  too** — added a third `concurrently` process, so one command now boots
  the entire local stack (frontend + `plaid-server` + emulators).
- **Verified genuinely end-to-end against Plaid's real sandbox, not
  mocked**: clicked "Connect a bank," completed Plaid Link's actual
  hosted flow (phone verification with Plaid's sandbox-mode-displayed
  test code, institution picker, "Tartan Bank," account confirmation),
  and confirmed a real `200 OK` chain through `create_link_token` →
  `exchange_public_token` → `sync_transactions` (48 real sandbox
  transactions on first link, toast confirmed the count). Confirmed
  `hasLinkedBank` round-tripped through Firestore correctly — the header
  button swapped from "Connect a bank" to "Sync now" with no page
  reload, proving the Firestore-listener-not-manual-store-mutation design
  actually works. Confirmed real transactions (Starbucks, Uber, United
  Airlines, etc., with Plaid's own `personal_finance_category` strings)
  rendered correctly in the existing Bank Activity UI and could be
  categorized exactly like the fake "Simulate bank sync" data — categorized
  a $500 "Tectra Inc" transaction as Rent and confirmed it flowed into
  that month's real Spent total ($500.00), proving the "categorizing
  creates a real Purchase" design holds for genuinely Plaid-sourced data,
  not just the hand-written demo fixtures it was originally tested
  against. Confirmed clicking "Sync now" again was correctly idempotent
  (`syncedCount: 0`, no duplicate transactions). Confirmed dark mode
  renders the new button correctly in both states (manually toggling the
  `.dark` class, since this app still has no real dark-mode toggle UI).
- **One non-obvious debugging note**: the 48 real sandbox transactions
  didn't initially appear anywhere in the UI after a successful sync,
  which looked like a bug at first. Root cause: Plaid's sandbox seeds
  transaction dates relative to *its own* real-world clock, landing them
  in May–July 2026, while the shared date filter defaulted to the
  current month (August 2026) — zero overlap, so `SpendingBankActivity`'s
  empty-when-nothing-in-range behavior correctly rendered nothing. Not a
  bug; confirmed by querying the synced documents directly via a
  throwaway Admin SDK script against the emulator (`earliest: 2026-05-09,
  latest: 2026-07-28`), then switching the date filter to July and
  confirming all 12 of that month's transactions rendered correctly.
- **Known, harmless, unfixed quirk found during testing**: `onAuthStateChanged`
  fired twice for one sign-in (two `sync_transactions` calls ~14ms apart
  in the network log) — a known Firebase Auth SDK behavior, not a bug in
  the code written this session. Harmless because the sync is cursor-based
  and idempotent; not worth adding dedupe complexity for.
- Verified: `npx tsc -b` (app) and `npx tsc --noEmit` (`plaid-server`)
  both clean after every change, including the mid-session
  `USE_FIREBASE_EMULATORS` fix (confirmed `plaid-server`'s `tsx watch`
  picked up the change live without a restart — the retried request
  after the fix returned `200 OK`).
- Not yet done, by explicit scope: OAuth-flavored sandbox institution
  testing (needs a configured `redirect_uri`), a staging/production
  deployment of `plaid-server` (and the `VITE_PLAID_SERVER_URL` those
  environments would need), and the `investments` Plaid product
  (mentioned by the user as a future goal, deliberately deferred —
  `sync_transactions` only requests/handles `transactions` today).
- **Deleted "Simulate bank sync" outright**, once real Plaid data was
  confirmed working end-to-end. User asked directly why the app was still
  using fake demo data instead of the real sandbox account it now has —
  correctly pointed out the original reason `SimulateBankSyncButton`
  existed (no real Plaid connection yet) no longer applied, matching this
  file's own established precedent of deleting fully-superseded code
  outright rather than leaving it as unused fallback scaffolding
  (`MoneyOverviewCard`, `DashboardPanel`, `checkPeriodResets`/`periodStart`,
  `plaidWebhook` were all handled the same way earlier in this project).
  Removed `src/components/dashboard/SimulateBankSyncButton.tsx`,
  `src/lib/plaidDemoData.ts` (the fake transaction data), and
  `src/lib/firestore/plaidDemoData.ts` (the batch seeder) — plus
  `writePlaidTransaction` in `src/lib/firestore/writes.ts`, found to be
  genuinely dead code once traced (only ever called by the deleted seed;
  real synced transactions are written server-side by `plaid-server`
  instead, never through this frontend function) and its now-unused
  `FirestorePlaidTransactionDoc` import. Updated `HomePage.tsx` to drop
  the import/render. Verified via the live dev server (not just `tsc`)
  that "Simulate bank sync" is gone from the header entirely, not merely
  hidden — confirmed `tsc -b`/`lint`/`build` all clean after the removal.
- **Explicit categorization check + a new `plaidCategoryPrimary` field**.
  User asked "how are you classifying purchases from income" — answering
  that surfaced that `INCOME` wasn't checked explicitly (only inferred
  via amount sign), which the user then asked to fix directly: "make
  sure it is classified as income" if Plaid's own category says so.
  Added the explicit `personal_finance_category.primary === 'INCOME'`
  check to `deriveTransactionType` (checked first, before the
  `TRANSFER_IN`/`TRANSFER_OUT` check, before the sign-based fallback) —
  see the full reasoning and code in the Plaid Link bullet above. Also
  added `plaidCategoryPrimary` (Plaid's coarse ~16-value bucket) to every
  synced transaction, across `src/types/plaidTransaction.ts`,
  `src/lib/firestore/types.ts`, `src/lib/firestore/sync.ts`, and
  `plaid-server/src/types.ts` — explicitly for a future auto-sort-into-
  budget-categories feature, per the user's own stated reasoning, kept
  separate from the existing granular `plaidCategory`. Refactored
  `syncTransactions.ts` to extract a shared `buildTransactionDoc` helper
  (typed against Plaid SDK's real `Transaction` type) rather than
  duplicating the construction across the `added`/`modified` write loops.
- **Verified the categorization field live, not just type-checked**:
  wrote two temporary Admin SDK scripts (`reset-cursor.mjs` to force a
  full re-sync by clearing the stored Plaid cursor, `check-categories.mjs`
  to query and print every synced transaction's classification), ran
  them against the emulator, confirmed all 48 real synced sandbox
  transactions had `plaidCategoryPrimary` populated (0 missing), then
  deleted both scripts — never committed, matching this file's
  established "throwaway verification script, not kept" convention.
- **Found and honestly reported, rather than silently fixed, a real
  classification edge case**: 3 real "United Airlines" sandbox
  transactions (category `TRAVEL`, negative amount) were classified
  `'income'` by the sign-based fallback — almost certainly a simulated
  flight refund, which Plaid's category taxonomy has no way to
  distinguish from genuine income. Explicitly did not build a fix (e.g.
  a separate `'refund'` type) and instead asked the user how they'd want
  it handled — a product decision, not an obvious bug, and one the user
  has not yet answered as of this entry.
- **Answered "are we retrieving money spent, money earned, and bank
  balance from Plaid"**: confirmed via `grep` that spent/earned were
  (through `transactions/sync`, classified) but bank balance was **not**
  — it was still the original, fully manual, editable `bankBalance`
  field, completely disconnected from Plaid. User then explicitly asked
  to pull the real balance and **replace** the manual field with it, not
  just add it alongside — see the new balance-sync bullet in the Plaid
  Link section above (`sync_balance` route, `IncomeOverview.tsx`
  branching on `hasLinkedBank`) for the full implementation, verified
  live against the real sandbox account (`{"bankBalance":62569}` synced
  and rendered correctly with no reload).
- **Deleted "Load demo data" outright**, once the balance-sync work above
  meant real Plaid sandbox data now covers every axis (transactions,
  classification, and balance) this feature used to stand in for. User
  asked directly to rely solely on Plaid data as this app's test-data
  source — same "delete once fully superseded" precedent already applied
  to `SimulateBankSyncButton`/`plaidDemoData.ts` earlier this session (and
  to `MoneyOverviewCard`/`DashboardPanel`/`checkPeriodResets` before that).
  Removed `src/components/dashboard/LoadDemoDataButton.tsx`,
  `src/lib/demoData.ts` (the hardcoded mock dataset — 9 categories, 5
  income sources, 6 paychecks, ~19 purchases), and
  `src/lib/firestore/demoData.ts` (the `loadDemoData` batch writer);
  updated `HomePage.tsx` to drop the import/render. Confirmed via `grep`
  across `src/` that nothing else referenced any of the three beyond one
  harmless doc comment in `writes.ts` (describing `deleteCategory`'s batch
  pattern as "mirroring" `demoData.ts`'s — left as-is, since the pattern
  description is still accurate even though the file it points to is
  gone). Note: deleting the *seeding feature* doesn't retroactively wipe
  data an account already seeded with it — any account that had already
  clicked "Load demo data" keeps that data in Firestore until manually
  removed; only the ability to seed *new* demo data going forward is
  gone. Verified via the live dev server that the button is gone from the
  header (only "Sync now"/"Sign out" remain) and the app still renders
  correctly against already-seeded data with no console errors beyond the
  pre-existing stale-HMR noise from this session's earlier file deletions
  (a long-running dev server holding a stale module-graph reference to a
  deleted file — cosmetic, clears on a full dev-server restart, not
  investigated further). `tsc -b`/`lint` both clean after the removal.
- **"Monthly/Yearly Spent" and "Earned"/income totals now count every real
  transaction, not just categorized ones.** User asked directly: spending
  totals should reflect transactions "no matter if they are part of a
  budget category or not," then "Same with Income" for the mirrored
  income figures. Before this, `getTotalSpent`/`getIncomeInRange` only
  summed `Purchase`/`Paycheck` docs — meaning a real Plaid transaction sat
  in "Bank activity" as a genuine debit/credit against the account but
  didn't count toward "Monthly Spent" or "Earned this month" until someone
  clicked "Categorize…". Given the whole point of this session's earlier
  work was making Plaid the sole source of test data, that gap meant the
  headline totals could understate reality by exactly however much sat
  uncategorized.
- Rewrote both functions around the same design: sum every `Purchase`/
  `Paycheck` (unchanged — these already count whether manually entered or
  created by categorizing a transaction) **plus** every synced
  `PlaidTransaction` of the matching type (`spending`/`income`) that's
  **not yet categorized** (`!isPlaidTransactionCategorized(t)`). The
  not-yet-categorized guard is what prevents double-counting — the moment
  a transaction is categorized it already has a corresponding Purchase/
  Paycheck being summed in the first half, so it can't be counted twice.
  `getTotalSpent` (`src/lib/spending.ts`) also dropped its `categories`
  parameter entirely and now sums `purchases` directly rather than
  iterating per-category and totaling — mathematically identical (every
  `Purchase.categoryId` is required and cascading category-delete
  guarantees no orphans) but simpler and no longer needs the categories
  array at all.
- **Deliberately did NOT touch three things that looked like natural
  extensions but weren't asked for and would have been the wrong call**:
  (1) `getSourceIncomeInRange`/`getCategorySpent` (the per-source/
  per-category breakdown figures behind `IncomeSourcesPieChart`/
  `SpendingPieChart`/`CategoryBreakdownBar`) stay paycheck/purchase-only,
  since an uncategorized transaction has no source or category to
  attribute it to — this means those breakdowns' segments can now sum to
  *less* than the new, larger total, which shows up as an implicit gap
  (a partial pie / a stacked bar that doesn't reach 100%) rather than a
  bug; confirmed this renders fine, not broken, during verification. (2)
  `getAnnualizedIncomeByType` (`src/lib/tax/`'s one integration point)
  was deliberately left built on `getPaychecksInRange`, not the new
  `getIncomeInRange` — an uncategorized transaction has no known
  `incomeType`, and silently guessing W-2 vs. self-employment for real
  tax-liability math would be a materially different kind of risk than a
  display total being a little low, so the tax module keeps seeing only
  income that's actually been attributed to a source. (3) Pending Plaid
  transactions are still counted (no `pending` filter added) — matching
  how "Bank activity" already treated them, not a new decision.
  `getMonthlyIncomeEquivalent` (feeds percentage-of-income budget
  targets) and `getLeftoverCash` both now flow through the updated
  `getIncomeInRange`/`getTotalSpent`, so a budget category's dollar
  target and the dashboard's "Left over" figure both reflect the fuller
  totals too — consistent with the "one shared helper every screen goes
  through" convention already established for `annualize`.
- Updated every call site to pass `plaidTransactions` from
  `useBudgetStore`: `MoneySummaryRow`, `SpendingSummary`, `BudgetSummary`,
  `BudgetContent`, `IncomeOverview`, `IncomeSummary`, `IncomeContent`.
- **Verified against seeded emulator data, not just `tsc`**: since the
  emulator has no persistence and this session's earlier process cleanup
  had already wiped any prior local test account, signed up a fresh
  account and used a throwaway Admin SDK script (`plaid-server/
  verify-totals.mjs`, deleted after use — same established
  temporary-verification-script convention as `reset-cursor.mjs`/
  `check-categories.mjs` earlier this session) to seed: one categorized
  purchase ($100, in a $500 Groceries category), one categorized paycheck
  ($1,000, W-2 Job), one uncategorized spending transaction ($42.50), one
  uncategorized income transaction ($77.25), and one transfer transaction
  ($500, to confirm it's excluded from both totals). Confirmed via the
  live UI: "Spent this month" showed exactly $142.50 (100 + 42.50),
  "Income this month" showed exactly $1,077.25 (1000 + 77.25), "Left
  over" was their exact difference, "Yearly Spent" was exactly $142.50 ×
  12, the Groceries category breakdown correctly showed 70.2% (leaving an
  unfilled ~30% gap for the uncategorized spending) rather than
  100%/breaking, the Income breakdown correctly showed W-2 Job at 92.8%
  with the same kind of gap, the $500 transfer appeared in neither total,
  and both uncategorized transactions still showed up correctly in "Bank
  activity" with their "Categorize…" control intact. `tsc -b`/`lint` both
  clean.
- **Process hygiene note following up on this session's earlier port-
  conflict incident**: needed the full local stack (frontend + plaid-
  server + Firebase emulators) running to seed/verify against real
  Plaid-shaped data, so started all three myself this time — and,
  learning from earlier in this session where a similar setup was left
  running and blocked the user's own `npm run dev:all`, explicitly
  stopped all three (`preview_stop` for the frontend, `taskkill` for
  plaid-server and the emulator process) once verification finished,
  confirmed via `netstat` that every relevant port (5173/8090/9099/8080)
  was free again before ending the turn.
