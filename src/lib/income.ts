import { getTotalSpent } from './spending'
import type { Paycheck } from '@/types/paycheck'
import type { BudgetCategory } from '@/types/budget'
import type { Purchase } from '@/types/purchase'
import type { IncomeSource } from '@/types/incomeSource'

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

// Actual cash leftover from this month's earnings after spending — distinct
// from a category's "remaining budget" (budgeted minus spent), which is a
// different concept scoped to the Budget domain, not income.
export function getLeftoverCash(
  paychecks: Paycheck[],
  categories: BudgetCategory[],
  purchases: Purchase[],
  reference: Date = new Date()
): number {
  return (
    getMonthlyIncome(paychecks, reference) -
    getTotalSpent(categories, purchases, reference)
  )
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

export interface AnnualizedIncomeByType {
  w2: number
  selfEmployed: number
}

// This month's income (same window as getMonthlyIncome), split by each
// paycheck's source's incomeType and projected to a full year the same way
// getYearlyProjectedIncome already does (× 12) — the single integration
// point between the income model and src/lib/tax/, which only ever needs
// these two annualized numbers, never raw paychecks. Both 'contracted' and
// 'selfEmployed' sources land in the same `selfEmployed` bucket here —
// federal/CA tax law doesn't distinguish a 1099 contractor from other
// self-employment income (same SE tax, same QBI eligibility), so the
// IncomeType split beyond 'w2' exists purely for clearer per-source
// labeling, not a taxable difference (see src/types/incomeSource.ts). A
// paycheck whose source can't be found at all (deleted source, or a
// pre-incomeType source not yet resolved) falls into the same bucket via
// this `else`, matching the same conservative fallback used when hydrating
// a Firestore doc missing the field (src/lib/firestore/sync.ts) — better
// to overcount potential SE tax than silently drop it from a liability
// estimate.
export function getAnnualizedIncomeByType(
  paychecks: Paycheck[],
  incomeSources: IncomeSource[],
  reference: Date = new Date()
): AnnualizedIncomeByType {
  const incomeTypeBySourceId = new Map(
    incomeSources.map((source) => [source.id, source.incomeType])
  )

  const monthly = getCurrentMonthPaychecks(paychecks, reference).reduce(
    (totals, paycheck) => {
      if (incomeTypeBySourceId.get(paycheck.sourceId) === 'w2') {
        totals.w2 += paycheck.amount
      } else {
        totals.selfEmployed += paycheck.amount
      }
      return totals
    },
    { w2: 0, selfEmployed: 0 }
  )

  return {
    w2: getYearlyProjectedIncome(monthly.w2),
    selfEmployed: getYearlyProjectedIncome(monthly.selfEmployed),
  }
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
