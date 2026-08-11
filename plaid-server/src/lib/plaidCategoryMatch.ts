// Mirrors src/lib/plaidCategoryMatch.ts exactly — same reasoning as
// recomputeSnapshot.ts for why this is a separate copy rather than a shared
// import (separate runtime/tsconfig).

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
