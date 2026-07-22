import type { DateFilterMode } from './period'

export function isOverBudget(spent: number, target: number) {
  return spent > target
}

export function progressPercent(spent: number, target: number) {
  if (target <= 0) return 0
  return Math.min((spent / target) * 100, 100)
}

// A category's dollar target (getMonthlyTarget in src/lib/income.ts) is
// defined as a MONTHLY rate. Scaled here to whatever the shared date filter
// is set to: unchanged for month mode (a month IS the target's native
// unit), ×12 for year mode — same exact figures this app has always shown,
// just resolved through one shared function instead of each screen
// recomputing `* 12` inline.
export function getTargetForMode(monthlyTarget: number, mode: DateFilterMode): number {
  return mode === 'month' ? monthlyTarget : monthlyTarget * 12
}
