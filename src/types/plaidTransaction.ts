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
  // When Plaid says the transaction was actually authorized, vs. `date`
  // (the posted/settled date) — per Plaid's own docs, generally the more
  // accurate "when did I actually spend this" for a posted transaction.
  // Display-only: `date` still drives which month/year window a
  // transaction counts toward everywhere in this app (recomputeSnapshot.ts,
  // isDateInRange, etc.) — showing authorizedDate never changes a total,
  // only what's displayed alongside it. Optional since Plaid doesn't always
  // report it and older synced transactions predate this field.
  authorizedDate?: string
  // The raw merchant/description string as Plaid returns it (e.g.
  // "TARGET T-1234", not cleaned up into a human-friendly name).
  merchantName: string
  // A 100x100 PNG merchant logo, when Plaid has one. Absent for most
  // sandbox data and many real merchants — render nothing, never a
  // broken-image icon, when unset.
  logoUrl?: string
  // Plaid's own category guess (e.g. "FOOD_AND_DRINK_COFFEE", Plaid's
  // "detailed" taxonomy value) — informational only, shown alongside the
  // transaction for context. Never authoritative: this app's own
  // categoryId/sourceId is what actually counts toward budgets/income once
  // assigned.
  plaidCategory: string
  // Plaid's coarser "primary" category (e.g. "FOOD_AND_DRINK" — one of
  // ~16 values, vs. plaidCategory's much larger "detailed" taxonomy).
  // Stored separately because a small, stable set of buckets is what a
  // future auto-sort-into-budget-categories feature would actually want
  // to match against, not the fine-grained detailed string. Optional —
  // absent on transactions synced before this field existed, and Plaid
  // itself can return no category at all for some transactions.
  plaidCategoryPrimary?: string
  transactionType: PlaidTransactionType
  // Plaid reports newly-synced transactions as pending before they settle;
  // a pending transaction's amount/category can still change on Plaid's
  // side before the final, settled version arrives.
  pending: boolean
  // The complete Plaid transaction object, stored verbatim by plaid-server
  // (see FirestorePlaidTransactionDoc.raw). Kept as a permanent safety net
  // — sync is cursor-based, so Plaid only re-sends a transaction if it's
  // later added or modified; an already-settled transaction is never
  // re-fetched, meaning a field not captured here on first sync is gone
  // for good short of unlinking and relinking. Nothing reads this yet —
  // it's what a future feature (e.g. remembering how a merchant was
  // categorized last time, via merchant_entity_id) would draw from without
  // needing another backfill.
  raw?: Record<string, unknown>
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
