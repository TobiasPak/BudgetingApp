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
}

export interface FirestorePlaidTransactionDoc {
  accountName: string
  amount: number
  date: string
  merchantName: string
  plaidCategory: string
  transactionType: PlaidTransactionType
  pending: boolean
  categoryId?: string
  purchaseId?: string
  sourceId?: string
  paycheckId?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}
