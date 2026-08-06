import { isDateInRange, type DateRange } from './period'
import { isPlaidTransactionCategorized } from '@/types/plaidTransaction'
import type { Purchase } from '@/types/purchase'
import type { PlaidTransaction } from '@/types/plaidTransaction'

// Total spend within the selected range — real money that actually left
// the account, whether or not it's been sorted into a budget category yet.
// Sums every Purchase directly (rather than iterating per-category and
// totaling, the old approach) since a Purchase always carries a valid
// categoryId; on top of that, adds every synced Plaid transaction that's
// spending-type but not yet categorized (isPlaidTransactionCategorized ===
// false) — once a transaction IS categorized it already has a
// corresponding Purchase counted in the first half, so this can't
// double-count. This is what lets "Monthly/Yearly Spent" reflect every
// real transaction, categorized or not, per explicit design.
export function getTotalSpent(
  purchases: Purchase[],
  plaidTransactions: PlaidTransaction[],
  range: DateRange
): number {
  const purchaseTotal = purchases
    .filter((p) => isDateInRange(p.date, range))
    .reduce((sum, p) => sum + p.amount, 0)

  const uncategorizedSpendingTotal = plaidTransactions
    .filter(
      (t) =>
        t.transactionType === 'spending' &&
        !isPlaidTransactionCategorized(t) &&
        isDateInRange(t.date, range)
    )
    .reduce((sum, t) => sum + t.amount, 0)

  return purchaseTotal + uncategorizedSpendingTotal
}
