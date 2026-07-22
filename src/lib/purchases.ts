import { isDateInRange, type DateRange } from './period'
import type { Purchase } from '@/types/purchase'
import type { BudgetCategory } from '@/types/budget'

// This category's purchases dated within the selected range, most recent
// first. Filters directly against the shared date-range filter rather than
// each category's own resetDay cycle — the range filter now governs which
// purchases count for every screen, category rows included (resetDay
// still drives each category's recurring dollar target — see
// getTargetForRange in src/lib/budget.ts — it just no longer decides which
// purchases get summed).
export function getCategoryPurchases(
  purchases: Purchase[],
  category: BudgetCategory,
  range: DateRange
): Purchase[] {
  return purchases
    .filter((p) => p.categoryId === category.id && isDateInRange(p.date, range))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getCategorySpent(
  purchases: Purchase[],
  category: BudgetCategory,
  range: DateRange
): number {
  return getCategoryPurchases(purchases, category, range).reduce(
    (sum, p) => sum + p.amount,
    0
  )
}
