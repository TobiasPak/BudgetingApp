import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { annualize, type DateFilterMode, type DateRange } from '@/lib/period'
import { getTargetForMode } from '@/lib/budget'
import {
  getAveragePaycheckAmount,
  getIncomeInRange,
  getMonthlyIncomeEquivalent,
  getMonthlyTarget,
} from '@/lib/income'
import { getTotalSpent } from '@/lib/spending'
import {
  CategoryBreakdownBar,
  type BudgetMetric,
} from '@/components/budget/CategoryBreakdownBar'

interface BudgetSummaryProps {
  mode: DateFilterMode
  range: DateRange
}

// Selectable summary cards double as a filter for the breakdown bar below —
// clicking one highlights it and switches the bar/legend to that metric's
// percentages, so the shared `cursor-pointer` + `ring` treatment needs to
// stay consistent across all three.
function selectableCardClass(isSelected: boolean): string {
  return cn(
    'cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/50',
    isSelected && 'ring-2 ring-primary'
  )
}

export function BudgetSummary({ mode, range }: BudgetSummaryProps) {
  const categories = useBudgetStore((state) => state.categories)
  const paychecks = useBudgetStore((state) => state.paychecks)
  const purchases = useBudgetStore((state) => state.purchases)
  const plaidTransactions = useBudgetStore((state) => state.plaidTransactions)
  const paychecksPerMonth = useBudgetStore((state) => state.paychecksPerMonth)

  const [selectedMetric, setSelectedMetric] = useState<BudgetMetric>('income')

  const monthlyIncomeEquivalent = getMonthlyIncomeEquivalent(
    paychecks,
    plaidTransactions,
    mode,
    range
  )
  const averagePaycheckAmount = getAveragePaycheckAmount(paychecks)
  const targetContext = {
    monthlyIncome: monthlyIncomeEquivalent,
    averagePaycheckAmount,
    paychecksPerMonth,
  }

  // "Window" = whatever the shared filter is actually showing (a month or a
  // year, its own real totals — not a projection). "Secondary" is the
  // complementary granularity: an annual projection while viewing a month
  // (unchanged behavior from before this filter had a year mode at all), or
  // a monthly average while viewing a whole year — avoids a 3rd card that
  // would otherwise just repeat the 2nd card's number when mode is 'year'.
  const windowIncome = getIncomeInRange(paychecks, plaidTransactions, range)
  const windowBudgeted = categories.reduce(
    (sum, c) => sum + getTargetForMode(getMonthlyTarget(c, targetContext), mode),
    0
  )
  const windowSpent = getTotalSpent(purchases, plaidTransactions, range)

  const annualBudgeted = annualize(windowBudgeted, mode)
  const annualSpent = annualize(windowSpent, mode)
  const secondaryBudgeted = mode === 'month' ? annualBudgeted : annualBudgeted / 12
  const secondarySpent = mode === 'month' ? annualSpent : annualSpent / 12

  const windowLabel = mode === 'month' ? 'Monthly' : 'Yearly'
  const secondaryLabel = mode === 'month' ? 'Yearly' : 'Monthly Avg'

  const metricLabel: Record<BudgetMetric, string> = {
    income: mode === 'month' ? '% of monthly income' : '% of yearly income',
    primary: mode === 'month' ? '% of total monthly budget' : '% of total yearly budget',
    secondary:
      mode === 'month'
        ? '% of total yearly budget'
        : '% of total monthly-average budget',
  }

  const spentPercentOfIncome = windowIncome > 0 ? (windowSpent / windowIncome) * 100 : 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setSelectedMetric('income')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setSelectedMetric('income')
            }
          }}
          className={selectableCardClass(selectedMetric === 'income')}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {windowLabel} Spent / Income
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between gap-2">
            <p
              className={cn(
                'text-2xl font-semibold',
                windowSpent > windowIncome && 'text-destructive'
              )}
            >
              ${formatCurrency(windowSpent)}{' '}
              <span className="text-base font-normal text-muted-foreground">
                / ${windowIncome.toLocaleString()}
              </span>
            </p>
            <span
              className={cn(
                'text-sm font-medium text-muted-foreground',
                windowSpent > windowIncome && 'text-destructive'
              )}
            >
              {windowIncome > 0 ? `${spentPercentOfIncome.toFixed(0)}%` : '—'}
            </span>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setSelectedMetric('primary')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setSelectedMetric('primary')
            }
          }}
          className={selectableCardClass(selectedMetric === 'primary')}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {windowLabel} Spent / Total Budgeted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                'text-2xl font-semibold',
                windowSpent > windowBudgeted && 'text-destructive'
              )}
            >
              ${formatCurrency(windowSpent)}{' '}
              <span className="text-base font-normal text-muted-foreground">
                / ${windowBudgeted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setSelectedMetric('secondary')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setSelectedMetric('secondary')
            }
          }}
          className={selectableCardClass(selectedMetric === 'secondary')}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {secondaryLabel} Spent / Total Budgeted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                'text-2xl font-semibold',
                secondarySpent > secondaryBudgeted && 'text-destructive'
              )}
            >
              ${formatCurrency(secondarySpent)}{' '}
              <span className="text-base font-normal text-muted-foreground">
                /{' '}
                ${secondaryBudgeted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <CategoryBreakdownBar
        categories={categories}
        purchases={purchases}
        range={range}
        mode={mode}
        metric={selectedMetric}
        metricLabel={metricLabel[selectedMetric]}
        windowIncome={windowIncome}
        windowBudgeted={windowBudgeted}
        secondaryBudgeted={secondaryBudgeted}
        windowSpent={windowSpent}
        secondarySpent={secondarySpent}
      />
    </div>
  )
}
