---
name: clearbooks-verify
description: Verify a ClearBooks (this repo) code change actually works end-to-end using the Claude Preview MCP tools — starts the clearbooks-dev server, exercises the change on the right route, runs the standard tsc/lint/build checks, and checks dark mode. Use this whenever a change to this codebase needs to be confirmed working before calling it done — especially UI/component changes on the Budget page or dashboard, dialog/popover form changes, or anything affecting layout or dark-mode styling. Also consult this when debugging odd preview_eval behavior (a Radix Dialog/Popover closing unexpectedly, unreliable console-log ordering) or when checking whether a layout truly fills the available space. This is the repo's own preview-tool reference, distinct from the generic "verify" skill's runtime-observation philosophy.
---

# Verify a ClearBooks change

Run this after editing code in this repo, before reporting a change as done. It captures both the standard check sequence and a handful of preview-tool gotchas specific to this app that are easy to re-discover the hard way.

This is a project-specific reference for *how to drive this app's UI via the Preview MCP tools* — narrower in scope than the ecosystem's generic `verify` skill (which is about runtime-observation philosophy in general and doesn't know this repo's specifics). Use both together: the generic skill for how to think about verification, this one for the concrete mechanics of this codebase.

## 1. Start the dev server

Use `preview_start` with the `clearbooks-dev` config from `.claude/launch.json`:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "clearbooks-dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 5173
    }
  ]
}
```

If `.claude/launch.json` is ever missing this config, recreate it with this exact shape before calling `preview_start`.

## 2. Exercise the change on the right route

- `/` — dashboard home
- `/budget` — the primary feature surface; nearly all feature work lands here
- `/about` — placeholder, rarely worth checking

Navigate with `preview_eval` (e.g. `window.location.href = 'http://localhost:5173/budget'`) rather than assuming client-side routing state carried over from a previous check.

## 3. Run the standard checks

In this order, all three must be clean before calling a change verified:

```
npx tsc -b
npm run lint    # this project uses oxlint, not eslint — output format differs from eslint's
npm run build
```

## 4. Dark mode has no toggle yet

There is no dark-mode toggle UI in this app. To check dark-mode styling, force it on directly via `preview_eval`:

```js
document.documentElement.classList.add('dark')
```

Don't spend a round trip looking for a toggle control — there isn't one.

## 5. Testing Radix Dialog/Popover interactions

This app's dialogs and popovers (Add paycheck, Add budget, the MonthYearPicker popover) are shadcn/Radix components. Their dismissable-layer logic treats certain focus changes as "click outside" — and some of what `preview_eval` does when a tool call starts/ends can trigger that same detection between separate calls.

**Do the entire interaction — open, fill, select, submit — inside one single `async` `preview_eval` call**, with short `setTimeout` waits between steps. Splitting the same steps across multiple separate tool calls has caused the dialog/popover to close prematurely mid-interaction. One call with several awaited steps is the reliable pattern; don't split it "for clarity."

## 6. Debugging state / call-ordering

When you need to know whether a value reflects your latest change or a stale prior reload, don't lean on `preview_console_logs` — its buffer accumulates for the whole session and never clears, so "is this from now or five reloads ago" genuinely can't be answered from logs alone.

Instead, write the value to a `window.__debugX`-style variable and read it back within the *same* `preview_eval` call. That's synchronous and unambiguous, unlike cross-call log inspection.

## 7. "Does this fill the available space?" questions

A `preview_screenshot` is compressed and can make a perfectly correct layout look like it has a gap or is cut off when it doesn't. For layout-fills-viewport questions, check actual computed geometry instead:

```js
document.querySelector('main').getBoundingClientRect()
```

via `preview_eval`. Trust the numbers over the screenshot for this specific kind of question — screenshots are still the right tool for confirming colors, spacing, and general appearance.
