import { getCurrentPeriod } from './period'
import type { Purchase } from '@/types/purchase'
import type { BudgetCategory } from '@/types/budget'

// This category's purchases that fall within its current cycle, most
// recent first. ISO "YYYY-MM-DD" strings compare correctly with plain
// </> operators (zero-padded, big-endian), so no Date parsing is needed
// for the range check.
export function getCategoryPurchases(
  purchases: Purchase[],
  category: BudgetCategory
): Purchase[] {
  const period = getCurrentPeriod(category.resetDay)
  return purchases
    .filter(
      (p) =>
        p.categoryId === category.id &&
        p.date >= period.start &&
        p.date <= period.end
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getCategorySpent(
  purchases: Purchase[],
  category: BudgetCategory
): number {
  return getCategoryPurchases(purchases, category).reduce(
    (sum, p) => sum + p.amount,
    0
  )
}
