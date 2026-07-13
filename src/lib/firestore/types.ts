import type { ChartColorToken } from '@/types/budget'
import type { IncomeType } from '@/types/incomeSource'

// Firestore document shapes — the on-disk/on-wire representation of each
// entity. Distinct from the in-memory app types (BudgetCategory, Paycheck,
// etc.) mainly in one respect: `icon: LucideIcon` becomes `iconName:
// string` here, since a component reference isn't serializable. The
// Firestore sync layer (sync.ts) is what converts between the two shapes.

interface FirestoreCategoryDocBase {
  name: string
  iconName: string
  color: ChartColorToken
  isCustom?: boolean
  resetDay: number
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
}

export interface FirestorePaycheckDoc {
  amount: number
  date: string
  sourceId: string
}

export interface FirestorePurchaseDoc {
  amount: number
  categoryId: string
  date: string
  description: string
}

// The users/{uid} root doc — scalars only, not a collection.
export interface FirestoreUserDoc {
  bankBalance: number
  paychecksPerMonth: number
}
