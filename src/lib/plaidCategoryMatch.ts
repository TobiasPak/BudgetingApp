// Resolves which budget category or income source (if any) a Plaid
// transaction should auto-categorize into, based on each category/source's
// autoCategorizeBuckets — see src/types/budget.ts and
// src/types/incomeSource.ts. Duplicated in plaid-server/src/lib/
// plaidCategoryMatch.ts (same logic, separate runtime) — same precedent as
// recomputeSnapshot.ts.

export interface AutoCategorizeTarget {
  id: string
  autoCategorizeBuckets?: string[]
}

export interface CategorizableTransaction {
  transactionType: 'spending' | 'income' | 'transfer'
  plaidCategory: string
  plaidCategoryPrimary?: string
}

export type AutoCategoryMatch = { kind: 'category'; id: string } | { kind: 'source'; id: string }

// Detailed-level match (exact plaidCategory) always wins over a primary-
// level match (plaidCategoryPrimary) — a category mapped to the specific
// bucket beats one mapped only to the broader one. Transfers never match
// (they're never shown or categorizable anywhere in this app). Multiple
// candidates at the same specificity level — a genuine configuration
// overlap, e.g. two categories both specifically claim the same detailed
// bucket — resolve to whichever is first in the array; not hard-prevented.
export function resolveAutoCategory(
  transaction: CategorizableTransaction,
  categories: AutoCategorizeTarget[],
  incomeSources: AutoCategorizeTarget[]
): AutoCategoryMatch | null {
  if (transaction.transactionType === 'transfer') return null

  const kind = transaction.transactionType === 'spending' ? 'category' : 'source'
  const targets = transaction.transactionType === 'spending' ? categories : incomeSources

  const detailedMatch = targets.find((t) =>
    t.autoCategorizeBuckets?.includes(transaction.plaidCategory)
  )
  if (detailedMatch) return { kind, id: detailedMatch.id }

  const primary = transaction.plaidCategoryPrimary
  if (primary) {
    const primaryMatch = targets.find((t) => t.autoCategorizeBuckets?.includes(primary))
    if (primaryMatch) return { kind, id: primaryMatch.id }
  }

  return null
}
