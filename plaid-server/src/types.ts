import type { Transaction } from 'plaid'

// Mirrors src/lib/firestore/types.ts's FirestorePlaidTransactionDoc (the
// frontend project). Duplicated rather than imported — this is a separate
// Node package with its own tsconfig/runtime, same reasoning functions/
// already keeps its own type copies instead of reaching into src/. Keep
// this shape in sync with the frontend's by hand if either changes.
export type PlaidTransactionType = 'spending' | 'income' | 'transfer'

export interface FirestorePlaidTransactionDoc {
  accountName: string
  amount: number
  date: string
  // More accurate than `date` for "when did this actually happen" per
  // Plaid's own recommendation, but display-only — `date` still drives
  // date-range filtering everywhere, so this never changes which
  // month/year a transaction counts toward.
  authorizedDate?: string
  merchantName: string
  logoUrl?: string
  plaidCategory: string
  plaidCategoryPrimary?: string
  transactionType: PlaidTransactionType
  pending: boolean
  // The complete Plaid transaction object, stored verbatim. Sync is
  // cursor-based (see syncTransactions.ts) — Plaid only re-sends a
  // transaction if it's later added or modified, so a field not captured
  // on first sync is unrecoverable short of unlinking and relinking.
  // Kept as a permanent safety net (e.g. location, payment_meta,
  // counterparties, merchant_entity_id, payment_channel) rather than
  // hand-picking more top-level fields one at a time; nothing reads this
  // yet.
  raw?: Transaction
  categoryId?: string
  purchaseId?: string
  sourceId?: string
  paycheckId?: string
}

// Mirrors src/lib/firestore/types.ts's PeriodSnapshotDoc. Duplicated for the
// same reason as FirestorePlaidTransactionDoc above — this is a separate
// runtime/tsconfig. Written here by lib/recomputeSnapshot.ts and
// routes/syncBalance.ts's balance-stamping.
export interface PeriodSnapshotDoc {
  totalSpent: number
  totalIncome: number
  bankBalance?: number
  bankBalanceAsOf?: string
}

// One linked account under a Plaid Item — name/mask only, enough to
// distinguish accounts of the same institution in the UI (e.g. "Plaid
// Checking ...0000" vs "Plaid Credit Card ...1111"). Not the full Plaid
// AccountBase shape — balances live in syncBalance.ts's own flow, and
// nothing here needs type/subtype yet.
export interface PlaidAccountInfo {
  name: string
  mask: string | null
}

// A linked Plaid item's server-only credentials + sync cursor. Lives at
// users/{uid}/plaidItems/{itemId} — deliberately NOT in the frontend's
// type files, since the client must never read this collection (see
// firestore.rules: plaidItems denies all client access). accessToken
// grants ongoing read access to the linked bank account; treat it with
// the same care as the Plaid client secret itself.
export interface PlaidItemDoc {
  itemId: string
  accessToken: string
  cursor?: string
  institutionName?: string
  // Keyed by Plaid's account_id — fetched once via accountsGet (at link
  // time in exchangeToken.ts, or self-healed on next sync in
  // syncTransactions.ts for items linked before this field existed).
  // Optional since older items may not have synced yet.
  accounts?: Record<string, PlaidAccountInfo>
}

// Mirrors only the slice of src/lib/firestore/types.ts's FirestoreUserDoc
// that plaid-server itself ever writes — not the whole doc, since
// bankBalance/paychecksPerMonth belong entirely to the frontend's own
// write path (writeUserFields) and plaid-server never touches them.
export interface UserDocPlaidFields {
  hasLinkedBank: boolean
}
