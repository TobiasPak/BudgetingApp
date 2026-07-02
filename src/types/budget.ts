import type { LucideIcon } from 'lucide-react'

export type ChartColorToken =
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5'

export interface BudgetCategory {
  id: string
  name: string
  // Component reference, not a string — safe while this only lives in
  // in-memory Zustand state. Switch to a string + icon-lookup map before
  // adding persistence/serialization (e.g. Firestore sync).
  icon: LucideIcon
  color: ChartColorToken
  monthlyBudgeted: number
  monthlySpent: number
  isCustom?: boolean
}
