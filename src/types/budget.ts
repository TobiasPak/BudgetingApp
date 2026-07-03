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
  monthlySpent: number
  isCustom?: boolean
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
