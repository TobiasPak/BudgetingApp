import { getCategorySpent } from './purchases'
import type { BudgetCategory } from '@/types/budget'
import type { Purchase } from '@/types/purchase'

// Total spend across every category for the period containing `reference` —
// each category still sums against its own resetDay cycle (getCategorySpent),
// this just totals them, mirroring the same reduce already done inline in
// BudgetSummary/HomePage.
export function getTotalSpent(
  categories: BudgetCategory[],
  purchases: Purchase[],
  reference: Date = new Date()
): number {
  return categories.reduce(
    (sum, c) => sum + getCategorySpent(purchases, c, reference),
    0
  )
}
