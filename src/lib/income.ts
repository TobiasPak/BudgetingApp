import type { Paycheck } from '@/types/paycheck'
import type { BudgetCategory } from '@/types/budget'

// `new Date("YYYY-MM-DD")` parses the string as UTC midnight, which can
// display as the previous day in negative UTC-offset timezones. Comparing
// the string's year/month directly sidesteps that entirely.
function isInMonth(dateStr: string, reference: Date): boolean {
  const [year, month] = dateStr.split('-').map(Number)
  return year === reference.getFullYear() && month === reference.getMonth() + 1
}

export function getCurrentMonthPaychecks(
  paychecks: Paycheck[],
  reference: Date = new Date()
): Paycheck[] {
  return paychecks.filter((paycheck) => isInMonth(paycheck.date, reference))
}

export function getMonthlyIncome(
  paychecks: Paycheck[],
  reference: Date = new Date()
): number {
  return getCurrentMonthPaychecks(paychecks, reference).reduce(
    (sum, p) => sum + p.amount,
    0
  )
}

export function getYearlyProjectedIncome(monthlyIncome: number): number {
  return monthlyIncome * 12
}

// This source's paychecks within the month containing `reference`, most
// recent first — same derived-not-stored pattern as getCategoryPurchases.
export function getSourcePaychecks(
  paychecks: Paycheck[],
  sourceId: string,
  reference: Date = new Date()
): Paycheck[] {
  return getCurrentMonthPaychecks(paychecks, reference)
    .filter((p) => p.sourceId === sourceId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getSourceMonthlyIncome(
  paychecks: Paycheck[],
  sourceId: string,
  reference: Date = new Date()
): number {
  return getSourcePaychecks(paychecks, sourceId, reference).reduce(
    (sum, p) => sum + p.amount,
    0
  )
}

// Averaged over ALL paychecks ever logged, not just this month's — using
// only this month's paychecks would give 0 early in the month (before any
// paycheck has landed yet), which would zero out any "per paycheck"
// percentage budget's projected target right when it's most useful.
export function getAveragePaycheckAmount(paychecks: Paycheck[]): number {
  if (paychecks.length === 0) return 0
  return paychecks.reduce((sum, p) => sum + p.amount, 0) / paychecks.length
}

interface MonthlyTargetContext {
  monthlyIncome: number
  averagePaycheckAmount: number
  paychecksPerMonth: number
}

export function getMonthlyTarget(
  category: BudgetCategory,
  context: MonthlyTargetContext
): number {
  if (category.type === 'fixed') {
    return category.monthlyAmount
  }
  if (category.basis === 'monthlyIncome') {
    return (category.percent / 100) * context.monthlyIncome
  }
  return (
    (category.percent / 100) *
    context.averagePaycheckAmount *
    context.paychecksPerMonth
  )
}
