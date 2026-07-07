import { getCurrentPeriod } from './period'
import type { Purchase } from '@/types/purchase'
import type { BudgetCategory } from '@/types/budget'

// This category's purchases that fall within its cycle containing
// `reference` (defaults to now — the live current cycle), most recent
// first. ISO "YYYY-MM-DD" strings compare correctly with plain </>
// operators (zero-padded, big-endian), so no Date parsing is needed for
// the range check.
export function getCategoryPurchases(
  purchases: Purchase[],
  category: BudgetCategory,
  reference: Date = new Date()
): Purchase[] {
  const period = getCurrentPeriod(category.resetDay, reference)
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
  category: BudgetCategory,
  reference: Date = new Date()
): number {
  return getCategoryPurchases(purchases, category, reference).reduce(
    (sum, p) => sum + p.amount,
    0
  )
}
