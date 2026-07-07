import type { LucideIcon } from 'lucide-react'
import type { ChartColorToken } from '@/types/budget'

// A category a Paycheck's income is attributed to (a W-2 job, 1099
// freelance work, a specific gig platform, etc.) — same icon/color/isCustom
// shape as BudgetCategoryBase, but income sources are a pure categorization
// label, not something with a resetDay/target to track spend-against.
export interface IncomeSource {
  id: string
  name: string
  icon: LucideIcon
  color: ChartColorToken
  isCustom?: boolean
}
