import { annualize, isDateInRange, type DateFilterMode, type DateRange } from './period'
import type { Paycheck } from '@/types/paycheck'
import type { BudgetCategory } from '@/types/budget'
import type { IncomeSource } from '@/types/incomeSource'

export function getPaychecksInRange(
  paychecks: Paycheck[],
  range: DateRange
): Paycheck[] {
  return paychecks.filter((paycheck) => isDateInRange(paycheck.date, range))
}

// This source's paychecks within the selected range, most recent first —
// same derived-not-stored pattern as getCategoryPurchases.
export function getSourcePaychecks(
  paychecks: Paycheck[],
  sourceId: string,
  range: DateRange
): Paycheck[] {
  return getPaychecksInRange(paychecks, range)
    .filter((p) => p.sourceId === sourceId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getSourceIncomeInRange(
  paychecks: Paycheck[],
  sourceId: string,
  range: DateRange
): number {
  return getSourcePaychecks(paychecks, sourceId, range).reduce(
    (sum, p) => sum + p.amount,
    0
  )
}

// Averaged over ALL paychecks ever logged, not just the selected range's —
// using only the range's paychecks would give 0 for a range with nothing
// logged yet, which would zero out any "per paycheck" percentage budget's
// projected target right when it's most useful.
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

// Income within the selected range, split by each paycheck's source's
// incomeType and projected to a full year via `annualize` (×12 for month
// mode, as-is for year mode) — the single integration point between the
// income model and src/lib/tax/, which only ever needs these two
// annualized numbers, never raw paychecks. Both 'contracted' and
// 'selfEmployed' sources land in the same
// `selfEmployed` bucket here — federal/CA tax law doesn't distinguish a
// 1099 contractor from other self-employment income (same SE tax, same QBI
// eligibility), so the IncomeType split beyond 'w2' exists purely for
// clearer per-source labeling, not a taxable difference (see
// src/types/incomeSource.ts). A paycheck whose source can't be found at all
// (deleted source, or a pre-incomeType source not yet resolved) falls into
// the same bucket via this `else`, matching the same conservative fallback
// used when hydrating a Firestore doc missing the field
// (src/lib/firestore/sync.ts) — better to overcount potential SE tax than
// silently drop it from a liability estimate.
export function getAnnualizedIncomeByType(
  paychecks: Paycheck[],
  incomeSources: IncomeSource[],
  mode: DateFilterMode,
  range: DateRange
): AnnualizedIncomeByType {
  const incomeTypeBySourceId = new Map(
    incomeSources.map((source) => [source.id, source.incomeType])
  )

  const inRange = getPaychecksInRange(paychecks, range).reduce(
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
    w2: annualize(inRange.w2, mode),
    selfEmployed: annualize(inRange.selfEmployed, mode),
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
