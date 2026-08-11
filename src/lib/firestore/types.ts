import type { Timestamp } from 'firebase/firestore'
import type { ChartColorToken } from '@/types/budget'
import type { IncomeType } from '@/types/incomeSource'
import type { PlaidTransactionType } from '@/types/plaidTransaction'

// Firestore document shapes — the on-disk/on-wire representation of each
// entity. Distinct from the in-memory app types (BudgetCategory, Paycheck,
// etc.) in two respects: `icon: LucideIcon` becomes `iconName: string`
// here (a component reference isn't serializable), and `createdAt`/
// `updatedAt` are Firestore `Timestamp`s here vs. ISO strings in memory.
// The Firestore sync layer (sync.ts) converts between both shapes.
//
// `createdAt`/`updatedAt` are deliberately optional and absent from what
// callers (AddBudgetDialog, AddPaycheckDialog, etc.) need to supply —
// writes.ts injects them via serverTimestamp() when actually writing, so
// no caller ever constructs one directly.

interface FirestoreCategoryDocBase {
  name: string
  iconName: string
  color: ChartColorToken
  isCustom?: boolean
  resetDay: number
  // Plaid bucket values that auto-sort matching transactions here — see
  // BudgetCategoryBase.autoCategorizeBuckets (src/types/budget.ts) for the
  // full explanation.
  autoCategorizeBuckets?: string[]
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface FirestoreFixedCategoryDoc extends FirestoreCategoryDocBase {
  type: 'fixed'
  monthlyAmount: number
}

export interface FirestorePercentageCategoryDoc
  extends FirestoreCategoryDocBase {
  type: 'percentage'
  percent: number
  basis: 'paycheck' | 'monthlyIncome'
}

export type FirestoreCategoryDoc =
  | FirestoreFixedCategoryDoc
  | FirestorePercentageCategoryDoc

export interface FirestoreIncomeSourceDoc {
  name: string
  iconName: string
  color: ChartColorToken
  isCustom?: boolean
  incomeType: IncomeType
  autoCategorizeBuckets?: string[]
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface FirestorePaycheckDoc {
  amount: number
  date: string
  sourceId: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface FirestorePurchaseDoc {
  amount: number
  categoryId: string
  date: string
  description: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

// The users/{uid} root doc — scalars only, not a collection.
export interface FirestoreUserDoc {
  bankBalance: number
  paychecksPerMonth: number
  // Set by plaid-server (never the client) once a Plaid Link connection
  // succeeds — see plaid-server/src/routes/exchangeToken.ts. Optional
  // since every pre-Plaid user doc predates this field.
  hasLinkedBank?: boolean
}

// A period's precomputed totals — one doc per calendar month
// (users/{uid}/monthlySnapshots/{YYYY-MM}) and one per calendar year
// (users/{uid}/yearlySnapshots/{YYYY}). Written by src/lib/firestore/
// recomputeSnapshot.ts (client writes) and plaid-server's own copy of the
// same logic (Plaid-driven writes) — never computed in a component. See
// recomputeSnapshot.ts for why this is a full requery-and-overwrite rather
// than an incremental counter.
export interface PeriodSnapshotDoc {
  totalSpent: number
  totalIncome: number
  // Last real Plaid balance stamped during this period (plaid-server's
  // syncBalance.ts, on every sync) — absent if no sync ever landed while
  // this period was open (predates this feature, or Plaid was never synced
  // during it). Never client-editable.
  bankBalance?: number
  bankBalanceAsOf?: string
  updatedAt?: Timestamp
}

export interface FirestorePlaidTransactionDoc {
  accountName: string
  amount: number
  date: string
  authorizedDate?: string
  merchantName: string
  logoUrl?: string
  plaidCategory: string
  plaidCategoryPrimary?: string
  transactionType: PlaidTransactionType
  pending: boolean
  // The complete Plaid transaction object, written by plaid-server. Loosely
  // typed here (rather than hand-mirroring Plaid's full Transaction
  // interface) since the `plaid` npm package isn't installed in this
  // project and nothing in src/ reads a specific sub-field yet — see
  // PlaidTransaction.raw in src/types/plaidTransaction.ts for why it's
  // kept at all.
  raw?: Record<string, unknown>
  categoryId?: string
  purchaseId?: string
  sourceId?: string
  paycheckId?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}
