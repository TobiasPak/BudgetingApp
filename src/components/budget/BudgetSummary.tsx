import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { useBudgetStore } from '@/stores/useBudgetStore'
import {
  getAveragePaycheckAmount,
  getMonthlyIncome,
  getMonthlyTarget,
} from '@/lib/income'
import { getTotalSpent } from '@/lib/spending'
import {
  CategoryBreakdownBar,
  type BudgetMetric,
} from '@/components/budget/CategoryBreakdownBar'

interface BudgetSummaryProps {
  referenceDate: Date
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

export function BudgetSummary({ referenceDate }: BudgetSummaryProps) {
  const categories = useBudgetStore((state) => state.categories)
  const paychecks = useBudgetStore((state) => state.paychecks)
  const purchases = useBudgetStore((state) => state.purchases)
  const paychecksPerMonth = useBudgetStore((state) => state.paychecksPerMonth)

  const [selectedMetric, setSelectedMetric] = useState<BudgetMetric>('income')

  const monthlyIncome = getMonthlyIncome(paychecks, referenceDate)
  const averagePaycheckAmount = getAveragePaycheckAmount(paychecks)
  const targetContext = { monthlyIncome, averagePaycheckAmount, paychecksPerMonth }

  const monthlyBudgeted = categories.reduce(
    (sum, c) => sum + getMonthlyTarget(c, targetContext),
    0
  )
  const monthlySpent = getTotalSpent(categories, purchases, referenceDate)
  const yearlyBudgeted = monthlyBudgeted * 12
  const yearlySpent = monthlySpent * 12
  const spentPercentOfIncome =
    monthlyIncome > 0 ? (monthlySpent / monthlyIncome) * 100 : 0

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
              Monthly Spent / Income
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between gap-2">
            <p
              className={cn(
                'text-2xl font-semibold',
                monthlySpent > monthlyIncome && 'text-destructive'
              )}
            >
              ${formatCurrency(monthlySpent)}{' '}
              <span className="text-base font-normal text-muted-foreground">
                / ${monthlyIncome.toLocaleString()}
              </span>
            </p>
            <span
              className={cn(
                'text-sm font-medium text-muted-foreground',
                monthlySpent > monthlyIncome && 'text-destructive'
              )}
            >
              {monthlyIncome > 0 ? `${spentPercentOfIncome.toFixed(0)}%` : '—'}
            </span>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setSelectedMetric('monthlyBudgeted')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setSelectedMetric('monthlyBudgeted')
            }
          }}
          className={selectableCardClass(selectedMetric === 'monthlyBudgeted')}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Spent / Total Budgeted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                'text-2xl font-semibold',
                monthlySpent > monthlyBudgeted && 'text-destructive'
              )}
            >
              ${formatCurrency(monthlySpent)}{' '}
              <span className="text-base font-normal text-muted-foreground">
                / ${monthlyBudgeted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setSelectedMetric('yearlyBudgeted')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setSelectedMetric('yearlyBudgeted')
            }
          }}
          className={selectableCardClass(selectedMetric === 'yearlyBudgeted')}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Yearly Spent / Total Budgeted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                'text-2xl font-semibold',
                yearlySpent > yearlyBudgeted && 'text-destructive'
              )}
            >
              ${formatCurrency(yearlySpent)}{' '}
              <span className="text-base font-normal text-muted-foreground">
                / ${yearlyBudgeted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <CategoryBreakdownBar
        categories={categories}
        purchases={purchases}
        referenceDate={referenceDate}
        metric={selectedMetric}
        monthlyIncome={monthlyIncome}
        monthlyBudgeted={monthlyBudgeted}
        yearlyBudgeted={yearlyBudgeted}
        monthlySpent={monthlySpent}
        yearlySpent={yearlySpent}
      />
    </div>
  )
}
