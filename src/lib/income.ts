import { getTotalSpent } from './spending'
import { annualize, isDateInRange, type DateFilterMode, type DateRange } from './period'
import { isPlaidTransactionCategorized } from '@/types/plaidTransaction'
import type { Paycheck } from '@/types/paycheck'
import type { BudgetCategory } from '@/types/budget'
import type { Purchase } from '@/types/purchase'
import type { PlaidTransaction } from '@/types/plaidTransaction'
import type { IncomeSource } from '@/types/incomeSource'

export function getPaychecksInRange(
  paychecks: Paycheck[],
  range: DateRange
): Paycheck[] {
  return paychecks.filter((paycheck) => isDateInRange(paycheck.date, range))
}

// Total income within the selected range — real money that actually landed
// in the account, whether or not it's been sorted into an income source
// yet. Sums every Paycheck (manually entered or created via categorizing a
// Plaid transaction) plus every synced Plaid transaction that's
// income-type but not yet categorized — same "count every real
// transaction regardless of categorization" design as getTotalSpent in
// src/lib/spending.ts, and the same double-count guard: a categorized
// transaction already has a corresponding Paycheck counted in the first
// half. Per-source figures (getSourceIncomeInRange) intentionally stay
// paycheck-only below, since an uncategorized transaction has no source to
// attribute it to.
export function getIncomeInRange(
  paychecks: Paycheck[],
  plaidTransactions: PlaidTransaction[],
  range: DateRange
): number {
  const paycheckTotal = getPaychecksInRange(paychecks, range).reduce(
    (sum, p) => sum + p.amount,
    0
  )

  const uncategorizedIncomeTotal = plaidTransactions
    .filter(
      (t) =>
        t.transactionType === 'income' &&
        !isPlaidTransactionCategorized(t) &&
        isDateInRange(t.date, range)
    )
    .reduce((sum, t) => sum + t.amount, 0)

  return paycheckTotal + uncategorizedIncomeTotal
}

// Actual cash leftover from the selected range's earnings after spending —
// distinct from a category's "remaining budget" (budgeted minus spent),
// which is a different concept scoped to the Budget domain, not income. No
// annualizing here — both sides are already totals for the same window, so
// there's nothing to project.
export function getLeftoverCash(
  paychecks: Paycheck[],
  purchases: Purchase[],
  plaidTransactions: PlaidTransaction[],
  range: DateRange
): number {
  return (
    getIncomeInRange(paychecks, plaidTransactions, range) -
    getTotalSpent(purchases, plaidTransactions, range)
  )
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

// The implied MONTHLY income rate for the selected range — what
// getMonthlyTarget's percentage-of-income categories resolve against
// regardless of whether the filter is set to a month or a year. Derived by
// annualizing the range's actual income the same way
// getAnnualizedIncomeByType does, then dividing back down to a monthly
// rate: for 'month' mode this round-trips to exactly the range's own
// income (unchanged prior behavior — (income × 12) ÷ 12 = income); for
// 'year' mode it's that year's total income ÷ 12 (an average monthly rate).
export function getMonthlyIncomeEquivalent(
  paychecks: Paycheck[],
  plaidTransactions: PlaidTransaction[],
  mode: DateFilterMode,
  range: DateRange
): number {
  const incomeInRange = getIncomeInRange(paychecks, plaidTransactions, range)
  return annualize(incomeInRange, mode) / 12
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
