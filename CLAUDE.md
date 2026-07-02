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

**Foundation only — no feature screens implemented yet.**

Implemented:
- Project scaffold (Vite + React 18 + TypeScript), clean `npm install`
- Routing shell: `/` (HomePage) and `/about` (AboutPage) placeholders
- Tailwind v4 + shadcn/ui wired up (`components.json`, `src/lib/utils.ts`,
  one proof-of-concept component: `src/components/ui/button.tsx`)
- TanStack Query `QueryClientProvider` wired in `src/main.tsx`
- Zustand, React Hook Form, Zod, `@hookform/resolvers`, Recharts installed
  as dependencies with documented (not yet used) conventions
- Firebase client SDK initialized (`src/lib/firebase.ts`) reading
  `VITE_FIREBASE_*` env vars; does not throw with empty/placeholder values
- Firebase project scaffold: `firebase.json`, `.firebaserc` (placeholder
  project id `clearbooks-dev`), locked-down `firestore.rules`,
  `firestore.indexes.json`, Firestore/Auth/Functions emulator config
- Cloud Functions scaffold in `functions/` (own `package.json`/`tsconfig.json`,
  `firebase-admin` + `firebase-functions` installed, compiles clean, no real
  functions yet)
- Git hygiene: `.gitignore` added, `node_modules` untracked from git

Not yet implemented: authentication, any data screens, Plaid/Veryfi/Resend
integrations, tax engine, real Zustand stores, real forms, real charts.

**Before real use**: a real Firebase project must be created (console or
`firebase projects:create`) and swapped into `.firebaserc` via
`firebase use --add`. Firebase Hosting was intentionally skipped in this
setup — nothing to deploy yet.

## Architecture / Folder Conventions

```
src/
  assets/          # static images/icons (currently empty — template assets removed)
  components/
    ui/            # shadcn-generated primitives (button, etc.)
    charts/        # Recharts wrapper components (future)
  pages/           # route-level components (HomePage, AboutPage, future: Dashboard, Budget, etc.)
  stores/          # Zustand stores, one file per domain, named use<Domain>Store.ts
  lib/
    firebase.ts    # Firebase SDK init: `app`, `db` eager; `getFirebaseAuth()` lazy
                    # (getAuth() throws eagerly on missing/invalid API key, unlike
                    # getFirestore() — call getFirebaseAuth() only where auth is used)
    utils.ts       # shadcn cn() helper
    schemas/       # Zod schemas for forms
  hooks/           # custom hooks incl. TanStack Query hooks (created on first use)
  types/           # shared TypeScript types (created on first use)
  vite-env.d.ts    # ImportMetaEnv typing for VITE_FIREBASE_* vars

functions/
  src/index.ts     # Cloud Functions entry point (empty placeholder for now)
```

Conventions:
- Zustand stores: `src/stores/`, one file per domain slice, `use<Domain>Store.ts`
- TanStack Query hooks: `src/hooks/`, colocated with the feature that uses them
- Form schemas: `src/lib/schemas/` (Zod); forms use React Hook Form +
  `@hookform/resolvers/zod`
- Chart components: `src/components/charts/` (Recharts wrappers)
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
