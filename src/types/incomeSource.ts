import type { LucideIcon } from 'lucide-react'
import type { ChartColorToken } from '@/types/budget'

// W-2 wages already have employer payroll withholding and owe no
// self-employment tax. 'contracted' (a 1099-NEC/1099-MISC contractor) and
// 'selfEmployed' (freelance/gig/other 1099 work) are both self-employment
// income under federal and CA law — no taxable distinction between them,
// both owe SE tax (Schedule C) and are QBI-eligible. They're kept as
// separate values purely for clearer per-source labeling on the Income
// page; getAnnualizedIncomeByType (src/lib/income.ts) is where they get
// combined back into one "self-employment" bucket for the actual tax
// calculation in src/lib/tax/.
export type IncomeType = 'w2' | 'contracted' | 'selfEmployed'

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
  incomeType: IncomeType
}
