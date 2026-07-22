import { getCategorySpent } from './purchases'
import type { DateRange } from './period'
import type { BudgetCategory } from '@/types/budget'
import type { Purchase } from '@/types/purchase'

// Total spend across every category within the selected range — each
// category still sums its own purchases (getCategorySpent), this just
// totals them, mirroring the same reduce already done inline in
// BudgetSummary/HomePage.
export function getTotalSpent(
  categories: BudgetCategory[],
  purchases: Purchase[],
  range: DateRange
): number {
  return categories.reduce((sum, c) => sum + getCategorySpent(purchases, c, range), 0)
}
