// A raw bank transaction synced from Plaid — distinct from Purchase/
// Paycheck, which are the app's own categorized ledger entries. A
// PlaidTransaction starts out uncategorized (categoryId/sourceId both
// unset) and stays that way until either the AI categorization agent or a
// manual "Categorize" action assigns it — at that point a real Purchase
// (spending) or Paycheck (income) is created from it (see
// categorizePlaidTransactionAsSpending/AsIncome in
// src/lib/firestore/writes.ts), and this record is linked to that new doc
// via purchaseId/paycheckId so it's never categorized twice. 'transfer'
// transactions (money moved between the user's own linked accounts) are
// never categorized at all — they're neither spending nor income.
export type PlaidTransactionType = 'spending' | 'income' | 'transfer'

export interface PlaidTransaction {
  id: string
  // Which linked bank account this came from, e.g. "Chase Checking ...4821".
  // Informational display only — not a foreign key to anything in this app.
  accountName: string
  amount: number
  // ISO "YYYY-MM-DD" — the transaction date Plaid reports, not when it was
  // synced into this app (see createdAt for that).
  date: string
  // The raw merchant/description string as Plaid returns it (e.g.
  // "TARGET T-1234", not cleaned up into a human-friendly name).
  merchantName: string
  // Plaid's own category guess (e.g. "Food and Drink > Coffee Shops") —
  // informational only, shown alongside the transaction for context. Never
  // authoritative: this app's own categoryId/sourceId is what actually
  // counts toward budgets/income once assigned.
  plaidCategory: string
  transactionType: PlaidTransactionType
  // Plaid reports newly-synced transactions as pending before they settle;
  // a pending transaction's amount/category can still change on Plaid's
  // side before the final, settled version arrives.
  pending: boolean
  // Set together once categorized as spending — a real Purchase doc
  // (purchaseId) is created in the same category (categoryId).
  categoryId?: string
  purchaseId?: string
  // Set together once categorized as income — a real Paycheck doc
  // (paycheckId) is created against the same source (sourceId).
  sourceId?: string
  paycheckId?: string
  // Server-assigned audit timestamps — when this record was actually synced
  // into Firestore, distinct from `date` (the bank's own transaction date).
  createdAt?: string
  updatedAt?: string
}

export function isPlaidTransactionCategorized(transaction: PlaidTransaction): boolean {
  return Boolean(transaction.categoryId || transaction.sourceId)
}
