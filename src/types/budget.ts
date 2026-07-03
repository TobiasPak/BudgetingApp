import type { LucideIcon } from 'lucide-react'

export type ChartColorToken =
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5'

interface BudgetCategoryBase {
  id: string
  name: string
  // Component reference, not a string — safe while this only lives in
  // in-memory Zustand state. Switch to a string + icon-lookup map before
  // adding persistence/serialization (e.g. Firestore sync).
  icon: LucideIcon
  color: ChartColorToken
  isCustom?: boolean
  // Day of month (1-31) this category's tracking cycle recurs on — see
  // getCurrentPeriod in src/lib/period.ts. Defaults to 1 (calendar month).
  //
  // Spending itself isn't stored here at all — it's derived by summing
  // this category's Purchase records that fall within its current period
  // (see getCategorySpent in src/lib/purchases.ts). That also means a
  // cycle rollover "resets" spending for free: once a purchase's date
  // falls outside the newly-current period, it just stops counting — no
  // stored total to manually zero out, unlike the old monthlySpent field.
  resetDay: number
}

// A flat dollar target, e.g. "$250/mo for groceries" — same shape as the
// original single-type model.
interface FixedBudgetCategory extends BudgetCategoryBase {
  type: 'fixed'
  monthlyAmount: number
}

// A rule, not a dollar amount — e.g. "save 10% of my paycheck." The actual
// monthly dollar target isn't stored here; it's computed on demand from
// income data (see getMonthlyTarget in src/lib/budget.ts), so it always
// stays in sync as new paychecks come in.
interface PercentageBudgetCategory extends BudgetCategoryBase {
  type: 'percentage'
  percent: number
  basis: 'paycheck' | 'monthlyIncome'
}

export type BudgetCategory = FixedBudgetCategory | PercentageBudgetCategory

// TypeScript's built-in Omit<T, K> computes `keyof T` up front — for a
// union, that's only the keys common to every member, so a plain
// Omit<BudgetCategory, 'id'> would silently drop `monthlyAmount` on one
// branch and `percent`/`basis` on the other instead of omitting 'id' from
// each. Wrapping it in `T extends unknown ? ... : never` makes it
// distribute over the union, applying Omit to each member separately.
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never
