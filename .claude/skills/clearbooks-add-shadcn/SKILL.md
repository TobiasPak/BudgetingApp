---
name: clearbooks-add-shadcn
description: Add a new shadcn/ui component to ClearBooks (this repo) safely — runs the CLI, checks/fixes the missing React.forwardRef this project's installed CLI/registry version leaves out, checks for auto-installed dependencies the app doesn't actually need, and avoids reverting prior forwardRef fixes on re-add. Use this whenever a task requires a shadcn component (`npx shadcn@latest add <x>`) that isn't already in `src/components/ui/`.
---

# Add a shadcn component in ClearBooks

This project's installed shadcn CLI/registry version generates components that are **not** wrapped in `React.forwardRef` by default (unlike modern shadcn). That gap is silent until something tries to attach a ref through the generated component — `DialogTrigger asChild` composition and React Hook Form's uncontrolled-field `defaultValues`/`reset()` have both broken on it before (see `CLAUDE.md`'s Session Log, 2026-07-03 entry). This skill is the repeatable procedure for adding a component without re-discovering that the hard way.

## 1. Run the CLI

```
npx shadcn@latest add <component> -y
```

## 2. Check whether generated subcomponents need `forwardRef`

Open the generated file(s) in `src/components/ui/`. For each subcomponent that something else in the app will attach a `ref` to (a `DialogTrigger asChild` wrapping it, a React Hook Form `register()` call, any explicit `ref` prop) — check whether it's wrapped in `React.forwardRef`. If not, fix it, following the existing pattern in `src/components/ui/button.tsx` or `dialog.tsx`.

**Only fix subcomponents that actually need a ref attached.** Don't fix speculatively across an entire generated file — `Label` and the `Card` subcomponents have the same latent gap but were deliberately left unwrapped because nothing ref's them (yet). If a future use needs one, fix it then.

## 3. Check for unwanted auto-installed dependencies

Diff `package.json`/`package-lock.json` after the add. Some shadcn components pull in a dependency this app has no use for — `sonner` auto-installed `next-themes` (a Next.js theme hook with nothing to back it, since this Vite app has no `ThemeProvider`) even though the actual fix was a one-line `theme="system"` prop. If you find one:

```
npm uninstall <unwanted-package>
```

and remove any import the generated file added for it.

## 4. Re-adding a component already patched in a prior session

If `npx shadcn@latest add` targets a component this repo already fixed (e.g. re-running `add button`), the CLI will prompt to overwrite the existing file. **Decline the overwrite** — accepting it silently reverts the `forwardRef` fix. Confirm via `git diff` afterward that the file is unchanged.

## 5. Document it

Add one line to `CLAUDE.md`'s Current Status shadcn component list and, if this session's Session Log entry is otherwise substantial, a short note of what was added — but don't re-describe this whole procedure inline; point back to this skill instead (per the file's own process note about not re-deriving repeatable procedures in prose).
