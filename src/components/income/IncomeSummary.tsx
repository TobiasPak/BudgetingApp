import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { usePeriodSnapshotStore } from '@/stores/usePeriodSnapshotStore'
import { annualize, type DateFilterMode, type DateRange } from '@/lib/period'
import {
  IncomeSourcesPieChart,
  type IncomeMetric,
} from '@/components/income/IncomeSourcesPieChart'

interface IncomeSummaryProps {
  mode: DateFilterMode
  range: DateRange
}

// Same selectable-card-drives-chart-below pattern as BudgetSummary/
// SpendingSummary — clicking a card highlights it and switches the pie
// chart/legend to that metric's percentages.
function selectableCardClass(isSelected: boolean): string {
  return cn(
    'cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/50',
    isSelected && 'ring-2 ring-primary'
  )
}

export function IncomeSummary({ mode, range }: IncomeSummaryProps) {
  const incomeSources = useBudgetStore((state) => state.incomeSources)
  const paychecks = useBudgetStore((state) => state.paychecks)
  const windowIncome = usePeriodSnapshotStore((state) => state.totalIncome)

  const [selectedMetric, setSelectedMetric] = useState<IncomeMetric>('window')
  // Complementary granularity, same pattern as BudgetSummary/IncomeOverview:
  // an annual projection while viewing a month, a monthly average while
  // viewing a whole year.
  const secondaryIncome =
    mode === 'month' ? annualize(windowIncome, mode) : annualize(windowIncome, mode) / 12

  const windowLabel = mode === 'month' ? 'Earned This Month' : 'Earned This Year'
  const secondaryLabel = mode === 'month' ? 'Projected This Year' : 'Monthly Average'

  const metricLabel: Record<IncomeMetric, string> = {
    window: mode === 'month' ? '% of monthly income' : '% of yearly income',
    secondary:
      mode === 'month'
        ? '% of yearly projected income'
        : '% of monthly average income',
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setSelectedMetric('window')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setSelectedMetric('window')
            }
          }}
          className={selectableCardClass(selectedMetric === 'window')}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {windowLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">${formatCurrency(windowIncome)}</p>
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
              {secondaryLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">${formatCurrency(secondaryIncome)}</p>
          </CardContent>
        </Card>
      </div>

      <IncomeSourcesPieChart
        sources={incomeSources}
        paychecks={paychecks}
        range={range}
        mode={mode}
        metric={selectedMetric}
        metricLabel={metricLabel[selectedMetric]}
        windowIncome={windowIncome}
        secondaryIncome={secondaryIncome}
      />
    </div>
  )
}
